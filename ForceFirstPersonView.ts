import { Entity } from 'horizon/core';
import * as hz from 'horizon/core';
import LocalCamera from 'horizon/camera';

class ForceFirstPersonView extends hz.Component<typeof ForceFirstPersonView> {
  static propsDefinition = {
    spawnPoint: { type: hz.PropTypes.Entity },
  };

  start() {
    const spawnPoint = this.props.spawnPoint?.as(hz.SpawnPointGizmo);
    if (!spawnPoint) return;

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player: hz.Player) => {
      if (player.deviceType.get() === hz.PlayerDeviceType.Mobile) {
        spawnPoint.teleportPlayer(player);
        const rotation = spawnPoint.rotation.get();
        LocalCamera.setCameraModeFixed({ position: spawnPoint.position.get(), rotation });
      }
    });
  }
}

hz.Component.register(ForceFirstPersonView);