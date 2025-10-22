import * as hz from 'horizon/core';
import {
    loopTriggerEvent,
    offlineColorChangeEvent,
    hardOfflineColorChangeEvent,
    playingColorChangeEvent,
    upcomingLoopColorChangedEvent,
} from './shared-events';

/** Possible visual states for a loop button. */
enum ButtonState {
    Idle,
    Upcoming,
    Playing,
}

/**
 * Script attached to each loop trigger button on the generic MBC25 machine.
 * It handles color transitions for idle/upcoming/playing states and emits loop
 * trigger events when the player steps off the trigger volume.
 */
class LoopButtonTrigger extends hz.Component<typeof LoopButtonTrigger> {
    /** Current state of the button. */
    public state = ButtonState.Idle;

    static propsDefinition = {
        loopSectionId: { type: hz.PropTypes.Number },
        channelId: { type: hz.PropTypes.Number },
        upcomingPlaybackColor: { type: hz.PropTypes.Color, default: new hz.Color(0, 0, 1) },
        playbackColor: { type: hz.PropTypes.Color, default: new hz.Color(0, 1, 0) },
        originalButtonColor: { type: hz.PropTypes.Color, default: new hz.Color(1.0, 0.5, 0.0) },
        loopButton: { type: hz.PropTypes.Entity }
    };

    /** Broadcast a loopTriggerEvent with the channel and loop IDs. */
    private startLoopPress = (): void => {
        this.sendLocalBroadcastEvent(loopTriggerEvent, ({
            channelId: this.props.channelId,
            loopSectionId: this.props.loopSectionId
        }));
    }

    /** Reset button to its original color. */
    private buttonOffline = (): void => {
        console.log(`checking channel ${this.props.channelId}, loop ${this.props.loopSectionId} for active status before going idle...`);

        if (this.state == ButtonState.Playing) {
            console.log('button already active, skipping...');
            return;
        }

        console.log(`Trying to change to original color: ${this.props.originalButtonColor}`);

        // casts button as MeshEntity to access the style properties
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // sets button to match originalButtonColor property
        thisMesh.style.tintColor.set(this.props.originalButtonColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Idle;
    }

    /** Force the button back to its idle color regardless of state. */
    private hardOffline = (): void => {
        console.log(`Button channel ${this.props.channelId}, loop ${this.props.loopSectionId} going offline`);

        // casts button as MeshEntity to access the style properties
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // sets button to match originalButtonColor property
        thisMesh.style.tintColor.set(this.props.originalButtonColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Idle;
    }

    /** Set the button to indicate it will play on the next bar. */
    private buttonPrimedForPlayback = (): void => {
        console.log(`Trying to change to upcoming playback color: ${this.props.upcomingPlaybackColor}`);

        if (this.state == ButtonState.Playing) {
            console.log('Button already live');
            return;
        }

        // casts button as MeshEntity to access the style properties
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // sets button to match upcomingPlaybackColor property
        thisMesh.style.tintColor.set(this.props.upcomingPlaybackColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Upcoming;
    }

    /** Show the button as currently playing. */
    private buttonOnline = (): void => {
        console.log(`Trying to change to now playing color: ${this.props.playbackColor}`);

        // casts button as MeshEntity to access the style properties
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // sets button to match playbackColor property
        thisMesh.style.tintColor.set(this.props.playbackColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Playing;
    }

    preStart() {
        // Set color to default at start
        this.buttonOffline();

        // Return to idle color when receiving offlineColorChangeEvent
        this.connectLocalBroadcastEvent(offlineColorChangeEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonOffline();
                }
            }
        });

        // Force idle color for hard resets
        this.connectLocalBroadcastEvent(hardOfflineColorChangeEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.hardOffline();
                }
            }
        });

        // Highlight as playing when receiving playingColorChangeEvent
        this.connectLocalBroadcastEvent(playingColorChangeEvent, (loopData) => {
            console.log(`Received playingColorChangeEvent on loopButton script.`);
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonOnline();
                }
            }
        });

        // Turn blue to indicate upcoming playback when receiving upcomingLoopColorChangedEvent
        this.connectLocalBroadcastEvent(upcomingLoopColorChangedEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonPrimedForPlayback();
                }
            }
        });

        // Trigger loop playback when the player steps off
        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitTrigger,
            this.startLoopPress,
        );

        // Also color the button blue when stepped off to show it's queued
        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitTrigger,
            this.buttonPrimedForPlayback,
        );
    }

    override start() {
        // no-op
    }
}

hz.Component.register(LoopButtonTrigger);
