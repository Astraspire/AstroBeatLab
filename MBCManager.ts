import * as hz from 'horizon/core';
import {
    changeActiveMBC,
    requestMBCActivation,
    relinquishMBC,
    dropMBC,
    activePerformerChanged,
    machinePlayState,
} from './shared-events-MBC25';
import { PACK_ID_BITS } from './PackIdBitmask';
import { NotificationEvent } from "UI_SimpleButtonEvent";

/**
 * Coordinates exclusive access to MBC25 machines.
 * Tracks the active pack, the performer holding control, and AFK timers.
 * Grants or denies activation requests, broadcasts performer swaps, and clears control when needed.
 */
class MBCManager extends hz.Component<typeof MBCManager> {
    static propsDefinition = {
        notificationManager: { type: hz.PropTypes.Entity, default: null },
    };

    /** Pack identifier for the live machine, or null when nothing is active. */
    private activePack: string | null = null;
    /** Name of the performer currently in control, or null when unclaimed. */
    private controllingPlayerName: string | null = null;
    /** The performer currently in control, or null when unclaimed. */
    private controllingPlayer: hz.Player | null = null;

    /**
     * Persistent storage key shared with MBC25Inventory for pack ownership tracking.
     */
    private readonly SOUND_PACKS_PPV = 'MBC25Inventory:unlockedSoundPacks';

    /**
     * Checks persistent storage to confirm the player owns the requested packId.
     */
    private playerHasUnlocked(playerName: string, packId: string): boolean {
        const player = this.world
            .getPlayers()
            .find(p => p.name.get() === playerName);
        if (!player) return false;
        const mask = this.world.persistentStorage.getPlayerVariable<number>(
            player,
            this.SOUND_PACKS_PPV
        ) ?? 0;
        const bit = PACK_ID_BITS[packId];
        return bit !== undefined && (mask & bit) !== 0;
    }

    /**
     * Trigger the UI notification pop-up for the given recipients. When no recipients are provided the
     * message is shown to everyone in the world. Falls back to logging when the manager is not available.
     */
    private triggerUiNotification(message: string, recipients?: hz.Player[]): void {
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

    private forfeitControlCountdown(player: hz.Player | null): void {

        // if no player data sent when the function is called - automatic release occurs
        if (!player) {
           this.sendLocalBroadcastEvent(relinquishMBC, { playerName: null }); 
        }

        const playerName = player!.name.get();

        if (this.controllingPlayer === null) {
            console.log(
                    `MBCManager: ${playerName} releasing control.`
                );
                this.sendLocalBroadcastEvent(relinquishMBC, { playerName: null });
                this.activePack = null;
                this.controllingPlayerName = null;
                this.sendLocalBroadcastEvent(changeActiveMBC, { packId: '' });
                this.sendLocalBroadcastEvent(activePerformerChanged, { playerName: null });
                this.sendLocalBroadcastEvent(machinePlayState, { isPlaying: false });
        }

    }

    private isPlayerInWorld(player: hz.Player) {
        return this.world.getPlayers().includes(player) &&
            !player.isInBuildMode.get()
    }


    preStart() {
        // Accept activation requests from UI and script callers.
        this.connectLocalEvent(
            this.entity!,
            requestMBCActivation,
            ({ playerName, packId }) => {
                const player = this.world.getPlayers().find(p => p.name.get() === playerName);
                const requestingPlayers: hz.Player[] = player ? [player] : [];
                if (!this.playerHasUnlocked(playerName, packId)) {
                    // shouldn't ever occur, this is an extra guardrail.
                    this.triggerUiNotification(`You do not own the '${packId}' sound pack. You must unlock it first.`, requestingPlayers);
                    return;
                }
                // Allow the current performer to swap packs without releasing control.
                if (
                    !this.activePack ||
                    this.controllingPlayerName === null ||
                    this.controllingPlayerName === playerName
                ) {
                    this.activePack = packId;
                    this.controllingPlayerName = playerName;
                    this.sendLocalBroadcastEvent(changeActiveMBC, { packId });
                    this.sendLocalBroadcastEvent(activePerformerChanged, { playerName });
                } else {
                    console.log(
                        `MBCManager: Machine already in use by ${this.controllingPlayerName}. Request by ${playerName} ignored.`
                    );
                }
            }
        );

        // Release ownership when the performer intentionally gives up the machine.
        this.connectLocalEvent(
            this.entity!,
            relinquishMBC,
            ({ playerName }) => {
                const player = this.world.getPlayers().find(p => p.name.get() === playerName);
                const requestingPlayer: hz.Player[] = player ? [player] : [];

                if (this.controllingPlayerName == null) {
                    if (this.activePack != null) {
                        this.activePack = null;
                        this.controllingPlayerName = null;
                        this.sendLocalBroadcastEvent(changeActiveMBC, { packId: '' });
                        this.sendLocalBroadcastEvent(activePerformerChanged, { playerName: null } );
                        this.sendLocalBroadcastEvent(machinePlayState, { isPlaying: false });
                    } else {
                        this.triggerUiNotification("No active MBC25 found to put away!", requestingPlayer);
                    }
                } else if ((this.controllingPlayerName === playerName)) {
                    console.log(
                        `MBCManager: ${playerName} relinquished the MBC25 control.`
                    );
                    this.activePack = null;
                    this.controllingPlayerName = null;
                    this.sendLocalBroadcastEvent(changeActiveMBC, { packId: '' });
                    this.sendLocalBroadcastEvent(activePerformerChanged, { playerName: null } );
                    this.sendLocalBroadcastEvent(machinePlayState, { isPlaying: false });
                }
            }
        );

        this.connectLocalEvent(
            this.entity!,
            relinquishMBC,
            ({ playerName }) => {
                const player = this.world.getPlayers().find(p => p.name.get() === playerName);

                if (this.isPlayerInWorld( player! )) {
                    return;
                } else {
                    this.forfeitControlCountdown(player!);
                }
            }
        )

        this.connectCodeBlockEvent(
            this.entity!,
            hz.CodeBlockEvents.OnPlayerEnterAFK,
            this.forfeitControlCountdown,
        );

    }

    start() {
        // No additional startup logic required.
    }
}

hz.Component.register(MBCManager);
