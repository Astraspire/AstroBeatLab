import * as hz from 'horizon/core';
import {
    changeActiveMBC,
    requestMBCActivation,
    relinquishMBC,
    dropMBC,
    activePerformerChanged,
    machinePlayState
} from './shared-events-MBC25';
import { PACK_ID_BITS } from './PackIdBitmask';
import { simpleButtonEvent } from "UI_SimpleButtonEvent";

/**
 * Coordinates exclusive access to MBC25 machines.
 * Tracks the active pack, the performer holding control, and AFK timers.
 * Grants or denies activation requests, broadcasts performer swaps, and clears control when needed.
 */
class MBCManager extends hz.Component<typeof MBCManager> {
    static propsDefinition = {
        // No configurable props are exposed currently.
    };

    /** Pack identifier for the live machine, or null when nothing is active. */
    private activePack: string | null = null;
    /** Name of the performer currently in control, or null when unclaimed. */
    private controllingPlayer: string | null = null;
    /** Timeout handles tracking AFK relinquish countdowns per player. */
    private afkTimeouts = new Map<string, number>();

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

    private clearAfkTimeout(playerName: string): void {
        const timeoutId = this.afkTimeouts.get(playerName);
        if (timeoutId !== undefined) {
            this.async.clearTimeout(timeoutId);
            this.afkTimeouts.delete(playerName);
        }
    }

    private forfeitControlCountdown(player: hz.Player): void {
        const playerName = player.name.get();
        if (playerName !== this.controllingPlayer) {
            return;
        }

        this.clearAfkTimeout(playerName);

        const timeoutId = this.async.setTimeout(() => {
            if (playerName === this.controllingPlayer) {
                console.log(
                    `MBCManager: ${playerName} has been AFK for 90 seconds. Releasing control.`
                );
                this.activePack = null;
                this.controllingPlayer = null;
                this.sendLocalBroadcastEvent(changeActiveMBC, { packId: '' });
                this.sendLocalBroadcastEvent(activePerformerChanged, { playerName: null });
                this.sendLocalBroadcastEvent(machinePlayState, { isPlaying: false });
            }
            this.afkTimeouts.delete(playerName);
        }, 90000);

        this.afkTimeouts.set(playerName, timeoutId);
    }

    private cancelAfkCountdown(player: hz.Player): void {
        const playerName = player.name.get();
        this.clearAfkTimeout(playerName);
    }
    preStart() {
        // Accept activation requests from UI and script callers.
        this.connectLocalEvent(
            this.entity!,
            requestMBCActivation,
            ({ playerName, packId }) => {
                if (!this.playerHasUnlocked(playerName, packId)) {
                    console.log(
                        `MBCManager: ${playerName} tried to activate pack '${packId}', but they do not own it.`
                    );
                    return;
                }
                // Allow the current performer to swap packs without releasing control.
                if (
                    !this.activePack ||
                    this.controllingPlayer === null ||
                    this.controllingPlayer === playerName
                ) {
                    this.clearAfkTimeout(playerName);
                    this.activePack = packId;
                    this.controllingPlayer = playerName;
                    this.sendLocalBroadcastEvent(changeActiveMBC, { packId });
                    this.sendLocalBroadcastEvent(activePerformerChanged, { playerName });
                } else {
                    console.log(
                        `MBCManager: Machine already in use by ${this.controllingPlayer}. Request by ${playerName} ignored.`
                    );
                }
            }
        );

        // Release ownership when the performer intentionally gives up the machine.
        this.connectLocalEvent(
            this.entity!,
            relinquishMBC,
            ({ playerName }) => {
                if (this.controllingPlayer === playerName) {
                    console.log(
                        `MBCManager: ${playerName} relinquished the MBC25 control.`
                    );
                    this.clearAfkTimeout(playerName);
                    this.activePack = null;
                    this.controllingPlayer = null;
                    this.sendLocalBroadcastEvent(changeActiveMBC, { packId: '' });
                    this.sendLocalBroadcastEvent(activePerformerChanged, { playerName: null });
                    this.sendLocalBroadcastEvent(machinePlayState, { isPlaying: false });
                }
            }
        );

        this.connectCodeBlockEvent(
            this.entity!,
            hz.CodeBlockEvents.OnPlayerEnterAFK,
            this.forfeitControlCountdown,
        );
        this.connectCodeBlockEvent(
            this.entity!,
            hz.CodeBlockEvents.OnPlayerExitAFK,
            this.cancelAfkCountdown,
        );

    }

    start() {
        // No additional startup logic required.
    }
}

hz.Component.register(MBCManager);
