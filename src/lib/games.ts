import { eq, asc } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export type GameSortOption = 'title-asc' | 'title-desc' | 'rating-desc';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function compareText(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function compareGamesByTitle(a: Game, b: Game): number {
    return compareText(a.title, b.title);
}

/**
 * Sorts a list of games into a deterministic order.
 * Rated games appear before unrated games when sorting by rating, and the
 * fallback ordering is alphabetical by title so the output remains stable.
 *
 * @param gamesList - The games to sort.
 * @param sortBy - The requested ordering mode.
 * @returns A new array containing the games in the selected order.
 */
export function sortGames(gamesList: Game[], sortBy: GameSortOption = 'title-asc'): Game[] {
    return [...gamesList].sort((a, b) => {
        switch (sortBy) {
            case 'title-desc':
                return compareGamesByTitle(b, a);
            case 'rating-desc': {
                const hasRatingA = a.starRating !== null;
                const hasRatingB = b.starRating !== null;

                if (hasRatingA !== hasRatingB) {
                    return hasRatingA ? -1 : 1;
                }

                if (hasRatingA && hasRatingB) {
                    const ratingDelta = Number(b.starRating) - Number(a.starRating);
                    if (ratingDelta !== 0) {
                        return ratingDelta;
                    }
                }

                return compareGamesByTitle(a, b);
            }
            case 'title-asc':
            default:
                return compareGamesByTitle(a, b);
        }
    });
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All games ordered by the selected mode. */
export async function getAllGames(db: Database, sortBy: GameSortOption = 'title-asc'): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return sortGames(rows.map(mapGame), sortBy);
}

/** All game ids ordered by the selected mode. */
export async function getAllGameIds(db: Database, sortBy: GameSortOption = 'title-asc'): Promise<number[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    const allGames = rows.map(mapGame);
    return sortGames(allGames, sortBy).map((game) => game.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
