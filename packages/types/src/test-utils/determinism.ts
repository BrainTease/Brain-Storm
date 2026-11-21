/**
 * Deterministic time and randomness helpers for tests (#1531).
 *
 * These utilities are framework-agnostic on purpose: the same helpers are used
 * from Vitest (frontend), Jest (backend / packages) and can be paired with the
 * Playwright fixture in `apps/frontend/e2e/fixtures/determinism.ts`.
 *
 * Nothing here touches the global environment until `install*` / `with*` is
 * called, and every installer returns a restore function so tests stay
 * independent of each other.
 */

/** Default fixed instant: 2024-01-01T00:00:00.000Z. */
export const DEFAULT_EPOCH_MS = Date.UTC(2024, 0, 1, 0, 0, 0, 0);

/** Default deterministic PRNG seed. */
export const DEFAULT_SEED = 0x5eed1234;

export interface Clock {
  now(): number;
  toDate(): Date;
}

export type TimeInput = number | Date;

function toMillis(time: TimeInput): number {
  const value = time instanceof Date ? time.getTime() : time;
  if (!Number.isFinite(value)) {
    throw new TypeError(`Invalid test clock time: ${String(time)}`);
  }
  return Math.trunc(value);
}

/**
 * A manually advanced clock. Use it directly for pure code, or with
 * `installFrozenDate` / Jest's `jest.setSystemTime(clock.now())`.
 */
export class FakeClock implements Clock {
  private currentMs: number;

  constructor(start: TimeInput = DEFAULT_EPOCH_MS) {
    this.currentMs = toMillis(start);
  }

  now(): number {
    return this.currentMs;
  }

  toDate(): Date {
    return new Date(this.currentMs);
  }

  get iso(): string {
    return this.toDate().toISOString();
  }

  /** Move the clock forward by `ms` (must be a finite, non-negative number). */
  advance(ms: number): this {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError(`advance(ms) expects a finite, non-negative number, got ${ms}`);
    }
    this.currentMs += Math.trunc(ms);
    return this;
  }

  /** Jump to an absolute instant. */
  set(time: TimeInput): this {
    this.currentMs = toMillis(time);
    return this;
  }

  reset(start: TimeInput = DEFAULT_EPOCH_MS): this {
    return this.set(start);
  }
}

interface DateGlobal {
  Date: DateConstructor;
}

/**
 * Replace `Date` (constructor + `Date.now`) with a clock-backed constructor.
 * Returns a restore function; safe to call from `afterEach`/`finally`.
 */
export function installFrozenDate(
  clock: Clock,
  target: DateGlobal = globalThis as unknown as DateGlobal
): () => void {
  const RealDate = target.Date;

  const FrozenDate = function (this: unknown, ...args: unknown[]): Date {
    if (args.length === 0) {
      return new RealDate(clock.now());
    }
    return Reflect.construct(RealDate, args) as Date;
  } as unknown as DateConstructor;

  FrozenDate.now = () => clock.now();
  FrozenDate.parse = RealDate.parse;
  FrozenDate.UTC = RealDate.UTC;
  (FrozenDate as { prototype: Date }).prototype = RealDate.prototype;

  target.Date = FrozenDate;
  return () => {
    target.Date = RealDate;
  };
}

/**
 * Small, fast, seedable PRNG (mulberry32). The same seed always produces the
 * same sequence across runs, platforms and CI workers.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = DEFAULT_SEED) {
    // mulberry32 requires a non-zero 32-bit state.
    this.state = (seed >>> 0) || DEFAULT_SEED;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`int(min, max) expects integers with min <= max, got ${min}, ${max}`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  bool(probability = 0.5): boolean {
    if (!(probability >= 0 && probability <= 1)) {
      throw new RangeError(`bool(probability) expects 0 <= probability <= 1, got ${probability}`);
    }
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('pick(items) expects a non-empty array');
    }
    // `int` keeps the index within bounds, so the assertion is safe.
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) {
      throw new RangeError('pick(items) produced an out-of-range index');
    }
    return item;
  }

  /** Fisher–Yates shuffle. Does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const current = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = current;
    }
    return copy;
  }

  /** Derive an independent stream, e.g. one per test file or fixture. */
  fork(label: string): SeededRandom {
    let hash = 2166136261;
    for (let i = 0; i < label.length; i += 1) {
      hash ^= label.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return new SeededRandom((this.state ^ hash) >>> 0);
  }
}

interface RandomGlobal {
  random(): number;
}

/**
 * Replace `Math.random` with a seeded generator.
 * Returns the generator and a restore function.
 */
export function installSeededRandom(
  seed: number = DEFAULT_SEED,
  target: RandomGlobal = Math
): { random: SeededRandom; restore: () => void } {
  const original = target.random;
  const random = new SeededRandom(seed);
  target.random = () => random.next();
  return {
    random,
    restore: () => {
      target.random = original;
    },
  };
}

export interface DeterministicHarness {
  clock: FakeClock;
  random: SeededRandom;
  restore: () => void;
}

/**
 * Install a frozen `Date` and seeded `Math.random` at once.
 * Always call `restore()` (prefer `try/finally` or `afterEach`).
 */
export function installDeterminism(
  options: { now?: TimeInput; seed?: number } = {}
): DeterministicHarness {
  const clock = new FakeClock(options.now ?? DEFAULT_EPOCH_MS);
  const { random, restore: restoreRandom } = installSeededRandom(options.seed ?? DEFAULT_SEED);
  const restoreDate = installFrozenDate(clock);

  return {
    clock,
    random,
    restore: () => {
      restoreDate();
      restoreRandom();
    },
  };
}

/** Run `fn` with a frozen clock, restoring the real `Date` afterwards. */
export function withFakeClock<T>(clock: Clock, fn: () => T): T {
  const restore = installFrozenDate(clock);
  try {
    return fn();
  } finally {
    restore();
  }
}

/** Run `fn` with seeded `Math.random`, restoring the original afterwards. */
export function withSeededRandom<T>(seed: number, fn: (random: SeededRandom) => T): T {
  const { random, restore } = installSeededRandom(seed);
  try {
    return fn(random);
  } finally {
    restore();
  }
}

/** Run `fn` with both deterministic time and randomness installed. */
export function withDeterminism<T>(
  options: { now?: TimeInput; seed?: number },
  fn: (harness: DeterministicHarness) => T
): T {
  const harness = installDeterminism(options);
  try {
    return fn(harness);
  } finally {
    harness.restore();
  }
}
