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

        // Style updates require the MeshEntity interface.
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // Apply the idle tint.
        thisMesh.style.tintColor.set(this.props.originalButtonColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Idle;
    }

    /** Force the button back to its idle color regardless of state. */
    private hardOffline = (): void => {
        console.log(`Button channel ${this.props.channelId}, loop ${this.props.loopSectionId} going offline`);

        // Style updates require the MeshEntity interface.
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // Apply the idle tint.
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

        // Style updates require the MeshEntity interface.
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // Apply the queued-playback tint.
        thisMesh.style.tintColor.set(this.props.upcomingPlaybackColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Upcoming;
    }

    /** Show the button as currently playing. */
    private buttonOnline = (): void => {
        console.log(`Trying to change to now playing color: ${this.props.playbackColor}`);

        // Style updates require the MeshEntity interface.
        const thisMesh = this.props.loopButton!.as(hz.MeshEntity);
        // Apply the active-playback tint.
        thisMesh.style.tintColor.set(this.props.playbackColor);
        thisMesh.style.tintStrength.set(1.00);
        thisMesh.style.brightness.set(1.00);

        this.state = ButtonState.Playing;
    }

    preStart() {
        // Initialize the button with its idle color.
        this.buttonOffline();

        // Return to idle when the offline event targets this button.
        this.connectLocalBroadcastEvent(offlineColorChangeEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonOffline();
                }
            }
        });

        // Enforce idle during hard resets.
        this.connectLocalBroadcastEvent(hardOfflineColorChangeEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.hardOffline();
                }
            }
        });

        // Mark as playing when the active event targets this button.
        this.connectLocalBroadcastEvent(playingColorChangeEvent, (loopData) => {
            console.log(`Received playingColorChangeEvent on loopButton script.`);
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonOnline();
                }
            }
        });

        // Mark as queued when the upcoming event targets this button.
        this.connectLocalBroadcastEvent(upcomingLoopColorChangedEvent, (loopData) => {
            if (loopData.channel == this.props.channelId) {
                if (loopData.loopId == this.props.loopSectionId) {
                    this.buttonPrimedForPlayback();
                }
            }
        });

        // Fire the trigger event when the player steps off the pad.
        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitTrigger,
            this.startLoopPress,
        );

        // Update the button tint on exit to show it is queued.
        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitTrigger,
            this.buttonPrimedForPlayback,
        );
    }

    override start() {
        // Nothing additional to do at start.
    }
}

hz.Component.register(LoopButtonTrigger);

