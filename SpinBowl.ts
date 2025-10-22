import * as hz from 'horizon/core';

// This component makes an entity spin around its up axis
class SpinBowl extends hz.Component<typeof SpinBowl> {
  // Define the properties of this component, including their types and default values
  static propsDefinition = {
    degreesPerSecond: {type: hz.PropTypes.Number, default: 30} // Default spin speed
  };

  private initialRotation!: hz.Quaternion;

  // Initialize the angle property to 0
  angle: number = 0

  // Called before the component starts, used to set up event listeners
  preStart() {
    // Connect to the World.onUpdate event and call the onUpdate method when it's triggered
      this.connectLocalBroadcastEvent(hz.World.onUpdate, this.onUpdate.bind(this));
  }

  // Called when the component starts, currently empty
  start() {
      this.initialRotation = this.entity.rotation.get();
  }

  // Called every frame, updates the rotation of the entity based on the degreesPerSecond prop
    onUpdate(data: { deltaTime: number }) {
        // Increase the angle by the degrees per second multiplied by the delta time
        this.angle = (this.angle + (this.props.degreesPerSecond! * data.deltaTime)) % 360;

        // Set the rotation of the entity around its initial location and down axis
        const rotation = hz.Quaternion.fromAxisAngle(hz.Vec3.down, hz.degreesToRadians(this.angle));
        this.entity.rotation.set(rotation.mul(this.initialRotation));
    }
}

// Register the component with the Horizon engine
hz.Component.register(SpinBowl);