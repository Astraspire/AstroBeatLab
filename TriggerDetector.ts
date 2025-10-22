import { Component, PropTypes, NetworkEvent, Player, CodeBlockEvents } from 'horizon/core';

// Network events forwarded to the configured target entity.
const PlayerEnteredEvent = new NetworkEvent<{ player: Player }>('playerEntered');
const PlayerExitedEvent = new NetworkEvent<{ player: Player }>('playerExited');

/**
 * Relays trigger enter and exit events to another entity over the network.
 */
export class TriggerDetector extends Component<typeof TriggerDetector> {
  static propsDefinition = {
    /** Entity that should receive the relay events. */
    targetEntity: { type: PropTypes.Entity },
  };

  override preStart() {
    // Forward trigger entries.
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerEnterTrigger,
      (player: Player) => this.handlePlayerEnter(player),
    );

    // Forward trigger exits.
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerExitTrigger,
      (player: Player) => this.handlePlayerExit(player),
    );
  }

  override start() {}

  private handlePlayerEnter(player: Player) {
    if (!this.props.targetEntity) return;
    this.sendNetworkEvent(this.props.targetEntity, PlayerEnteredEvent, { player });
  }

  private handlePlayerExit(player: Player) {
    if (!this.props.targetEntity) return;
    this.sendNetworkEvent(this.props.targetEntity, PlayerExitedEvent, { player });
  }
}

Component.register(TriggerDetector);

