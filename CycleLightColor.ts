import * as hz from 'horizon/core';

/**
 * Cycles the hue of a dynamic light gizmo over a configurable interval.
 */
class CycleLightColor extends hz.Component<typeof CycleLightColor> {
  static propsDefinition = {
      /** Seconds required to complete a full hue rotation. */
      intervalHue: { type: hz.PropTypes.Number, default: 5 },
  };

  /** Normalized hue value tracked between frames. */
  private hue: number = 0;

  preStart() {
    // Pulse the hue whenever the world updates.
    this.connectLocalBroadcastEvent(hz.World.onUpdate, this.update.bind(this));
  }

  start() {
    const light = this.entity.as(hz.DynamicLightGizmo);
    if (!light) return;

    this.hue = Math.random();
    light.color.set(hz.Color.fromHSV(new hz.Vec3(this.hue, 1, 1)));
  }

  /** Updates the hue according to the elapsed time since the last frame. */
  update(data: { deltaTime: number }) {
    const light = this.entity.as(hz.DynamicLightGizmo);
    if (!light) return;

    this.hue = (this.hue + data.deltaTime / this.props.intervalHue!) % 1;
    light.color.set(hz.Color.fromHSV(new hz.Vec3(this.hue, 1, 1)));
  }
}

hz.Component.register(CycleLightColor);

