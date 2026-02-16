# Astro Beat Lab

Astro Beat Lab turns the MBC25 music machine into a modular, live performance setup for Horizon Worlds. The scripts in this folder coordinate who can control the stage, which pack is visible, how loops stay in sync, and how the soundwave economy unlocks additional packs. This README captures everything that changed in the latest iteration so the codebase and the in-world build stay in sync.

## Available Packs

The system currently supports four MBC25 sound packs:

- **MBC25-SOMETA** – Default pack, automatically unlocked for all players
- **MBC25-LUCKY** – Purchasable from the Soundwave Store for 25 soundwaves
- **MBC25-PHONK-E-CHEESE** – Purchasable from the Soundwave Store for 50 soundwaves
- **MBC25-FLOWSTATE** – Unlocked by completing the Orbital Drop-stacle Course (or purchasable for 50 soundwaves)

## Repo Layout

- `MBCManager.ts` – arbitrates exclusive control of the MBC25, enforces AFK relinquish, and mirrors notifications to performers.
- `MBC25Inventory.ts` – persists unlocked packs per player, guarantees default packs are present, and emits `inventoryUpdated`.
- `InventorySystemUI.ts` – refreshed inventory HUD with owner locking, refresh button, notification hooks, and direct calls into `MBCManager`.
- `SoundwaveStoreUI.ts` – storefront that opens for a specific player, filters already-owned packs, and dispatches `purchasePackWithSoundwaves`.
- `SoundwaveManager.ts` – awards soundwaves each minute while `machinePlayState` is true, tracks AFK listeners, forwards purchases to the inventory manager, and now drives toast notifications.
- `SoundwaveLeaderboard.ts` – mirrors each player’s persistent balance (or a custom leaderboard key) into a world leaderboard, including late joins.
- `MBCDrop.ts` – spawns the correct machine asset with configurable position/rotation/scale whenever ownership or inventory events change.
- `MBC25/` – generic loop grid (`SongManager.ts`, `LoopButtonTrigger.ts`, `StopButtonTrigger.ts`, etc.) shared by every pack.
- `shared-events-MBC25.ts` / `shared-events.ts` – canonical event definitions for ownership, store, notification, and loop-grid communication.
- `UI_NotificationManager.ts` / `UI_SimpleButtonEvent.ts` – reusable notification rail used by the inventory, manager, and soundwave systems.
- `CompleteDropObbyReward.ts` – awards the FlowState pack when players complete the Orbital Drop-stacle Course, tracks completion state, and sends congratulatory notifications.
- `dropstacleSpawnTrigger.ts` – teleports players back to the respawn point when they enter fail zones during the dropstacle course.
- Utility scripts (`CircularMotion.ts`, `CycleLightColor.ts`, `DoorController.ts`, `ForceFirstPersonView.ts`, `TriggerDetector.ts`, etc.) provide ambience or helper behaviors you can reuse in the build.

## System Guides

### Inventory & Ownership Flow

1. **Unlock tracking (`MBC25Inventory.ts`)**  
   - Stores the player bitmask under `MBC25Inventory:unlockedSoundPacks`.  
   - Ensures default packs (currently `MBC25-SOMETA`) are always present by rewriting the bitmask when needed.  
   - Listens for `unlockMBC25` to persist new packs and rebroadcast `inventoryUpdated`.  
   - Accepts `requestMBCActivation` to drop or swap packs while remembering the active performer.
2. **Player-facing HUD (`InventorySystemUI.ts`)**  
   - Binds the UI to the viewer’s unlocked packs, auto-refreshes on `inventoryUpdated` and `soundwaveBalanceChanged`, and exposes an explicit “Open/Refresh your inventory” button.  
   - Locks the panel to whichever player opened it (`currentViewerName`), greys out spawn buttons when another performer owns the stage, and fires `relinquishMBC` when that performer leaves or the viewer taps “Put away your MBC25”.  
   - Integrates with the notification manager so every spawn/relinquish or invalid action pushes an in-world toast.
3. **Ownership arbitration (`MBCManager.ts`)**  
   - Uses persistent storage plus `PACK_ID_BITS` to reject spawn requests for packs the player doesn’t own.  
   - Announces state changes through `changeActiveMBC`, `activePerformerChanged`, and `machinePlayState`.  
   - Listens for `relinquishMBC` both from the UI and AFK/exit code block events to automatically clear the stage when the performer is gone.  
   - Calls into the notification UI whenever requests fail or succeed so everyone sees who owns the machine.

### Machine Spawning & Playback

- **Asset swapping (`MBCDrop.ts`)** – Hooks into `dropMBC` and `changeActiveMBC`, despawns old assets, and spawns the keyed asset bundle using the configured stage transform. Keeps a list of previously spawned roots so the stage never accumulates duplicates.
- **Loop grid (`MBC25/` folder)** –  
  - `SongManager.ts` wires every gizmo slot, keeps loops on tempo, fires button color events, and is now the canonical source of `machinePlayState`.  
  - `LoopButtonTrigger.ts` and `StopButtonTrigger.ts` translate trigger exits into loop or stop events, while animating button colors between idle, upcoming, and playing states.  
  - `shared-events.ts` contains the event definitions consumed by these scripts to keep communication consistent across packs.

### Soundwave Economy

1. **Point accrual (`SoundwaveManager.ts`)**  
   - Tracks `machinePlayState` to decide when minute ticks should run.  
   - Award loop: +1 to non-AFK listeners, bonus equal to listener count (minus one) to the performer, with listener/perf toasts only firing once per session.  
   - Maintains `SoundwaveManager:points`, broadcasts `soundwaveBalanceChanged`, and emits notification pop-ups like “You’re now earning Soundwaves!”.
2. **Purchases & unlocks**  
   - `SoundwaveStoreUI.ts` listens for `soundwaveBalanceChanged`, `inventoryUpdated`, and `openSoundwaveStore` to filter its `STORE_PACKS` list per player.  
   - Purchase presses send `purchasePackWithSoundwaves` to the manager, which debits the persistent balance then fires `unlockMBC25` back into the inventory manager.  
   - Both inventory and store UIs call `addDefaultPacks` when reading storage so mixes stay in sync regardless of unlock order.
3. **Leaderboard mirroring (`SoundwaveLeaderboard.ts`)**  
   - Pushes every balance change to a world leaderboard (configurable via prop), and syncs values when players join mid-session.

### Notification Layer

- `UI_NotificationManager.ts` consumes `NotificationEvent`, animates the toast rail, and can be triggered locally or via broadcast.
- `InventorySystemUI`, `MBCManager`, and `SoundwaveManager` all send `NotificationEvent` payloads so performers always get feedback (spawn success, store unlock, soundwave accrual, etc.).
- `UI_SimpleButtonEvent.ts` remains available for designers who want to trigger notification tests from the RocketTrouble "UI Simple Button" prefab.

### Orbital Drop-stacle Course

The Orbital Drop-stacle Course is an in-world challenge that rewards players with the exclusive FlowState pack upon completion.

1. **Reward system (`CompleteDropObbyReward.ts`)**  
   - Attach this component to the completion trigger at the end of the course.  
   - When a player enters the trigger, it automatically unlocks `MBC25-FLOWSTATE` and sets the `ODO_Complete` achievement.  
   - Maintains a session-based list of players who have beaten the course to differentiate first-time vs. repeat completions.  
   - First-time completers receive: "Congratulations! You've just unlocked the FlowState MBC25!"  
   - Repeat completers receive: "Interstellar! You've just completed the Orbital Drop-stacle Course!"  
   - Configure the `notificationManager` prop to display toast notifications through the UI notification system.

2. **Respawn handling (`dropstacleSpawnTrigger.ts`)**  
   - Place this component on fail zone triggers throughout the course (e.g., under platforms where players might fall).  
   - Configure the `respawnGizmo` prop to reference a Spawn Point Gizmo at the course start or a checkpoint.  
   - When a player enters a fail zone trigger, they're instantly teleported back to retry the section.  
   - Keeps the course playable without requiring manual respawning or world resets.

### Utility / Helper Scripts

- `CircularMotion.ts`, `CycleLightColor.ts`, `SoftHover.ts` – simple animation helpers to add ambient motion.  
- `DoorController.ts`, `ForceFirstPersonView.ts` – environmental helpers for the Beat Lab shell.  
- `TriggerDetector.ts`, `UI_NotificationManager.ts` (above) – reusable bits that other worlds can borrow.

## Event Reference

### `shared-events-MBC25.ts`

| Event | Payload | Fired By | Purpose |
| --- | --- | --- | --- |
| `changeActiveMBC` | `{ packId }` | `MBCManager` | Tells `MBCDrop` (and any VFX) which pack should currently be visible. |
| `unlockMBC25` | `{ playerName, packId }` | `SoundwaveManager`, in-world unlock triggers | Persists the unlock and rebroadcasts inventory/swap events. |
| `checkMBCInventory` | `{ playerId }` | QA triggers | Dumps inventory contents to the console. |
| `dropMBC` | `{ packId }` | `MBC25Inventory` | Immediately spawn a newly unlocked pack without changing active ownership. |
| `inventoryUpdated` | `{ playerName }` | `MBC25Inventory` | Refreshes UI bindings whenever a player’s bitmask changes. |
| `requestMBCActivation` | `{ playerName, packId }` | `InventorySystemUI` | Performer asks to control the stage with a specific pack. |
| `relinquishMBC` | `{ playerName \| null }` | Inventory UI, AFK/exit handlers | Releases control (null indicates an automatic release). |
| `activePerformerChanged` | `{ playerName \| null }` | `MBCManager` | Lets UI, store, and soundwave systems know who is on stage. |
| `uiOwnerChanged` | `{ playerName \| null }` | Reserved for UI handoff | Optionally reassigns store/inventory ownership without reopening the panel. |
| `purchasePackWithSoundwaves` | `{ playerName, packId, cost }` | `SoundwaveStoreUI` | Debits the buyer and requests an unlock. |
| `soundwaveBalanceChanged` | `{ playerName, balance }` | `SoundwaveManager` | Keeps HUDs, stores, and leaderboards in sync with persistent storage. |
| `openSoundwaveStore` | `{ player }` | In-world triggers or buttons | Shows the store only to the requesting player. |
| `machinePlayState` | `{ isPlaying }` | `SongManager` / `MBCManager` | Single source of truth for “is any loop audible,” used by the soundwave economy and VFX. |

### `shared-events.ts` (Loop Grid)

| Event | Payload | Purpose |
| --- | --- | --- |
| `loopTriggerEvent` | `{ channelId, loopSectionId }` | Fired when a player steps off a loop trigger; starts or queues the loop. |
| `stopRowEvent` | `{ channelId }` | Stops every loop on the channel (stop buttons or scripted failsafes). |
| `offlineColorChangeEvent` | `{ channel, loopId }` | Returns a button to its idle color when another loop replaces it. |
| `hardOfflineColorChangeEvent` | `{ channel, loopId }` | Forces idle color immediately (used before resyncing all loops). |
| `playingColorChangeEvent` | `{ channel, loopId }` | Highlights the currently playing button. |
| `upcomingLoopColorChangedEvent` | `{ channel, loopId }` | Marks a button as queued to enter on the next measure. |

## Persistent Storage Keys

- `MBC25Inventory:unlockedSoundPacks` – bitmask where each `PACK_ID_BITS` entry marks an unlocked pack. Both UIs run `addDefaultPacks` whenever they read this value so the stored mask stays forward-compatible.
- `SoundwaveManager:points` – per-player soundwave balance. Synced to the leaderboard (when configured) and broadcast through `soundwaveBalanceChanged` after every update.

## Implementation Notes

- Assign the `managerEntity` prop on both UI components to the entity running `MBCManager` or `SoundwaveManager` respectively so button presses reach the right scripts.
- Hook `notificationManager` on Inventory UI and `NotificationManager` on Soundwave Manager to the `UI_NotificationManager` entity; both scripts fall back to console logs if it is missing.
- `SoundwaveStoreUI` defaults to visible-on-open only. Use triggers or interactables that fire `openSoundwaveStore` so the UI pops locally instead of globally.
- When authoring new packs, update `PACK_ID_BITS`, `DEFAULT_PACK_IDS`, the store’s `STORE_PACKS` array, and any art references inside `MBCDrop` to keep everything aligned.
- For the Orbital Drop-stacle Course: attach `CompleteDropObbyReward` to the completion trigger with `notificationManager` configured, and attach `dropstacleSpawnTrigger` to fail zone triggers with `respawnGizmo` pointing to the appropriate spawn point.
