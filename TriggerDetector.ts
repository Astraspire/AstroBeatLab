import { Component, PropTypes, NetworkEvent, Player, CodeBlockEvents } from 'horizon/core';

// Define the network events that will be sent to the target entity.
// It's good practice to include the player who triggered the event in the data.
const PlayerEnteredEvent = new NetworkEvent<{ player: Player }>('playerEntered');
const PlayerExitedEvent = new NetworkEvent<{ player: Player }>('playerExited');

export class TriggerDetector extends Component<typeof TriggerDetector> {
  // Define a property to specify which entity should receive the events.
  // This will be set in the editor's property panel.
  static propsDefinition = {
    targetEntity: { type: PropTypes.Entity },
  };

  override preStart() {
    // Listen for the built-in event that fires when a player enters the trigger.
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerEnterTrigger,
      (player: Player) => {
        this.handlePlayerEnter(player);
      }
    );

    // Listen for the built-in event that fires when a player exits the trigger.
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerExitTrigger,
      (player: Player) => {
        this.handlePlayerExit(player);
      }
    );
  }

  // This method is required by the Component class, but we don't need any logic here
  // because all setup is done in preStart.
  override start() {}

  private handlePlayerEnter(player: Player) {
    // Check if a target entity has been assigned in the properties.
    if (this.props.targetEntity) {
      // Send the 'playerEntered' network event to the target entity.
      // Include the player object so the receiver knows who entered.
      this.sendNetworkEvent(this.props.targetEntity, PlayerEnteredEvent, { player: player });
    }
  }

  private handlePlayerExit(player: Player) {
    // Check if a target entity has been assigned.
    if (this.props.targetEntity) {
      // Send the 'playerExited' network event to the target entity.
      this.sendNetworkEvent(this.props.targetEntity, PlayerExitedEvent, { player: player });
    }
  }
}

Component.register(TriggerDetector);