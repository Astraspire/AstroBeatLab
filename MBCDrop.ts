import * as hz from 'horizon/core';
import { changeActiveMBC, dropMBC } from './shared-events-MBC25';
import { Quaternion } from 'horizon/core';

/**
 * Swaps in the correct MBC25 machine asset whenever a new pack becomes active.
 * Listens for drop and activation events, despawns the previous bundle, then
 * spawns the asset referenced by the configured props.
 */

/** String literal union matching the configured asset props. */
type MachineKey = 'MBC25-LUCKY' | 'MBC25-SOMETA' | 'MBC25-PHONK-E-CHEESE';

export class MBCDrop extends hz.Component<typeof MBCDrop> {
    static propsDefinition = {
        /** Asset bundle for the Lucky machine variant. */
        luckyMBC25: { type: hz.PropTypes.Asset },
        /** Asset bundle for the SoMeta machine variant. */
        soMetaMBC25: { type: hz.PropTypes.Asset },
        /** Asset bundle for the Phonk-E-Cheese machine variant. */
        pEcMBC25: { type: hz.PropTypes.Asset },

        stagePos: { type: hz.PropTypes.Vec3, default: new hz.Vec3(0, 0, 0) },
        stageRot: { type: hz.PropTypes.Quaternion, default: Quaternion.one },
        stageScale: { type: hz.PropTypes.Vec3, default: hz.Vec3.one },

    };

    /** Cached world position used when spawning machines. */
    private initialLocal!: hz.Vec3;
    /** Optional handle for tween update subscriptions. */
    private updateSub!: hz.EventSubscription;
    private spawnedRoots: hz.Entity[] = [] // stores a list of all previously mbc's spawned into world
    private currentRoot?: hz.Entity; // Root entity for the spawned machine.
    private currentKey?: string; // Tracks which pack is currently live.
    private switching: boolean = false; // Prevents overlapping spawn operations.

    /**
     * Despawns the current machine and spawns whichever bundle matches the provided key.
     */
    async switchTo(key: string | MachineKey) {
        if (this.currentKey === key || this.switching) return;

        this.switching = true;
        this.currentKey = key;

        // removes all previously spawned MBCs
        if (this.currentRoot?.exists()) {
            await Promise.all(
                this.spawnedRoots
                    .filter(root => root?.exists())
                    .map(root => this.world.deleteAsset(root))
            );
            this.spawnedRoots.length = 0;
        }

        const asset = this.assetFromKey(key as MachineKey);
        if (!asset) {
            console.warn(`No asset assigned for key ${key}`);
            this.switching = false;
            return;
        }
        
        // spawns new MBC
        const [root] = await this.world.spawnAsset(
            asset,
            this.props.stagePos,
            this.props.stageRot,
            this.props.stageScale,
        );

        this.spawnedRoots.push(root); // adds root to list of spawned MBCs
        this.currentRoot = root; // sets current MBC
        this.switching = false;
    }

    /** Maps the string key to the asset prop set in the editor. */
    private assetFromKey(key: MachineKey): hz.Asset | undefined {
        switch (key) {
            case 'MBC25-LUCKY': return this.props.luckyMBC25;
            case 'MBC25-SOMETA': return this.props.soMetaMBC25;
            case 'MBC25-PHONK-E-CHEESE': return this.props.pEcMBC25;
        }
    }

    /** Responds to activation events by switching to the provided packId. */
    private handleActivation(packId: string) {
        this.switchTo(packId);
    }

    preStart() {
        // Spawn machines immediately when inventory unlocks fire.
        this.connectLocalBroadcastEvent(dropMBC, ({ packId }) => {
            this.handleActivation(packId);
        });
        // Mirror changes when MBCManager selects a different performer pack.
        this.connectLocalBroadcastEvent(changeActiveMBC, ({ packId }) => {
            this.handleActivation(packId);
        });
    }

    start() {
    }
}

hz.Component.register(MBCDrop);

