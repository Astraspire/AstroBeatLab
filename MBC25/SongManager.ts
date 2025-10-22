import * as hz from 'horizon/core';
import {
    loopTriggerEvent,
    offlineColorChangeEvent,
    hardOfflineColorChangeEvent,
    playingColorChangeEvent,
    stopRowEvent,
    upcomingLoopColorChangedEvent,
    machinePlayState,
} from './shared-events';

/**
 * Coordinates loop playback for the generic MBC25 machine.  It mirrors the
 * behavior of the pack-specific managers so that any set of loops can use the
 * same script.  Loops begin playing immediately when first triggered and are
 * kept in sync on subsequent repetitions.
 */
class SongManager extends hz.Component<typeof SongManager> {
    static propsDefinition = {
        chan1Loop1: { type: hz.PropTypes.Entity },
        chan1Loop2: { type: hz.PropTypes.Entity },
        chan1Loop3: { type: hz.PropTypes.Entity },
        chan1Loop4: { type: hz.PropTypes.Entity },
        chan1Loop5: { type: hz.PropTypes.Entity },
        chan2Loop1: { type: hz.PropTypes.Entity },
        chan2Loop2: { type: hz.PropTypes.Entity },
        chan2Loop3: { type: hz.PropTypes.Entity },
        chan2Loop4: { type: hz.PropTypes.Entity },
        chan2Loop5: { type: hz.PropTypes.Entity },
        chan3Loop1: { type: hz.PropTypes.Entity },
        chan3Loop2: { type: hz.PropTypes.Entity },
        chan3Loop3: { type: hz.PropTypes.Entity },
        chan3Loop4: { type: hz.PropTypes.Entity },
        chan3Loop5: { type: hz.PropTypes.Entity },
        chan4Loop1: { type: hz.PropTypes.Entity },
        chan4Loop2: { type: hz.PropTypes.Entity },
        chan4Loop3: { type: hz.PropTypes.Entity },
        chan4Loop4: { type: hz.PropTypes.Entity },
        chan4Loop5: { type: hz.PropTypes.Entity },
        chan5Loop1: { type: hz.PropTypes.Entity },
        chan5Loop2: { type: hz.PropTypes.Entity },
        chan5Loop3: { type: hz.PropTypes.Entity },
        chan5Loop4: { type: hz.PropTypes.Entity },
        chan5Loop5: { type: hz.PropTypes.Entity },
        customFadeTime: { type: hz.PropTypes.Number },
        customBPM: { type: hz.PropTypes.Number },
        beatsPerLoop: { type: hz.PropTypes.Number },
    };

    private fadeTime!: number;
    private songBPM!: number;
    private beatsPerLoop!: number;
    private channelLoops!: hz.AudioGizmo[][];
    private activeLoops: Record<number, {
        channelId: number;
        loopSectionId: number;
        gizmo: hz.AudioGizmo;
    }> = {};
    private loopDurationSec!: number;
    private intervalId: number | null = null;
    private playing = false;

    /** Remove tracking for a channel's current loop without affecting play state. */
    private removeLoop(channelId: number) {
        delete this.activeLoops[channelId];
    }

    /** Stop all audio on a channel and update play state. */
    private stopChannel(channelId: number) {
        console.log(`Channel ${channelId} triggered to stop.`);
        const oldLoop = this.activeLoops[channelId];
        if (!oldLoop) return;

        oldLoop.gizmo.stop({ fade: this.fadeTime });
        this.sendLocalBroadcastEvent(hardOfflineColorChangeEvent, {
            channel: channelId,
            loopId: oldLoop.loopSectionId,
        });
        this.removeLoop(channelId);

        if (Object.keys(this.activeLoops).length === 0) {
            if (this.intervalId !== null) {
                this.async.clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.updatePlayState();
        }
    }

    /** Start the repeating scheduler that keeps loops in sync. */
    private startLoopScheduler() {
        if (this.intervalId !== null) return;

        const interval = this.loopDurationSec * 1000; // ms
        this.intervalId = this.async.setInterval(() => {
            // Reset all buttons to their offline state first
            this.channelLoops.forEach((loops, channelIdx) => {
                loops.forEach((gizmo, loopIdx) => {
                    this.sendLocalBroadcastEvent(hardOfflineColorChangeEvent, {
                        channel: channelIdx + 1,
                        loopId: loopIdx + 1,
                    });
                });
            });

            // Then bring the active loops online and replay them
            Object.values(this.activeLoops).forEach(({ channelId, loopSectionId, gizmo }) => {
                this.sendLocalBroadcastEvent(playingColorChangeEvent, {
                    channel: channelId,
                    loopId: loopSectionId,
                });
                gizmo.play();
            });
        }, interval);
    }

    /** Broadcast whether the machine currently has audible loops. */
    private updatePlayState() {
        const isPlaying = Object.keys(this.activeLoops).length > 0;
        if (isPlaying !== this.playing) {
            this.playing = isPlaying;
            this.sendLocalBroadcastEvent(machinePlayState, { isPlaying });
        }
    }

    preStart() {
        // Map all audio gizmos to their grid positions
        this.channelLoops = [
            [this.props.chan1Loop1!.as(hz.AudioGizmo), this.props.chan1Loop2!.as(hz.AudioGizmo), this.props.chan1Loop3!.as(hz.AudioGizmo), this.props.chan1Loop4!.as(hz.AudioGizmo), this.props.chan1Loop5!.as(hz.AudioGizmo)],
            [this.props.chan2Loop1!.as(hz.AudioGizmo), this.props.chan2Loop2!.as(hz.AudioGizmo), this.props.chan2Loop3!.as(hz.AudioGizmo), this.props.chan2Loop4!.as(hz.AudioGizmo), this.props.chan2Loop5!.as(hz.AudioGizmo)],
            [this.props.chan3Loop1!.as(hz.AudioGizmo), this.props.chan3Loop2!.as(hz.AudioGizmo), this.props.chan3Loop3!.as(hz.AudioGizmo), this.props.chan3Loop4!.as(hz.AudioGizmo), this.props.chan3Loop5!.as(hz.AudioGizmo)],
            [this.props.chan4Loop1!.as(hz.AudioGizmo), this.props.chan4Loop2!.as(hz.AudioGizmo), this.props.chan4Loop3!.as(hz.AudioGizmo), this.props.chan4Loop4!.as(hz.AudioGizmo), this.props.chan4Loop5!.as(hz.AudioGizmo)],
            [this.props.chan5Loop1!.as(hz.AudioGizmo), this.props.chan5Loop2!.as(hz.AudioGizmo), this.props.chan5Loop3!.as(hz.AudioGizmo), this.props.chan5Loop4!.as(hz.AudioGizmo), this.props.chan5Loop5!.as(hz.AudioGizmo)],
        ];

        this.fadeTime = this.props.customFadeTime!;
        this.songBPM = this.props.customBPM!;
        this.beatsPerLoop = this.props.beatsPerLoop!;
        this.loopDurationSec = (60.0 / this.songBPM) * this.beatsPerLoop;

        // React to loop trigger events
        this.connectLocalBroadcastEvent(loopTriggerEvent, (loopData) => {
            console.log(`Channel: ${loopData.channelId}, Loop: ${loopData.loopSectionId} triggered to start.`);
            const incomingChannelId = loopData.channelId;
            const incomingLoopId = loopData.loopSectionId;
            const wasEmpty = Object.keys(this.activeLoops).length === 0;
            const oldLoop = this.activeLoops[incomingChannelId];

            if (oldLoop !== undefined) {
                if (oldLoop.loopSectionId === incomingLoopId) {
                    return; // already playing this loop
                }
                this.sendLocalBroadcastEvent(offlineColorChangeEvent, {
                    channel: loopData.channelId,
                    loopId: oldLoop.loopSectionId,
                });
                this.removeLoop(loopData.channelId);
            }

            const newAudio = this.channelLoops[incomingChannelId - 1][incomingLoopId - 1];
            this.activeLoops[incomingChannelId] = {
                channelId: incomingChannelId,
                loopSectionId: incomingLoopId,
                gizmo: newAudio,
            };

            if (wasEmpty) {
                // First loop starts immediately
                this.startLoopScheduler();
                this.sendLocalBroadcastEvent(playingColorChangeEvent, {
                    channel: loopData.channelId,
                    loopId: loopData.loopSectionId,
                });
                newAudio.play();
                this.updatePlayState();
            } else {
                // Subsequent loops queue for next bar
                this.sendLocalBroadcastEvent(upcomingLoopColorChangedEvent, {
                    channel: loopData.channelId,
                    loopId: loopData.loopSectionId,
                });
            }
        });

        // Listen for channel stop requests
        this.connectLocalBroadcastEvent(stopRowEvent, (channelData) => {
            this.stopChannel(channelData.channelId);
        });
    }

    start() {
        // Interval scheduler begins on first loop press, nothing needed here.
    }
}

hz.Component.register(SongManager);
