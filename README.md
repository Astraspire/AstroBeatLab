# Astro Beat Lab

Astro Beat Lab is a Horizon Worlds project that turns the MBC25 music machine into a modular live-performance space. The scripts in this repository coordinate machine ownership, loop playback, player inventory, and the soundwave currency that players spend to unlock new packs. This README orients newcomers to both the codebase and the Horizon Worlds APIs it uses.

## Directory Guide

- `MBCManager.ts` – arbitrates exclusive control of the MBC25 machines and handles AFK relinquish logic.
- `MBC25Inventory.ts` – persists unlocked packs, exposes unlock events, and tracks the active performer.
- `InventorySystemUI.ts` – first-party UI listing unlocked packs and firing activation/relinquish requests.
- `MBCDrop.ts` – spawns the correct machine asset when a pack becomes active.
- `SoundwaveManager.ts` – awards soundwave points, processes purchases, and mirrors machine play state.
- `SoundwaveStoreUI.ts` – storefront UI that spends soundwaves on packs.
- `SoundwaveLeaderboard.ts` – writes soundwave balances to a world leaderboard.
- `PackIdBitmask.ts` / `SoundPackTypes.ts` – utilities describing pack identifiers and their bitmask encoding.
- `MBC25/` – loop playback system shared by all packs (`SongManager.ts`, trigger scripts, and loop-specific events).
- Utility scripts (`CycleLightColor.ts`, `SpinBowl.ts`, `TriggerDetector.ts`, etc.) add ambient motion or helper logic.

## Machine Activation & Inventory Flow

1. `InventorySystemUI.ts` gathers the viewer’s unlocked packs from the persistent key `MBC25Inventory:unlockedSoundPacks` and shows them as pressable rows.
2. When the player selects a pack, the UI calls `requestMBCActivation` with their `playerName` and `packId`.
3. `MBCManager.ts` verifies ownership by reading the bitmask in `MBC25Inventory:unlockedSoundPacks` (`SOUND_PACKS_PPV`) and ensures no other player controls the machine. Successful requests broadcast:
   - `changeActiveMBC` so `MBCDrop.ts` can spawn the matching asset.
   - `activePerformerChanged` so UI layers know who owns the machine.
4. `MBCDrop.ts` responds to both `dropMBC` (unlocks) and `changeActiveMBC` (pack swaps) to despawn the old asset and spawn the requested one.
5. Players earn new packs when `MBC25Inventory.ts` receives `unlockMBC25`. It updates the bitmask, emits `inventoryUpdated`, and optionally drops the new machine if no one is performing.

## Loop Playback Flow (Folder `MBC25/`)

- `LoopButtonTrigger.ts` listens for `loopTriggerEvent`, `offlineColorChangeEvent`, `playingColorChangeEvent`, and `upcomingLoopColorChangedEvent` to keep button tinting in sync with playback.
- `SongManager.ts` maintains per-channel audio gizmo grids, kicks off playback via `gizmo.play()`, and keeps loops locked to tempo using a scheduler. It relies on:
  - `loopTriggerEvent` fired when a player steps off a loop pad.
  - `stopRowEvent` raised by `StopButtonTrigger.ts` to cut a channel with `gizmo.stop({ fade })`.
  - `machinePlayState` to inform the broader world (and the soundwave system) when music is audible.
- `StopButtonTrigger.ts` simply forwards trigger exits through `stopRowEvent`.

## Soundwave Economy Flow

1. `SoundwaveManager.ts` maintains per-player balances under the persistent key `SoundwaveManager:points` (`SOUNDWAVE_PPV`). Every minute while the machine plays (`machinePlayState.isPlaying === true`), it:
   - Awards +1 point to every non-AFK listener.
   - Gives the active performer (`activePerformerChanged`) a bonus equal to the listener count minus one.
2. Purchases flow from `SoundwaveStoreUI.ts` via the `purchasePackWithSoundwaves` event. The manager debits the balance, unlocks the pack by calling `unlockMBC25`, and broadcasts `soundwaveBalanceChanged`.
3. `SoundwaveStoreUI.ts` keeps its listings up to date by listening for `soundwaveBalanceChanged` and `inventoryUpdated`. Its local `STORE_PACKS` array defines pack costs.
4. `SoundwaveLeaderboard.ts` mirrors `SoundwaveManager:points` onto a world leaderboard whenever `soundwaveBalanceChanged` fires or a player joins mid-session.

## Event Reference

### `shared-events-MBC25.ts`

| Event | Payload | Purpose |
| --- | --- | --- |
| `changeActiveMBC` | `{ packId }` | Signals which pack should be visible across the world. |
| `unlockMBC25` | `{ playerName, packId }` | Adds a pack to a player’s persistent inventory. |
| `checkMBCInventory` | `{ playerId }` | Debug helper that prints a player’s inventory and triggers drops. |
| `dropMBC` | `{ packId }` | Instructs `MBCDrop` instances to spawn the matching machine. |
| `inventoryUpdated` | `{ playerName }` | Tells UIs to refresh when ownership changes. |
| `requestMBCActivation` | `{ playerName, packId }` | Player requests to control the machine with a specific pack. |
| `relinquishMBC` | `{ playerName }` | Player gives up the machine so others can take over. |
| `activePerformerChanged` | `{ playerName }` | Broadcasts performer swaps; `null` means unclaimed. |
| `uiOwnerChanged` | `{ playerName }` | Lets the store UI know who it should display data for. |
| `purchasePackWithSoundwaves` | `{ playerName, packId, cost }` | Store UI purchase submission. |
| `soundwaveBalanceChanged` | `{ playerName, balance }` | Sends updated balances to UI and leaderboards. |
| `openSoundwaveStore` | `{ player }` | Requests the store UI become visible for a player. |
| `machinePlayState` | `{ isPlaying }` | Indicates whether the MBC25 is currently audible. |

### `MBC25/shared-events.ts`

| Event | Payload | Purpose |
| --- | --- | --- |
| `stopRowEvent` | `{ channelId }` | Stops all loops on a channel. |
| `loopTriggerEvent` | `{ channelId, loopSectionId }` | Queues or starts a loop on the specified channel. |
| `offlineColorChangeEvent` | `{ channel, loopId }` | Returns a button to its idle tint. |
| `hardOfflineColorChangeEvent` | `{ channel, loopId }` | Forces idle tint during resets. |
| `playingColorChangeEvent` | `{ channel, loopId }` | Highlights a button as actively playing. |
| `upcomingLoopColorChangedEvent` | `{ channel, loopId }` | Marks a button as queued for the next bar. |
| `machinePlayState` | `{ isPlaying }` | Mirrors the pack-level event for loop controllers. |

## Persistent Storage Keys & Utilities

| Key / Utility | Location | Notes |
| --- | --- | --- |
| `MBC25Inventory:unlockedSoundPacks` (`SOUND_PACKS_PPV`) | `MBC25Inventory.ts`, `MBCManager.ts`, `InventorySystemUI.ts` | Bitmask of unlocked packs per player. Converted using `PACK_ID_BITS` in `PackIdBitmask.ts`. |
| `SoundwaveManager:points` (`SOUNDWAVE_PPV`) | `SoundwaveManager.ts`, `SoundwaveStoreUI.ts`, `SoundwaveLeaderboard.ts` | Integer balance of soundwave points per player. |
| `PACK_ID_BITS` / `DEFAULT_PACK_IDS` | `PackIdBitmask.ts` | Map pack identifiers to bit positions and define always-on packs. |
| `STORE_PACKS` | `SoundwaveStoreUI.ts` | Lists purchasable packs with their cost in soundwaves. |

When adding a new pack you must update `PACK_ID_BITS`, `DEFAULT_PACK_IDS` (if it should be free), `MBCDrop.ts` asset mappings, `SoundwaveStoreUI.ts` pricing, and ensure audio gizmos exist in `SongManager.ts`.

## Horizon Worlds API Primer

- `hz.Component` subclasses drive behaviour. Their `propsDefinition` exposes editor-facing configuration.
- `connectLocalBroadcastEvent` listens for world-wide events sent via `sendLocalBroadcastEvent`.
- `connectLocalEvent` targets events scoped to a specific entity, while `connectNetworkEvent` deals with network-replicated events.
- `connectCodeBlockEvent` taps into built-in trigger/AFK callbacks defined by Horizon Worlds.
- The `async` helper (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`) schedules work safely inside the Horizon scripting sandbox.
- Use `.as(Type)` to cast entities to gizmo-specific interfaces such as `AudioGizmo` or `MeshEntity` before accessing their properties.

## Wiring the World

1. **MBC Manager stack**
   - Attach `MBCManager.ts` to a central entity.
   - Attach `MBC25Inventory.ts` and point its events at the same entity.
   - Place `MBCDrop.ts` on each machine spawn point and assign the variant assets.
2. **UI**
   - Set `InventorySystemUI.ts -> managerEntity` to the entity running `MBCManager.ts`.
   - Set `SoundwaveStoreUI.ts -> managerEntity` to the entity running `SoundwaveManager.ts`.
3. **Loop controller**
   - Wire the audio gizmo references (`chanXLoopY`) in `SongManager.ts`.
   - Ensure each loop pad entity runs `LoopButtonTrigger.ts` with matching `channelId` & `loopSectionId`.
   - Hook stop pads to `StopButtonTrigger.ts` with the appropriate `channelId`.
4. **Economy**
   - Attach `SoundwaveManager.ts` and optionally assign a notification manager entity.
   - Add `SoundwaveLeaderboard.ts` if you want the leaderboard UI to stay in sync.

## Extending the Experience

1. **Add a new pack variant**
   - Create the new audio gizmos and machine asset bundle.
   - Add its identifier to `PACK_ID_BITS`, map the asset in `MBCDrop.ts`, and include it in `STORE_PACKS` if purchasable.
2. **Introduce new reward sources**
   - Call `setBalance` or `sendLocalBroadcastEvent(soundwaveBalanceChanged, …)` from your script to award points.
   - Keep `SoundwaveManager` as the single authority so persistent storage stays consistent.
3. **Customize notifications**
   - Implement a notification entity that consumes `NotificationEvent` (see `SoundwaveManager.ts`) for richer UI feedback.

## Debugging Tips

- Every major state change logs to the console (activation requests, loop scheduling, soundwave awards). Use the in-world console to trace behaviour.
- To inspect a player’s inventory manually, trigger `checkMBCInventory` (e.g., via a debug trigger) to print unlocked packs.
- `SoundwaveManager.ts` clears its listener/performance toast sets when playback pauses; if notifications feel stale, ensure `machinePlayState` is firing.

With this overview you should be able to trace how events propagate through the system, extend the machine with new content, and orient yourself even if Horizon Worlds scripting is new territory. Happy building!

