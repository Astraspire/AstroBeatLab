/**
 * Utilities for encoding unlocked pack identifiers into a numeric bitmask so
 * that Horizon's persistent storage can store the data as a single number.
 */

/** Mapping of pack identifiers to individual bit positions. */
export const PACK_ID_BITS: Record<string, number> = {
    'MBC25-LUCKY': 1 << 0,
    'MBC25-SOMETA': 1 << 1,
    'MBC25-PHONK-E-CHEESE': 1 << 2,
};

/** Default packs that should always be unlocked for players. */
export const DEFAULT_PACK_IDS = ['MBC25-SOMETA'];

/** Convert a bitmask value into a list of packId records. */
export function maskToPackList(mask: number): Array<{ packId: string }> {
    const list: Array<{ packId: string }> = [];
    for (const [id, bit] of Object.entries(PACK_ID_BITS)) {
        if ((mask & bit) !== 0) {
            list.push({ packId: id });
        }
    }
    return list;
}

/** Convert a list of packId records into a bitmask value. */
export function packListToMask(list: Array<{ packId: string }>): number {
    let mask = 0;
    for (const { packId } of list) {
        const bit = PACK_ID_BITS[packId];
        if (bit !== undefined) {
            mask |= bit;
        }
    }
    return mask;
}

/** Ensure the given mask includes the default packs. */
export function addDefaultPacks(mask: number): number {
    for (const id of DEFAULT_PACK_IDS) {
        const bit = PACK_ID_BITS[id];
        if (bit !== undefined) {
            mask |= bit;
        }
    }
    return mask;
}
