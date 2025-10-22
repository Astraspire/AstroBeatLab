import { Component, PropTypes, Vec3, World, NetworkEvent, Player } from 'horizon/core';

// Network events dispatched when players enter or exit the trigger.
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

    // Respond to trigger events by opening or closing the door.
    this.connectNetworkEvent(this.entity, PlayerEnteredEvent, (data) => this.onPlayerEntered(data.player));
    this.connectNetworkEvent(this.entity, PlayerExitedEvent, (data) => this.onPlayerExited(data.player));

    // Animate the door every frame via the world update loop.
    this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.updateDoorPosition(data.deltaTime));
  }

  override start() {
    // Initialize the door at the closed position.
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

    // Delay closing to let nearby players slip through.
    this.async.setTimeout(() => {
      if (this.playersInTrigger.size === 0) {
        this.closeDoor();
      }
    }, 8000); // Wait eight seconds before closing.
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

    // Snap to the target when the door is nearly aligned.
    if (distance < 0.01) {
      this.isMoving = false;
      door.position.set(this.targetPosition);
      return;
    }

    // Lerp toward the target to keep motion smooth.
    const newPosition = Vec3.lerp(currentPosition, this.targetPosition, this.props.speed * deltaTime);
    door.position.set(newPosition);
  }
}

Component.register(DoorController);
