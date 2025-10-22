import * as hz from 'horizon/core';

class SoftHover extends hz.Component<typeof SoftHover> {
  static propsDefinition = {
    height: { type: hz.PropTypes.Number, default: 0.1 },
    speed: { type: hz.PropTypes.Number, default: 1 },
  };

  initialPosition!: hz.Vec3;
  timer: number = 0;

  start() {
    this.initialPosition = this.entity.position.get();
    this.connectLocalBroadcastEvent(hz.World.onUpdate, this.update.bind(this));
  }

  update(data: { deltaTime: number }) {
    this.timer += data.deltaTime * this.props.speed!;
    const offset = Math.sin(this.timer) * this.props.height!;
    this.entity.position.set(this.initialPosition.add(new hz.Vec3(0, offset, 0)));
  }
}

hz.Component.register(SoftHover);