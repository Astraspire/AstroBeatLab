import * as hz from 'horizon/core';
import { changeActiveMBC, dropMBC } from './shared-events-MBC25';
import { Quaternion } from 'horizon/core';

/**
 * MBCDrop controls the visibility and drop animation for a single
 * MBC25 beat machine.  When an MBC machine is not the currently
 * active pack it is hidden off‑screen.  When it becomes active the
 * machine spawns into the world.  This component listens for both dropMBC and
 * changeActiveMBC events and uses a helper to determine whether to
 * show or hide itself based on the incoming pack identifier.
 */

/** Map keys → your own enum/strings for clarity */
type MachineKey = 'MBC25-LUCKY' | 'MBC25-SOMETA' | 'MBC25-PHONK-E-CHEESE';

class MBCDrop extends hz.Component<typeof MBCDrop> {
    static propsDefinition = {
        /** Lucky Beat Machine */
        luckyMBC25: { type: hz.PropTypes.Asset },
        /** SoMeta Beat Machine */
        soMetaMBC25: { type: hz.PropTypes.Asset },
        /** Phonk-E-Cheese */
        pEcMBC25: { type: hz.PropTypes.Asset },

        stagePos: { type: hz.PropTypes.Vec3, default: new hz.Vec3(0, 0, 0) },
        stageRot: { type: hz.PropTypes.Quaternion, default: Quaternion.one },
        stageScale: { type: hz.PropTypes.Vec3, default: hz.Vec3.one },
    };

    /** The initial local position where the machine should land. */
    private initialLocal!: hz.Vec3;
    /** Subscription handle for the drop tween update loop. */
    private updateSub!: hz.EventSubscription;

    private currentRoot?: hz.Entity; // root of the machine now on the stage
    private currentKey?: string; // remember which one is up
    private switching: boolean = false; // prevent simultaneous spawns

    /**
     * despawns the current machine and switches to the incoming machine instead
     */
    async switchTo(key: string | MachineKey) {

        if (this.currentKey === key || this.switching) return; // already active or busy

        // mark switching and remember key immediately to avoid race conditions
        this.switching = true;
        this.currentKey = key;

        // despawn previous machine (if any)
        if (this.currentRoot?.exists()) {
            await this.world.deleteAsset(this.currentRoot); // despawn bundle
        }

        // look up asset to spawn
        const asset = this.assetFromKey(key as MachineKey);
        if (!asset) {
            console.warn(`No asset assigned for key ${key}`);
            this.switching = false;
            return;
        }

        // spawn the new machine
        const [root] = await this.world.spawnAsset(
            asset,
            this.props.stagePos,
            this.props.stageRot,
            this.props.stageScale,
        );

        // remember which machine is live
        this.currentRoot = root;
        this.switching = false;
    }

    /** Helper: map enum → Asset prop */
    private assetFromKey(key: MachineKey): hz.Asset | undefined {
        switch (key) {
            case 'MBC25-LUCKY': return this.props.luckyMBC25;
            case 'MBC25-SOMETA': return this.props.soMetaMBC25;
            case 'MBC25-PHONK-E-CHEESE': return this.props.pEcMBC25;
        }
    }

    /**
     * Decide whether to show or hide this machine based on the active
     * pack identifier.  When packId matches this machine's pack, the
     * drop animation is triggered.  Otherwise the machine is moved
     * off‑screen and hidden.
     *
     * @param packId The pack identifier to compare against this.props.packId.
     */
    private handleActivation(packId: string) {
        this.switchTo(packId);
    }

    preStart() {
        // Listen for drop events triggered when packs are unlocked.
        this.connectLocalBroadcastEvent(dropMBC, ({ packId }) => {
            this.handleActivation(packId);
        });
        // Listen for active change events from the MBCManager.
        this.connectLocalBroadcastEvent(changeActiveMBC, ({ packId }) => {
            this.handleActivation(packId);
        });
    }

    start() {
    }
}

hz.Component.register(MBCDrop);
