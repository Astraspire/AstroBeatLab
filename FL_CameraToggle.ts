/////////////////////////////////////////////////////////////////////////////////////////
// 1st & 3rd person camera button toggle script - v0.1a
// by free.light - 09/12/2025 - https://github.com/iamfreelight
/////////////////////////////////////////////////////////////////////////////////////////

import * as hz from 'horizon/core';
import {
  CodeBlockEvents,
  PropTypes,
  Player
} from 'horizon/core';

import LocalCamera, { CameraTransitionOptions, Easing } from 'horizon/camera';

class FL_CameraToggleLocal extends hz.Component<typeof FL_CameraToggleLocal, {}> {
  static executionMode = 'local';
  static propsDefinition = {
    useFirstPerson: { type: hz.PropTypes.Boolean, default: true },
    debugMode: { type: PropTypes.Boolean, default: false },
  };

  start() {
    this.connectCodeBlockEvent(
      this.entity,
      hz.CodeBlockEvents.OnPlayerEnterTrigger,
      (player: Player) => this.onTriggerEnter(player)
    );
  }

  private onTriggerEnter(player: Player) {
    const localPlayer = this.world.getLocalPlayer();

    if (this.props.debugMode) {
      console.log(`[FL_CameraToggleLocal] Trigger fired by ${player.name?.get() ?? 'Unknown'}`);
    }

    // Apply camera immediately if local player entered
    if (player.id === localPlayer.id) {
      if (this.props.debugMode) console.log("[FL_CameraToggleLocal] Local player triggered, toggling camera");
      this.applyCameraMode();
    }

    // Request ownership so we also get ownership events
    this.entity.owner.set(player);
  }

  // Called when ownership is gained/lost due to network updates
  receiveOwnership(state: any, fromPlayer: Player, toPlayer: Player) {
    const localPlayer = this.world.getLocalPlayer();

    if (toPlayer.id === localPlayer.id) {
      if (this.props.debugMode) console.log("[FL_CameraToggleLocal] Gained ownership");
      this.applyCameraMode();
    } else if (fromPlayer?.id === localPlayer.id) {
      if (this.props.debugMode) console.log("[FL_CameraToggleLocal] Lost ownership");
      // optional: could reset camera here if desired
    }
  }

  transferOwnership(fromPlayer: Player, toPlayer: Player) {
    const localPlayer = this.world.getLocalPlayer();

    if (this.props.debugMode) {
      console.log(`[FL_CameraToggleLocal] Ownership transferred from ${fromPlayer?.name?.get() ?? "Unknown"} to ${toPlayer?.name?.get() ?? "Unknown"}`);
    }

    if (toPlayer.id === localPlayer.id) {
      this.applyCameraMode();
    } else if (fromPlayer?.id === localPlayer.id) {
      // optional: could reset camera here
    }

    return {};
  }

  private applyCameraMode() {
    const options: CameraTransitionOptions = {
      duration: 0.01,
      easing: Easing.EaseInOut,
    };

    if (this.props.useFirstPerson) {
      if (this.props.debugMode) console.log("[FL_CameraToggleLocal] Switched Cam Mode: 1st");
      LocalCamera.setCameraModeFirstPerson(options);
    } else {
      if (this.props.debugMode) console.log("[FL_CameraToggleLocal] Switched Cam Mode: 3rd");
      LocalCamera.setCameraModeThirdPerson(options);
    }
  }
}

hz.Component.register(FL_CameraToggleLocal);
