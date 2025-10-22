import * as hz from 'horizon/core';
import { Player } from 'horizon/core';
import { soundwaveBalanceChanged } from './shared-events-MBC25';

type ComponentProps = {
    leaderboardName?: string | null;
};

/** Syncs the persistent soundwave balance to a world leaderboard entry. */
class SoundwaveLeaderboard extends hz.Component<typeof SoundwaveLeaderboard> {
    static propsDefinition = {
        leaderboardName: {
            type: hz.PropTypes.String,
            default: 'SoundwaveManager:points',
        },
    };

    private readonly SOUNDWAVE_PPV = 'SoundwaveManager:points';

    override preStart(): void {
        // Push balance updates to the leaderboard as soon as they broadcast.
        this.connectLocalBroadcastEvent(
            soundwaveBalanceChanged,
            ({ playerName, balance }: { playerName: string; balance: number }) => {
                const player = this.world
                    .getPlayers()
                    .find(p => p.name.get() === playerName);
                if (!player) {
                    console.warn(
                        `[SoundwaveLeaderboard] Unable to find player ${playerName} for leaderboard update.`
                    );
                    return;
                }
                this.setScoreForPlayer(player, balance);
            }
        );

        // Initialize scores for players as they enter the world.
        const hostEntity = this.entity;
        if (hostEntity) {
            this.connectCodeBlockEvent(
                hostEntity,
                hz.CodeBlockEvents.OnPlayerEnterWorld,
                (player: Player) => this.syncPlayerScore(player)
            );
        }
    }

    override start(): void {
        // Align scores for any players who were already present when the script booted.
        for (const player of this.world.getPlayers()) {
            this.syncPlayerScore(player);
        }
    }

    /** Read the stored balance and push it to the leaderboard for the given player. */
    private syncPlayerScore(player: Player): void {
        const balance =
            this.world.persistentStorage.getPlayerVariable<number>(
                player,
                this.SOUNDWAVE_PPV
            ) ?? 0;
        this.setScoreForPlayer(player, balance);
    }

    /** Update the leaderboard entry for the provided player. */
    private setScoreForPlayer(player: Player, balance: number): void {
        const leaderboardName = (this.props as ComponentProps)?.leaderboardName || 'SoundwaveManager:points';
        if (!leaderboardName) {
            console.warn('[SoundwaveLeaderboard] Leaderboard name not defined.');
            return;
        }

        const leaderboards = this.world.leaderboards;
        if (!leaderboards || typeof leaderboards.setScoreForPlayer !== 'function') {
            console.warn('[SoundwaveLeaderboard] Leaderboards API unavailable.');
            return;
        }

        const sanitizedScore = this.sanitizeScore(balance);
        leaderboards.setScoreForPlayer(leaderboardName, player, sanitizedScore, true);
        console.log(
            `[SoundwaveLeaderboard] Set ${leaderboardName} score for ${player.name.get()} to ${sanitizedScore}.`
        );
    }

    /** Clamp leaderboard scores to the supported range. */
    private sanitizeScore(value: number): number {
        const maxScore =
            typeof (hz as unknown as { LEADEBOARD_SCORE_MAX_VALUE?: number }).LEADEBOARD_SCORE_MAX_VALUE === 'number'
                ? (hz as unknown as { LEADEBOARD_SCORE_MAX_VALUE: number }).LEADEBOARD_SCORE_MAX_VALUE
                : Number.MAX_SAFE_INTEGER;
        const clamped = Math.max(0, Math.min(Math.floor(value), maxScore));
        return clamped;
    }
}

hz.Component.register(SoundwaveLeaderboard);
