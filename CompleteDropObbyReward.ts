import { CodeBlockEvents, Component, InWorldQuest, Player } from 'horizon/core';
import * as hz from "horizon/core";
import { inventoryUpdated } from "./shared-events-MBC25";
import { PACK_ID_BITS } from "./PackIdBitmask";
import { NotificationEvent } from "UI_SimpleButtonEvent";

/**
 * Persistent variable key storing each player's unlocked pack bitmask.
 * Horizon Worlds keeps these values across sessions, allowing us to rebuild the
 * runtime inventory UI the next time the player joins.
 */
const SOUND_PACKS_PPV = "MBC25Inventory:unlockedSoundPacks";

class CompleteDropObbyReward extends Component<typeof CompleteDropObbyReward>{
  static propsDefinition = {
    notificationManager: { type: hz.PropTypes.Entity, default: null },
  };

  beatTheCourse: Player[] = [];
  
  /**
   * Resolves the Player object matching the provided display name.
   * Many Horizon events surface player names as strings; this helper maps them back.
   */
  private findPlayerByName(playerName: string): Player | null {
      return (
          this.world
              .getPlayers()
              .find(p => p.name.get() === playerName)
          ?? null
      );
  }

  /**
   * Unlocks the specified pack for the player and notifies dependent systems.
   * Updates the stored bitmask, emits inventory update events, and triggers drop checks.
   */
  private unlockSoundPack(playerName: string, packId: string): void {
      const player = this.findPlayerByName(playerName);
      let playerToNotify: Player[] = [];
      if (!player) return;
      const bit = PACK_ID_BITS[packId];
      if (bit === undefined) return;
      let mask = this.world.persistentStorage.getPlayerVariable<number>(
          player,
          SOUND_PACKS_PPV
      ) ?? 0;
      if ((mask & bit) === 0) {
          mask |= bit;
          this.world.persistentStorage.setPlayerVariable(
              player,
              SOUND_PACKS_PPV,
              mask
          );
          // Let UI layers know they should refresh their inventory view.
          this.sendLocalBroadcastEvent(inventoryUpdated, { playerName });
          playerToNotify.push(player);
          this.triggerUiNotification(
            "Congratulations! You've just unlocked the FlowState MBC25!",
            playerToNotify
            );
          playerToNotify.pop();
          this.beatTheCourse.push(player);
      } else {
          if (this.beatTheCourse.includes(player)) {
            return;
          }
          playerToNotify.push(player);
          this.triggerUiNotification(
            "Interstellar! You've just completed the Orbital Drop-stacle Course!",
            playerToNotify
          );
          playerToNotify.pop();
          this.beatTheCourse.push(player);
      }
  }
  
  /**
   * Trigger the UI notification pop-up for the given recipients. When no recipients are provided the
   * message is shown to everyone in the world. Falls back to logging when the manager is not available.
   */
  private triggerUiNotification(message: string, recipients?: hz.Player[]): void {
      const targets =
          recipients && recipients.length > 0 ? recipients : this.world.getPlayers();
      for (const target of targets) {
          console.log(`[Notification to ${target.name.get()}] ${message}`);
      }

      const payload = {
          message,
          players: targets,
          imageAssetId: null as string | null,
      };

      if (this.props.notificationManager) {
          this.sendLocalEvent(this.props.notificationManager, NotificationEvent, payload);
      }

      this.sendLocalBroadcastEvent(NotificationEvent, payload);
  }

  OnPlayerEnterTrigger(player: Player) {
    const ODO_COMPLETE = "ODO_Complete";

    this.unlockSoundPack(player.name.get(), "MBC25-FLOWSTATE");
    player.setAchievementComplete(ODO_COMPLETE, true);
  }

  preStart() {
    this.connectCodeBlockEvent(
      this.entity, 
      CodeBlockEvents.OnPlayerEnterTrigger, 
      this.OnPlayerEnterTrigger.bind(this)
    );
  }

  start() {
  }

}
Component.register(CompleteDropObbyReward);