import * as hz from 'horizon/core';
import { Text, Pressable, UIComponent, UINode, View, DynamicList, Binding } from 'horizon/ui';
import { Player } from 'horizon/core';
import {
    requestMBCActivation,
    relinquishMBC,
    inventoryUpdated,
    soundwaveBalanceChanged,
    activePerformerChanged,
    askToRelinquishMBC,
} from './shared-events-MBC25';
import {
    NotificationEvent
} from './UI_SimpleButtonEvent';
import { addDefaultPacks, maskToPackList } from './PackIdBitmask';

/**
 * Lists the viewer's unlocked MBC25 packs and forwards spawn or relinquish requests to MBCManager.
 * Requires the managerEntity prop to point at the entity running MBCManager.
 */
class InventorySystemUI extends UIComponent<typeof InventorySystemUI> {
    /** Panel height in pixels. */
    protected panelHeight: number = 300;
    /** Panel width in pixels. */
    protected panelWidth: number = 500;

    /**
     * Horizon UI props do not support strict entity typing, so the manager reference stays loose.
     * In practice the editor wires this to the entity running MBCManager.
     */
    static propsDefinition = {
        managerEntity: { type: hz.PropTypes.Entity },
        notificationManager: { type: hz.PropTypes.Entity, default: null },
    };

    /** Binding that drives the list of unlocked packs. */
    private packData = new Binding<Array<{ packId: string }>>([]);

    /** Message shown when no packs are unlocked. */
    private emptyMessage = new Binding<string>('');

    /** Message explaining whether the MBC25 is locked by another player. */
    private lockMessage = new Binding<string>('');

    /** Disables pack buttons when another player controls the machine. */
    private spawnButtonsDisabled = new Binding<boolean>(false);

    /** Disables relinquish button when the viewer does not own the active machine. */
    private relinquishDisabled = new Binding<boolean>(true);

    /** Name of the current active MBC25 controller, if any. */
    private activeControllerName: string | null = null;

    /** Name of the player currently reflected in the panel state. */
    private currentViewerName: string | null = null;

    /** Binding that communicates who the inventory panel belongs to. */
    private ownerText = new Binding<string>(`The Inventory:`);

    /** PackId for the machine the panel thinks is active. */
    private activeMBC25: string | null = null;

    /** Returns the first connected player when no explicit viewer is tracked. */
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
                `${controller} is using their MBC25. Wait for them to put it away or go AFK for 60 seconds.`
            );
            this.spawnButtonsDisabled.set(true);
            this.relinquishDisabled.set(true);
            this.sendLocalEvent(
                this.props.managerEntity!,
                askToRelinquishMBC,
                { playerName: controller }
            )
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
        this.currentViewerName = playerName;
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

    /**
     * Trigger the UI notification pop-up for the given recipients. When no recipients are provided the
     * message is shown to everyone in the world. Falls back to logging when the manager is not available.
     */
    private triggerUiNotification(message: string, recipients?: Player[]): void {
        const targets =
            recipients && recipients.length > 0 ? recipients : this.world.getPlayers();
        for (const target of targets) {
            console.log(`[Notification to ${target.name.get()}] ${message}`);
        }

        const payload = {
            message,
            players: targets,
            imageAssetId: null as string | null,
        };

        if (this.props.notificationManager) {
            this.sendLocalEvent(this.props.notificationManager, NotificationEvent, payload);
        }

        this.sendLocalBroadcastEvent(NotificationEvent, payload);
    }

    override preStart() {
        // Refresh the viewer's panel when their inventory changes.
        this.connectLocalBroadcastEvent(
            inventoryUpdated,
            ({ playerName }) => {
                const player = this.getCurrentPlayer();
                if (player && player.name.get() === playerName) {
                    this.refreshInventory(playerName);
                }
            }
        );

        // Keep the list current when the soundwave balance shifts.
        this.connectLocalBroadcastEvent(
            soundwaveBalanceChanged,
            (payload: { playerName: string; balance: number }) => {
                // Trigger a rebuild in case the player just purchased a pack.
                this.refreshInventory(payload.playerName);
            }
        );

        // Track the active performer so we can disable conflicting spawn actions.
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
     * Constructs the inventory panel layout and wires UI interactions to the relevant events.
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
                        // spawn pack from available inventory button
                        return Pressable({
                            disabled: this.spawnButtonsDisabled,
                            onPress: (_player) => {
                                const playerName = _player?.name.get() ?? '';
                                if (playerName != this.currentViewerName) {
                                    if (this.props.notificationManager) {
                                        this.triggerUiNotification(
                                            `Someone else's inventory is still open, try refreshing!`,
                                            [_player]
                                            )
                                    };
                                    return;
                                }
                                this.currentViewerName = playerName;
                                const manager: any = (this.props as any).managerEntity;
                                if ((manager) && ((this.activeControllerName == this.currentViewerName) || this.activeControllerName == null)) {
                                    this.sendLocalEvent(
                                        manager,
                                        requestMBCActivation,
                                        { playerName, packId }
                                    );
                                    if (this.props.notificationManager) {
                                        this.triggerUiNotification(`${playerName}'s ${packId} is loaded on the stage now!`);
                                    }
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
                    // 'Put away your MBC' button
                    disabled: this.relinquishDisabled,
                    onPress: (_player) => {
                        const playerName = _player?.name.get() ?? '';
                        this.updateLockBindings();
                        const manager: any = (this.props as any).managerEntity;
                        if (playerName != this.currentViewerName) {
                           if (this.props.notificationManager) {
                                this.triggerUiNotification(
                                    `Your inventory panel is not open, referesh first.`,
                                    [_player]
                                    )
                            }; 
                        };
                        if ((manager) && (this.activeControllerName == playerName)) {
                            this.sendLocalEvent(
                                manager,
                                relinquishMBC,
                                { playerName }
                            );
                            if (this.props.notificationManager) {
                                this.triggerUiNotification(
                                    `You have put away your MBC25.`,
                                    [_player]
                                    )
                            };
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

// Make the component available for use in the editor.
UIComponent.register(InventorySystemUI);
