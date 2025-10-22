/**
 * Inventory record describing an unlocked MBC25 pack.
 * Extend with additional metadata (unlock time, requirements, etc.) as features grow.
 */
export type Inventory = {
    /** Unique pack identifier (e.g. 'MBC25-LUCKY'). */
    packId: string;
};
