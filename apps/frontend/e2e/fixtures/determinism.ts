import { expect, test as base, type Page } from '@playwright/test';

/** Fixed browser clock used by the deterministic fixture (2024-01-01T00:00:00Z). */
export const FIXED_TIME = new Date('2024-01-01T00:00:00.000Z');

/** Default seed for `Math.random` in the browser. */
export const DEFAULT_BROWSER_SEED = 0x5eed1234;

/**
 * Override `Math.random` in the page with the same mulberry32 sequence used by
 * `SeededRandom` in `@brain-storm/types/test-utils`, so browser and Node tests
 * can produce identical values for a given seed.
 */
export async function seedRandomness(
  page: Page,
  seed: number = DEFAULT_BROWSER_SEED
): Promise<void> {
  await page.addInitScript((initialSeed: number) => {
    let state = initialSeed >>> 0 || 0x5eed1234;
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

/** Freeze the page clock using Playwright's clock API. */
export async function freezeTime(page: Page, time: Date = FIXED_TIME): Promise<void> {
  await page.clock.install({ time });
}

export interface DeterministicFixtures {
  /** A page with a frozen clock and seeded `Math.random`. */
  deterministicPage: Page;
}

/**
 * Extended `test` with a deterministic page.
 *
 * ```ts
 * import { test, expect, FIXED_TIME } from './fixtures/determinism';
 *
 * test('renders a stable timestamp', async ({ deterministicPage }) => {
 *   await deterministicPage.goto('/');
 *   await expect(deterministicPage.getByTestId('now')).toHaveText(FIXED_TIME.toISOString());
 * });
 * ```
 *
 * Both installers run before the first navigation; no app code needs to know
 * about them.
 */
export const test = base.extend<DeterministicFixtures>({
  deterministicPage: async ({ page }, use) => {
    await seedRandomness(page);
    await freezeTime(page);
    await use(page);
  },
});

export { expect };
