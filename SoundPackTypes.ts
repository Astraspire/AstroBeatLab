/**
 * Represents a single entry in a player's inventory.  At the moment
 * the only information we need to track for each unlocked MBC is its
 * unique pack identifier.  In the future you could extend this type
 * with additional metadata (e.g. unlock time, level requirements,
 * etc.).
 */
export type Inventory = {
    /** Unique identifier for the MBC25 variant (e.g. 'Lucky'). */
    packId: string;
};
