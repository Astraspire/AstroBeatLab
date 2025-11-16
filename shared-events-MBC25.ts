import { LocalEvent, NetworkEvent, Player } from 'horizon/core';

/**
 * Fires when a system asks for a specific MBC25 machine to become the visible variant.
 * Listeners compare the provided packId and drop or hide themselves as needed.
 */
export const changeActiveMBC = new LocalEvent<{ packId: string }>(
    'changeActiveMachine'
);

/**
 * Carries a freshly unlocked packId from a trigger to the inventory manager.
 * The manager persists the unlock, then broadcasts drop events so the machine appears.
 */
export const unlockMBC25 = new LocalEvent<{ playerName: string; packId: string }>(
    'playerUnlocksNewMBC25'
);

/**
 * Requests a dump of the caller's unlocked machines.
 * The inventory manager responds with console logs and drop events per owned pack.
 */
export const checkMBCInventory = new LocalEvent<{ playerId: Player }>(
    'checkPlayersInventoryOfMBCs'
);

/**
 * Broadcast instructing any MBC machine with a matching packId to spawn in.
 * MBCDrop components listen for this to animate their machines onto the stage.
 */
export const dropMBC = new LocalEvent<{ packId: string }>(
    'drop correct MBC based on specification'
);

/**
 * Notifies UI layers that a player's unlocked pack set changed and they should refresh.
 */
export const inventoryUpdated = new LocalEvent<{ playerName: string }>(
    'soundPackInventoryUpdated'
);

/**
 * Sent when a player wants to claim the active MBC25 machine for a specific pack.
 * MBCManager arbitrates competing requests using this event.
 */
export const requestMBCActivation = new LocalEvent<{ playerName: string; packId: string }>(
    'requestMBC25Activation'
);

/**
 * Unlocks if controlling player is not in world when called.
 * MBCManager clears its lock and hides the machine when this fires.
 */
export const relinquishMBC = new LocalEvent<{ playerName: string | null}>(
    'relinquishActiveMBC25'
);

/**
 * Asks if the named player is done performing so the active inventory can unlock.
 * MBCManager clears its lock and hides the machine when this fires.
 */
// DEPRECATED
// export const askToRelinquishMBC = new LocalEvent<{ playerName: string }>(
//     'attemptToRelinquishActiveMBC25'
// );

/**
 * Broadcast whenever performer ownership changes.
 * Payload includes the performer name or null so other systems can react.
 */
export const activePerformerChanged = new LocalEvent<{ playerName: string | null }>(
    'activePerformerChanged'
);


/**
 * Broadcast whenever the store UI should consider a different player as its owner.
 * Payload carries the shopper's name or null so the panel knows whose data to show.
 */
export const uiOwnerChanged = new LocalEvent<{ playerName: string | null }>(
    'activeShopperChanged'
);


/**
 * Fired when the store UI submits a soundwave purchase for a pack.
 * Payload contains the buyer name, packId, and cost.
 */
export const purchasePackWithSoundwaves = new LocalEvent<{
    playerName: string;
    packId: string;
    cost: number;
}>(
    'purchasePackWithSoundwaves'
);

/**
 * Broadcast whenever a player's soundwave balance changes so HUDs can update.
 */
export const soundwaveBalanceChanged = new LocalEvent<{
    playerName: string;
    balance: number;
}>(
    'soundwaveBalanceChanged'
);

/**
 * Requests that the store UI become visible for the provided player reference.
 */
export const openSoundwaveStore = new LocalEvent<{ player: Player }>(
    'openSoundwaveStoreUI'
);

// Request definition retained for potential close-store support.
// export const closeSoundwaveStore = new LocalEvent<{ player: Player }>(
//     'closeSoundwaveStoreUI'
// );

/**
 * Broadcast when the MBC25 starts or stops playback so dependent systems can react.
 */
export const machinePlayState = new LocalEvent<{ isPlaying: boolean }>(
    'mbc25MachinePlayState'
);
