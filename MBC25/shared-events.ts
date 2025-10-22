import { LocalEvent } from 'horizon/core';

/** Request to stop all loops on the specified channel. */
export const stopRowEvent = new LocalEvent<{ channelId: number }>(
    'sendStopCommandToRow'
);
/** Trigger a loop section to begin playing on a channel. */
export const loopTriggerEvent = new LocalEvent<{ channelId: number, loopSectionId: number }>(
    'sendLoopTriggerEvent'
);

/** Reset a specific loop button back to its idle color. */
export const offlineColorChangeEvent = new LocalEvent<{ channel: number, loopId: number }>(
    'setColorDefaultEvent'
);

/** Force a loop button to idle color regardless of current state. */
export const hardOfflineColorChangeEvent = new LocalEvent<{ channel: number, loopId: number }>(
    'hardSetColorDefaultEvent'
);

/** Mark a loop button as currently playing. */
export const playingColorChangeEvent = new LocalEvent<{ channel: number, loopId: number }>(
    'setColorToNowPlaying'
);

/** Highlight a loop button as queued to play on the next measure. */
export const upcomingLoopColorChangedEvent = new LocalEvent<{ channel: number, loopId: number }>(
    'setColorBackToUpcoming'
);

// Broadcast when the machine transitions between idle and actively
// playing loops.  Other systems listen to know when music is audible.
export const machinePlayState = new LocalEvent<{ isPlaying: boolean }>(
    'mbc25MachinePlayState'
);
