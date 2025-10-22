import { Component, PropTypes, Entity, Vec3, Quaternion, World } from 'horizon/core';

class CircularMotion extends Component<typeof CircularMotion> {
  static propsDefinition = {
    radius: { type: PropTypes.Number, default: 5 },
    speed: { type: PropTypes.Number, default: 1 },
    axis: { type: PropTypes.Vec3, default: new Vec3(0, 1, 0) },
    center: { type: PropTypes.Vec3, default: new Vec3(0, 0, 0) }
  };

  private angle: number = 0;

  start() {
    this.connectLocalBroadcastEvent(World.onUpdate, (data: { deltaTime: number }) => {
      this.updatePosition(data.deltaTime);
    });
  }

  updatePosition(deltaTime: number) {
    const radius = this.props.radius!;
    const speed = this.props.speed!;
    const axis = this.props.axis!;
    const center = this.props.center!;

    this.angle += speed * deltaTime;
    const offset = new Vec3(
      radius * Math.cos(this.angle),
      0,
      radius * Math.sin(this.angle)
    );

    const rotation = Quaternion.fromAxisAngle(axis.normalize(), this.angle);
    const newPosition = Quaternion.mulVec3(rotation, offset).add(center);

    this.entity.position.set(newPosition);
  }
}

Component.register(CircularMotion);