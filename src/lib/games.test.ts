import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    sortGames,
    type GameSortOption,
} from './games';

async function seedGames(db: Database, entries: Array<{ title: string; starRating?: number | null }>): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    for (const entry of entries) {
        await db.insert(games).values({
            title: entry.title,
            description: `Description ${entry.title}`,
            starRating: entry.starRating ?? null,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, [
            { title: 'Game 03', starRating: 4.2 },
            { title: 'Game 01', starRating: 4.7 },
            { title: 'Game 02', starRating: 4.5 },
        ]);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('orders games by title descending when requested', async () => {
        await seedGames(db, [
            { title: 'Game 01', starRating: 4.2 },
            { title: 'Game 03', starRating: 4.5 },
            { title: 'Game 02', starRating: 4.7 },
        ]);

        const all = await getAllGames(db, 'title-desc');
        expect(all.map((g) => g.title)).toEqual(['Game 03', 'Game 02', 'Game 01']);
    });

    it('orders games by rating descending and keeps unrated games last', async () => {
        await seedGames(db, [
            { title: 'Game 01', starRating: 3.5 },
            { title: 'Game 03', starRating: null },
            { title: 'Game 02', starRating: 4.9 },
            { title: 'Game 04', starRating: 4.9 },
        ]);

        const all = await getAllGames(db, 'rating-desc');
        expect(all.map((g) => g.title)).toEqual(['Game 02', 'Game 04', 'Game 01', 'Game 03']);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, [
            { title: 'Game 03' },
            { title: 'Game 01' },
            { title: 'Game 02' },
        ]);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, [
            { title: 'Game 02' },
            { title: 'Game 01' },
        ]);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, [
            { title: 'Game 02' },
            { title: 'Game 01' },
        ]);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('sorts a list in a deterministic fallback order when there are no ratings', () => {
        const items = [
            { id: 1, title: 'Game B', description: 'desc', starRating: null, category: null, publisher: null },
            { id: 2, title: 'Game A', description: 'desc', starRating: null, category: null, publisher: null },
            { id: 3, title: 'Game C', description: 'desc', starRating: null, category: null, publisher: null },
        ];

        expect(sortGames(items, 'rating-desc').map((game) => game.title)).toEqual(['Game A', 'Game B', 'Game C']);
    });

    it.each<GameSortOption>(['title-asc', 'title-desc', 'rating-desc'])('accepts the %s sort option', (sortMode) => {
        const items = [
            { id: 1, title: 'Game B', description: 'desc', starRating: 4.2, category: null, publisher: null },
            { id: 2, title: 'Game A', description: 'desc', starRating: null, category: null, publisher: null },
        ];

        expect(() => sortGames(items, sortMode)).not.toThrow();
    });
});
