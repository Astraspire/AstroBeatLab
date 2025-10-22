import { Component, PropTypes, Vec3, World, NetworkEvent, Player } from 'horizon/core';

// Define network events for players entering and exiting the trigger zone.
const PlayerEnteredEvent = new NetworkEvent<{ player: Player }>('playerEntered');
const PlayerExitedEvent = new NetworkEvent<{ player: Player }>('playerExited');

export class DoorController extends Component<typeof DoorController> {
  static propsDefinition = {
    door: { type: PropTypes.Entity },
    openPosition: { type: PropTypes.Vec3, default: new Vec3(0, 2, 0) },
    closedPosition: { type: PropTypes.Vec3, default: new Vec3(0, 0, 0) },
    speed: { type: PropTypes.Number, default: 2.0 },
  };

  private playersInTrigger = new Set<number>();
  private targetPosition: Vec3 | null = null;
  private isMoving = false;

  override preStart() {
    if (!this.props.door) return;

    // Listen for network events to open or close the door
    this.connectNetworkEvent(this.entity, PlayerEnteredEvent, (data) => this.onPlayerEntered(data.player));
    this.connectNetworkEvent(this.entity, PlayerExitedEvent, (data) => this.onPlayerExited(data.player));

    // Connect to the world update loop for smooth animation
    this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.updateDoorPosition(data.deltaTime));
  }

  override start() {
    // Set the door to its initial closed position
    if (this.props.door) {
      this.props.door.position.set(this.props.closedPosition);
      this.targetPosition = this.props.closedPosition;
    }
  }

  private onPlayerEntered(player: Player) {
    this.playersInTrigger.add(player.id);
    this.openDoor();
  }

  private onPlayerExited(player: Player) {
    this.playersInTrigger.delete(player.id);

    // Wait before checking if the door should close
    this.async.setTimeout(() => {
      if (this.playersInTrigger.size === 0) {
        this.closeDoor();
      }
    }, 8000); // 8-second delay
  }

  private openDoor() {
    if (this.props.door) {
      this.targetPosition = this.props.openPosition;
      this.isMoving = true;
    }
  }

  private closeDoor() {
    if (this.props.door) {
      this.targetPosition = this.props.closedPosition;
      this.isMoving = true;
    }
  }

  private updateDoorPosition(deltaTime: number) {
    if (!this.isMoving || !this.props.door || !this.targetPosition) {
      return;
    }

    const door = this.props.door;
    const currentPosition = door.position.get();
    const distance = currentPosition.distance(this.targetPosition);

    // Stop moving if we are very close to the target
    if (distance < 0.01) {
      this.isMoving = false;
      door.position.set(this.targetPosition);
      return;
    }

    // Move the door towards the target position using linear interpolation (Lerp)
    const newPosition = Vec3.lerp(currentPosition, this.targetPosition, this.props.speed * deltaTime);
    door.position.set(newPosition);
  }
}

Component.register(DoorController);