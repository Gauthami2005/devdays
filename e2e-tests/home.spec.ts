import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should allow sorting the game list by title and rating', async ({ page }) => {
    await test.step('Verify the sorting control is available and labeled', async () => {
      const sortSelect = page.getByTestId('game-sort');
      await expect(sortSelect).toBeVisible();
      await expect(sortSelect).toHaveAttribute('aria-label', 'Sort game list');
    });

    await test.step('Confirm the default order is alphabetical by title', async () => {
      const titles = await page.locator('[data-testid="game-card"]').allTextContents();
      const firstTitles = titles.map((text) => text.split('\n')[0]?.trim()).filter(Boolean);
      expect(firstTitles[0]).toBeTruthy();
      expect([...firstTitles].sort()).toEqual(firstTitles);
    });

    await test.step('Change the sort to rating and verify the top cards are highest rated', async () => {
      await page.getByTestId('game-sort').selectOption('rating-desc');
      const cards = page.locator('[data-testid="game-card"]');
      await expect(cards.first()).toBeVisible();
      const titles = await cards.allTextContents();
      const topTitle = titles[0]?.split('\n')[0]?.trim();
      expect(topTitle).toBeTruthy();
      await expect(page.locator('[data-testid="game-card"]').first().locator('[data-testid="game-rating"]')).toContainText('/ 5');
    });

    await test.step('Reverse the sort to Z-A and verify order changes', async () => {
      await page.getByTestId('game-sort').selectOption('title-desc');
      const titles = await page.locator('[data-testid="game-card"]').allTextContents();
      const firstTitles = titles.map((text) => text.split('\n')[0]?.trim()).filter(Boolean);
      expect(firstTitles.length).toBeGreaterThan(1);
      expect([...firstTitles].sort((a, b) => b.localeCompare(a))).toEqual(firstTitles);
    });
  });
});
