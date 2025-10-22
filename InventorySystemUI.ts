import * as hz from 'horizon/core';
import { Text, Pressable, UIComponent, UINode, View, DynamicList, Binding } from 'horizon/ui';
import { Player } from 'horizon/core';
import {
    requestMBCActivation,
    relinquishMBC,
    inventoryUpdated,
    soundwaveBalanceChanged,
    activePerformerChanged,
} from './shared-events-MBC25';
import { addDefaultPacks, maskToPackList } from './PackIdBitmask';

/**
 * InventorySystem presents a simple UI listing the unlocked MBC25 packs
 * for the current player and allows them to activate one or relinquish
 * control of the currently active machine.  It relies on the
 * {@link MBCManager} to handle locking and activation logic.  A
 * managerEntity prop should be set to reference the entity running
 * MBCManager.  This component is implemented using the Pressable
 * element for interactive rows.
 */
class InventorySystemUI extends UIComponent<typeof InventorySystemUI> {
    /** Height of the panel in pixels. */
    protected panelHeight: number = 300;
    /** Width of the panel in pixels. */
    protected panelWidth: number = 500;

    /**
     * Expose a managerEntity property so that the UI can dispatch events
     * to the MBCManager.  The type is loosely typed as any because
     * Horizon's UI props system doesn't support strict Entity types in
     * TypeScript.  In practice this should be set in the editor to
     * reference the entity containing MBCManager.
     */
    static propsDefinition = {
        managerEntity: { type: hz.PropTypes.Entity },
    };

    /** Binding containing the list of unlocked packs. */
    private packData = new Binding<Array<{ packId: string }>>([]);

    /** Message shown when no packs are unlocked. */
    private emptyMessage = new Binding<string>('');

    /** Message explaining whether the MBC25 is locked by another player. */
    private lockMessage = new Binding<string>('');

    /** Disables pack buttons when another player controls the machine. */
    private spawnButtonsDisabled = new Binding<boolean>(false);

    /** Disables relinquish button when the viewer does not own the active machine. */
    private relinquishDisabled = new Binding<boolean>(true);

    /** Tracks the name of the current active MBC25 controller, if any. */
    private activeControllerName: string | null = null;

    /** Tracks which player this UI panel is currently rendering for. */
    private currentViewerName: string | null = null;

    /** Binding used to display the current owner of the inventory panel. */
    private ownerText = new Binding<string>(`The Inventory:`);

    /** Tracks which MBC25 is currently spawned in world */
    private activeMBC25: string | null = null;

    /** Return the first connected player as the current UI owner. */
    private getCurrentPlayer(): Player | null {
        const players = this.world.getPlayers();
        return players.length > 0 ? players[0] : null;
    }

    /** Recompute bindings that depend on the active controller or viewing player. */
    private updateLockBindings(): void {
        const viewerName = this.currentViewerName ?? null;
        const controller = this.activeControllerName;
        const activeMBC25 = this.activeMBC25;
        
        if (viewerName == null) {
            this.ownerText.set('Inventory Panel Closed');
        } else {
            this.ownerText.set(`${viewerName}'s Inventory`);
        }

        if (!controller) {
            this.lockMessage.set('');
            this.spawnButtonsDisabled.set(false);
            this.relinquishDisabled.set(true);
            return;
        }

        if (activeMBC25 != null) {
            this.lockMessage.set(`${controller} currently controls the ${this.activeMBC25} machine.`);
        }

        if (controller === viewerName) {
            this.spawnButtonsDisabled.set(false);
            this.relinquishDisabled.set(false);
        } else {
            this.lockMessage.set(
                `${controller} is using their MBC25. Wait for them to put it away or be AFK for 90 seconds.`
            );
            this.spawnButtonsDisabled.set(true);
            this.relinquishDisabled.set(true);
        }
    }

    /** Refresh the inventory list bindings. */
    private refreshInventory(playerName: string): void {
        const player = this.world.getPlayers().find(p => p.name.get() === playerName) ?? null;
        const currentViewer = this.getCurrentPlayer();
        if (currentViewer && currentViewer.name.get() === playerName) {
            this.currentViewerName = playerName;
        }
        const packs = this.getUnlockedPacks(player);
        if (packs.length > 0) {
            this.packData.set(packs);
            this.emptyMessage.set('');
        } else {
            this.packData.set([]);
            this.emptyMessage.set('No MBC25 packs unlocked.');
        }

        this.updateLockBindings();
    }

    /** Retrieve unlocked packs from persistent storage as a numeric bitmask. */
    private getUnlockedPacks(player: Player | null): Array<{ packId: string }> {
        const key = 'MBC25Inventory:unlockedSoundPacks';
        if (!player) return [];
        let mask = this.world.persistentStorage.getPlayerVariable<number>(player, key) ?? 0;
        const updated = addDefaultPacks(mask);
        if (updated !== mask) {
            mask = updated;
            this.world.persistentStorage.setPlayerVariable(player, key, mask);
        }
        return maskToPackList(mask);
    }

    override preStart() {
        // Update UI whenever the player's inventory changes (e.g. after purchases).
        this.connectLocalBroadcastEvent(
            inventoryUpdated,
            ({ playerName }) => {
                const player = this.getCurrentPlayer();
                if (player && player.name.get() === playerName) {
                    this.refreshInventory(playerName);
                }
            }
        );

        // Update balance when the manager notifies of changes.
        this.connectLocalBroadcastEvent(
            soundwaveBalanceChanged,
            (payload: { playerName: string; balance: number }) => {
                // Rebuild the inventory list in case a pack was bought.
                this.refreshInventory(payload.playerName);
            }
        );

        // Track which player currently controls the MBC25 so the UI can gate spawning.
        this.connectLocalBroadcastEvent(
            activePerformerChanged,
            ({ playerName }) => {
                this.activeControllerName = playerName ?? null;
                this.updateLockBindings();
            }
        );

        this.updateLockBindings();
    }

    /**
     * Build the UI panel for the inventory.  Each unlocked pack is
     * displayed as a Pressable row containing a text label.  When a
     * pack row is pressed, the UI sends a requestMBCActivation event
     * to the managerEntity with the player's name and the pack ID.
     * Additionally, a row allows the player to relinquish control of
     * the active machine by sending a relinquishMBC event.
     */
    initializeUI(): UINode {
        return View({
            children: [
                Text({
                    text: this.ownerText,
                    style: { 
                        fontSize: 22, 
                        color: 'white', 
                        marginBottom: 8 
                    },
                }),
                Text({
                    text: this.emptyMessage,
                    style: {
                        fontSize: 18,
                        color: 'white',
                        marginBottom: 8,
                    },
                }),
                Text({
                    text: this.lockMessage,
                    style: {
                        fontSize: 14,
                        color: 'yellow',
                        marginBottom: 6,
                    },
                }),
                DynamicList({
                    data: this.packData,
                    renderItem: (item) => {
                        const packId = item.packId;
                        return Pressable({
                            disabled: this.spawnButtonsDisabled,
                            onPress: (_player) => {
                                const playerName = _player?.name.get() ?? '';
                                this.currentViewerName = playerName;
                                const manager: any = (this.props as any).managerEntity;
                                if (manager) {
                                    this.sendLocalEvent(
                                        manager,
                                        requestMBCActivation,
                                        { playerName, packId }
                                    );
                                }
                                if (packId != null) {
                                    this.activeMBC25 = packId;
                                }
                                this.updateLockBindings();
                            },
                            style: {
                                marginBottom: 8,
                                padding: 4,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                            children: Text({
                                text: `Load ${packId} pack`,
                                style: {
                                    fontSize: 22,
                                    color: 'green',
                                },
                            }),
                        });
                    },
                    style: { flexGrow: 1 },
                }),
                Pressable({
                    disabled: this.relinquishDisabled,
                    onPress: (_player) => {
                        const playerName = _player?.name.get() ?? '';
                        this.currentViewerName = playerName;
                        this.updateLockBindings();
                        const manager: any = (this.props as any).managerEntity;
                        if (manager) {
                            this.sendLocalEvent(
                                manager,
                                relinquishMBC,
                                { playerName }
                            );
                        }
                    },
                    style: {
                        marginTop: 10,
                        padding: 2,
                        backgroundColor: 'rgba(255,0,0,0.2)',
                    },
                    children: Text({
                        text: 'Put away your MBC25',
                        style: {
                            fontSize: 20,
                            color: 'red',
                        },
                    }),
                }),

                Pressable({
                    onPress: (_player) => {
                        this.refreshInventory((_player.name.get()));
                    },
                    style: {
                        marginTop: 4,
                        padding: 2,
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                    children: Text({
                        text: 'Open/Refresh your inventory',
                        style: {
                            fontSize: 20,
                            color: 'blue',
                        },
                    }),
                }),
            ],
            style: {
                backgroundColor: 'black',
                height: this.panelHeight,
                width: this.panelWidth,
                padding: 12,
                justifyContent: 'flex-start',
            },
        });
    }
}

// Register the UI component so it can be attached to a UI Gizmo.
UIComponent.register(InventorySystemUI);

