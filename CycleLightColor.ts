import { Entity } from 'horizon/core';
import * as hz from 'horizon/core';

// This component cycles the hue of a dynamic light gizmo's color over a specified interval
class CycleLightColor extends hz.Component<typeof CycleLightColor> {
  // Define the properties that this component expects to receive
  static propsDefinition = {
      intervalHue: { type: hz.PropTypes.Number, default: 5 } // The interval in seconds to cycle the hue
  };

    // The current hue value
    private hue: number = 0;

    // Called before the component starts, used to set up event listeners
  preStart() {
    // Listen for the world's update event and call the update method when it occurs
    this.connectLocalBroadcastEvent(hz.World.onUpdate, this.update.bind(this))
  }

  // Called when the component starts
  start() {
    // Get the dynamic light gizmo from the component's properties
    const light = this.entity.as(hz.DynamicLightGizmo);
    if (!light) return; // Only execute if a dynamic light gizmo is referenced

    this.hue = Math.random();

    // Initialize the light's color to the starting hue
    light.color.set(hz.Color.fromHSV(new hz.Vec3(this.hue, 1, 1)));
  }

  // Called every frame, updates the dynamic light's color based on the interval
  update(data: {deltaTime: number}) {
    // Get the dynamic light gizmo from the component's properties
    const light = this.entity?.as(hz.DynamicLightGizmo);
    if (!light) return; // Only execute if a dynamic light gizmo is referenced

        // Increment the hue based on the interval and delta time
        this.hue = (this.hue + (data.deltaTime / this.props.intervalHue!)) % 1;

        // Update the light's color with the new hue
        light.color.set(hz.Color.fromHSV(new hz.Vec3(this.hue, 1, 1)));
  }
}

// Register the component with Horizon
hz.Component.register(CycleLightColor);