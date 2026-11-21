import {
  DEFAULT_EPOCH_MS,
  DEFAULT_SEED,
  FakeClock,
  SeededRandom,
  installDeterminism,
  withDeterminism,
} from '@brain-storm/types/test-utils';
import { describe, expect, it } from 'vitest';

describe('shared determinism utilities (frontend)', () => {
  it('freezes time for the duration of a test', () => {
    expect(Date.now()).not.toBe(DEFAULT_EPOCH_MS);

    const harness = installDeterminism({ now: DEFAULT_EPOCH_MS, seed: DEFAULT_SEED });
    try {
      expect(Date.now()).toBe(DEFAULT_EPOCH_MS);
      expect(new Date().toISOString()).toBe('2024-01-01T00:00:00.000Z');
      harness.clock.advance(60_000);
      expect(new Date().toISOString()).toBe('2024-01-01T00:01:00.000Z');
    } finally {
      harness.restore();
    }

    expect(new FakeClock().now()).toBe(DEFAULT_EPOCH_MS);
  });

  it('generates repeatable fixture data', () => {
    const build = (): string[] => {
      const random = new SeededRandom(DEFAULT_SEED);
      return Array.from({ length: 5 }, () => `user-${random.int(1, 10_000)}`);
    };

    expect(build()).toEqual(build());
  });

  it('restores globals when the body throws', () => {
    const realNow = Date.now;
    const originalRandom = Math.random;

    expect(() =>
      withDeterminism({ now: 1_000 }, () => {
        throw new Error('expected');
      })
    ).toThrow('expected');

    expect(Date.now).toBe(realNow);
    expect(Math.random).toBe(originalRandom);
  });

  it('advances each seeded stream independently', () => {
    const first = new SeededRandom(11);
    const second = new SeededRandom(11);

    expect(first.next()).toBe(second.next());
    first.next();
    expect(first.next()).not.toBe(second.next());
  });
});
