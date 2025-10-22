import * as hz from "horizon/core";
import { Component, Player } from "horizon/core";
import { Inventory } from "./SoundPackTypes";
import { changeActiveMBC, checkMBCInventory, dropMBC, unlockMBC25, requestMBCActivation, inventoryUpdated } from "./shared-events-MBC25";
import { PACK_ID_BITS, addDefaultPacks, maskToPackList } from "./PackIdBitmask";

/**
 * The key used to store per‑player state in persistent storage.
 *
 * Horizon Worlds provides a per‑player persistent key‑value store that
 * persists across sessions.  We save an array of pack IDs under this
 * key.  Each entry in the array is an object conforming to the
 * {@link Inventory} interface (currently just a packId string).
 */
const SOUND_PACKS_PPV = "MBC25Inventory:unlockedSoundPacks";

export default class MBC25Inventory extends Component<typeof MBC25Inventory> {
    static propsDefinition = {
    }

    // sets and stores active performer
    private activePerformer!: string;

    /**
     * Retrieve the numeric bitmask of unlocked packs for a player and convert
     * it to an array of {@link Inventory} records. Default packs are ensured to
     * be present and the storage value is updated if necessary.
     */
    private getUnlockedPacks(player: Player): Inventory[] {
        const raw = this.world.persistentStorage.getPlayerVariable<number>(
            player,
            SOUND_PACKS_PPV
        );
        let mask = raw ?? 0;
        const updated = addDefaultPacks(mask);
        if (updated !== mask) {
            mask = updated;
            this.world.persistentStorage.setPlayerVariable(
                player,
                SOUND_PACKS_PPV,
                mask
            );
        }
        return maskToPackList(mask);
    }

    /**
     * Look up a Player object from a provided name string.
     *
     * A number of events pass player names as strings.  This helper
     * iterates over all current players (both human and NPC) and
     * returns the matching Player object if found.
     *
     * @param playerName The name to search for.
     * @returns The matching Player or null if no match is found.
     */
    private findPlayerByName(playerName: string): Player | null {
        return (
            this.world
                .getPlayers()
                .find(p => p.name.get() === playerName)
            ?? null
        );
    }

    /**
     * Optional helper to log that a given pack ID exists in the
     * player's inventory.  In a more feature‑complete implementation
     * this might convert simple IDs into richer data about each pack.
     *
     * @param playerInventory An inventory record containing the packId.
     */
    private getFullInventory(playerInventory: Inventory) {
        console.log(`${playerInventory.packId} is unlocked in inventory.`);
    }

    /**
     * Diagnostic helper to print the contents of a player's inventory
     * to the console.  This is particularly useful during testing.
     *
     * @param player The Player whose inventory will be printed.
     */
    private printUserInventory(player: Player): void {
        if (player) {
            const inventory = this.getUnlockedPacks(player);
            for (const item of inventory) {
                console.log(`NEW: ${JSON.stringify(item)} is owned by ${player.name.get()}!!!`);
            }
            console.log(`OLD: ${JSON.stringify(inventory)} is owned by ${player.name.get()}.`);
        } else {
            console.log(`Invalid user for inventory check.`);
        }
    }

    /**
     * Persistently unlock a new sound pack for a player.
     *
     * When a player triggers an unlock event (for example by walking
     * through a trigger volume), we need to store that they own the
     * corresponding MBC.  This method does the following:
     *  - Look up the player's current list of unlocked packs from
     *    persistent storage.  If the list does not exist or cannot be
     *    parsed, we treat it as an empty array.
     *  - If the pack is not already in the list, we add it and write
     *    the updated array back to persistent storage.
     *  - Regardless of whether the pack was newly unlocked or already
     *    owned, we broadcast a {@link dropMBC} event so that any
     *    listening MBC machines can drop down and appear for the
     *    player.  Without this call, newly unlocked machines would not
     *    become visible until the next inventory check.
     *
     * @param playerName The human‑readable name of the player who
     *                   unlocked the pack.
     * @param packId     The identifier of the pack being unlocked.
     */
    private unlockSoundPack(playerName: string, packId: string): void {
        const player = this.findPlayerByName(playerName);
        if (!player) return;
        const bit = PACK_ID_BITS[packId];
        if (bit === undefined) return;
        let mask = this.world.persistentStorage.getPlayerVariable<number>(
            player,
            SOUND_PACKS_PPV
        ) ?? 0;
        if ((mask & bit) === 0) {
            mask |= bit;
            this.world.persistentStorage.setPlayerVariable(
                player,
                SOUND_PACKS_PPV,
                mask
            );
            console.log(`${playerName} now unlocked the ${packId} pack!`);
            // Notify UIs that the inventory has changed so they can refresh.
            this.sendLocalBroadcastEvent(inventoryUpdated, { playerName });
        } else {
            console.log(`${playerName} already owns the ${packId} pack.`);
        }

    }

    private resetActivePerformer(player: hz.Player): void {

        if (player.name.get() === this.activePerformer) {
            this.activePerformer = "";
        }

    }

    preStart() {
        // requests to activate or switch the active MBC25
        this.connectLocalEvent(
            this.entity!,
            requestMBCActivation,
            (requestData) => {
                console.log(`${requestData.playerName} is attempting to activated MBC25 id: ${requestData.packId}.`);
                if (requestData.playerName === this.activePerformer) {
                    // drops MBC25 with specified packId
                    this.sendLocalBroadcastEvent(
                        dropMBC,
                        { packId: requestData.packId }
                    )
                } else if (this.activePerformer === "") {
                    // drops MBC25 with specified packId
                    this.sendLocalBroadcastEvent(
                        dropMBC,
                        { packId: requestData.packId }
                    )
                    // mark player who requested drop as active performer
                    this.activePerformer = requestData.playerName;
                    console.log(`${this.activePerformer} is now the active performer.`)
                } else {
                    console.log(`${requestData.playerName} request to change MBC25 is denied, ${this.activePerformer} is still performing!`)
                }
            }
        )

        // checks inventory when LuckyCheck trigger is entered
        this.connectLocalEvent(
            this.entity!,
            checkMBCInventory,
            ({ playerId }) => {
                console.log(`checkMBCInventory event is received.`);
                // Print the player's inventory for debugging purposes.
                this.printUserInventory(playerId);
            }
        );

        // unlocks new MBC25 into inventory
        this.connectLocalEvent(
            this.entity!,
            unlockMBC25,
            (unlockData) => {
                console.log(`${unlockData.playerName} triggered an unlock for the '${unlockData.packId}' pack!`);
                this.unlockSoundPack(unlockData.playerName, unlockData.packId);
            }
        );


        this.connectCodeBlockEvent(
            this.entity!,
            hz.CodeBlockEvents.OnPlayerExitWorld,
            this.resetActivePerformer
        );

    }

    start() {
        // No additional initialization required
    }
}

Component.register(MBC25Inventory);
