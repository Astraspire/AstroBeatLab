import * as hz from 'horizon/core';
import { stopRowEvent } from './shared-events';

/**
 * Component placed on "stop" buttons for the generic MBC25 machine. When the
 * player steps off the trigger it broadcasts a stopRowEvent to halt the
 * specified channel.
 */
class StopButtonTrigger extends hz.Component<typeof StopButtonTrigger> {
    static propsDefinition = {
        channelId: { type: hz.PropTypes.Number },
    };

    /** Broadcast that the current channel should stop playing. */
    private sendStop = (): void => {
        this.sendLocalBroadcastEvent(stopRowEvent, ({
            channelId: this.props.channelId
        }));
    }

    preStart() {
        // Send stop event when a player leaves the trigger
        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitTrigger,
            this.sendStop,
        );
    }

    start() {
        // No runtime logic required.
    }
}

hz.Component.register(StopButtonTrigger);
