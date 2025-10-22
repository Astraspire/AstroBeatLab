import { LocalEvent, NetworkEvent, Player } from 'horizon/core';

/**
 * Event raised to request a specific MBC25 machine to become active
 * (for example, when swapping between variants).  Listeners can
 * respond by dropping the corresponding machine.  Contains the
 * identifier of the pack to activate.
 */
export const changeActiveMBC = new LocalEvent<{ packId: string }>(
    'changeActiveMachine'
);

/**
 * Event sent from unlock triggers to the inventory manager.  Carries
 * the player's name and the identifier of the pack that was just
 * unlocked.  The inventory manager will update persistent storage and
 * broadcast a drop event so the machine appears immediately.
 */
export const unlockMBC25 = new LocalEvent<{ playerName: string; packId: string }>(
    'playerUnlocksNewMBC25'
);

/**
 * Event used by trigger zones to ask the inventory system which
 * machines a player currently owns.  The inventory manager will
 * respond by printing the inventory (for debugging) and broadcasting
 * drop events for each owned pack.
 */
export const checkMBCInventory = new LocalEvent<{ playerId: Player }>(
    'checkPlayersInventoryOfMBCs'
);

/**
 * Event broadcast by the inventory manager to tell all MBC machines to
 * drop if they correspond to the given pack ID.  Each MBCDrop
 * component listens for this event and triggers its drop animation
 * when the pack ID matches its own configured `packId` property.
 */
export const dropMBC = new LocalEvent<{ packId: string }>(
    'drop correct MBC based on specification'
);

/**
 * Broadcast whenever a player's unlocked sound pack inventory changes so UIs
 * can refresh their displays or update available options.
 */
export const inventoryUpdated = new LocalEvent<{ playerName: string }>(
    'soundPackInventoryUpdated'
);

/**
 * Event raised by the UI or other gameplay systems to request that a
 * specific MBC25 machine become the sole active beat machine.  The
 * {@link MBCManager} listens for this event to coordinate which
 * machine is currently in use.  The payload includes the pack
 * identifier to activate and the name of the player making the
 * request.  If a machine is already active for another player, the
 * request may be ignored.
 */
export const requestMBCActivation = new LocalEvent<{ playerName: string; packId: string }>(
    'requestMBC25Activation'
);

/**
 * Event raised when a player relinquishes control of the active
 * MBC25 beat machine.  When this event is received, the
 * {@link MBCManager} will clear its internal lock and despawn any
 * currently active machine so that another player may claim a new
 * one.  The payload simply carries the name of the player giving up
 * control; if the player does not currently control the machine the
 * event has no effect.
 */
export const relinquishMBC = new LocalEvent<{ playerName: string }>(
    'relinquishActiveMBC25'
);

/**
 * Broadcast whenever the player controlling the active machine changes.
 * Payload contains the new performer's name or null if no one owns the
 * machine.  This allows other systems to react to performer swaps.
 */
export const activePerformerChanged = new LocalEvent<{ playerName: string | null }>(
    'activePerformerChanged'
);


/**
 * Broadcast whenever the player controlling the UI system changes.
 * Payload contains the new owner's name or null if no one owns the
 * stroe ui.  This allows the store ui to display information for 
 * whichever player clicks refresh last.
 */
export const uiOwnerChanged = new LocalEvent<{ playerName: string | null }>(
    'activeShopperChanged'
);


/**
 * Event raised when a player attempts to purchase a sound pack using
 * soundwave points via the store UI.
 */
export const purchasePackWithSoundwaves = new LocalEvent<{
    playerName: string;
    packId: string;
    cost: number;
}>(
    'purchasePackWithSoundwaves'
);

/**
 * Fired whenever a player's soundwave balance is updated so UI elements
 * can refresh their displays.
 */
export const soundwaveBalanceChanged = new LocalEvent<{
    playerName: string;
    balance: number;
}>(
    'soundwaveBalanceChanged'
);

/**
 * Request to open the soundwave store UI for a specific player.
 */
export const openSoundwaveStore = new LocalEvent<{ player: Player }>(
    'openSoundwaveStoreUI'
);

///**
// * Request to close the soundwave store UI for a specific player.
// */
//export const closeSoundwaveStore = new LocalEvent<{ player: Player }>(
//    'closeSoundwaveStoreUI'
//);

/**
 * Broadcast when the MBC25 machine starts or stops playing loops so
 * other systems can react to audible music state.
 */
export const machinePlayState = new LocalEvent<{ isPlaying: boolean }>(
    'mbc25MachinePlayState'
);

