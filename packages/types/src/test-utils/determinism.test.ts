import {
  DEFAULT_EPOCH_MS,
  DEFAULT_SEED,
  FakeClock,
  installDeterminism,
  installFrozenDate,
  installSeededRandom,
  SeededRandom,
  withDeterminism,
  withFakeClock,
  withSeededRandom,
} from './determinism';

describe('FakeClock', () => {
  it('starts at a fixed instant by default', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(DEFAULT_EPOCH_MS);
    expect(clock.iso).toBe('2024-01-01T00:00:00.000Z');
  });

  it('advances and jumps without leaking between instances', () => {
    const clock = new FakeClock(1_000);
    clock.advance(500);
    expect(clock.now()).toBe(1_500);
    clock.set(new Date(9_000));
    expect(clock.now()).toBe(9_000);
    expect(new FakeClock().now()).toBe(DEFAULT_EPOCH_MS);
  });

  it('rejects negative advances and invalid instants', () => {
    const clock = new FakeClock();
    expect(() => clock.advance(-1)).toThrow(RangeError);
    expect(() => clock.set(Number.NaN)).toThrow(TypeError);
  });

  it('withFakeClock restores the real Date', () => {
    const realNow = Date.now;
    const clock = new FakeClock(42);
    expect(withFakeClock(clock, () => Date.now())).toBe(42);
    expect(Date.now).toBe(realNow);
    expect(new FakeClock().now()).toBe(DEFAULT_EPOCH_MS);
  });

  it('installFrozenDate restores the real Date after use', () => {
    const RealDate = Date;
    const clock = new FakeClock(123);
    const restore = installFrozenDate(clock);
    try {
      expect(Date.now()).toBe(123);
      expect(new Date().getTime()).toBe(123);
      expect(new Date(5_000).getTime()).toBe(5_000);
      expect(new Date().toISOString()).toBe('1970-01-01T00:00:00.123Z');
    } finally {
      restore();
    }
    expect(Date).toBe(RealDate);
  });
});

describe('SeededRandom', () => {
  it('produces a stable sequence for the same seed', () => {
    const first = new SeededRandom(DEFAULT_SEED);
    const second = new SeededRandom(DEFAULT_SEED);
    const a = [first.next(), first.next(), first.next()];
    const b = [second.next(), second.next(), second.next()];
    expect(a).toEqual(b);
    expect(a[0]).toBeCloseTo(0.41157995723187923, 12);
    expect(a[1]).toBeCloseTo(0.841819531749934, 12);
    expect(a[2]).toBeCloseTo(0.21625563758425415, 12);
  });

  it('keeps integers inside the requested inclusive bounds', () => {
    const random = new SeededRandom(7);
    for (let i = 0; i < 1_000; i += 1) {
      const value = random.int(-5, 5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it('rejects invalid ranges and empty picks', () => {
    const random = new SeededRandom(1);
    expect(() => random.int(5, 1)).toThrow(RangeError);
    expect(() => random.int(0.5, 2)).toThrow(RangeError);
    expect(() => random.pick([])).toThrow(RangeError);
  });

  it('shuffles without mutating the input', () => {
    const random = new SeededRandom(99);
    const input = [1, 2, 3, 4, 5];
    const output = random.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...output].sort()).toEqual(input);
    expect(new SeededRandom(99).shuffle(input)).toEqual(output);
  });

  it('forks independent streams', () => {
    const random = new SeededRandom(DEFAULT_SEED);
    const left = random.fork('left');
    const right = random.fork('right');
    expect([left.next(), left.next()]).not.toEqual([right.next(), right.next()]);
  });
});

describe('random installation helpers', () => {
  it('installSeededRandom patches and restores Math.random', () => {
    const original = Math.random;
    const expected = new SeededRandom(123);
    const { restore } = installSeededRandom(123);
    try {
      expect(Math.random()).toBeCloseTo(expected.next(), 12);
      expect(Math.random()).toBeCloseTo(expected.next(), 12);
    } finally {
      restore();
    }
    expect(Math.random).toBe(original);
  });

  it('withSeededRandom restores after a thrown assertion', () => {
    const original = Math.random;
    expect(() =>
      withSeededRandom(1, () => {
        throw new Error('boom');
      })
    ).toThrow('boom');
    expect(Math.random).toBe(original);
  });

  it('installDeterminism restores both globals', () => {
    const RealDate = Date;
    const original = Math.random;
    const harness = installDeterminism({ now: 1_234, seed: 55 });
    const expected = new SeededRandom(55);
    try {
      expect(Date.now()).toBe(1_234);
      expect(Math.random()).toBeCloseTo(expected.next(), 12);
    } finally {
      harness.restore();
    }
    expect(Date).toBe(RealDate);
    expect(Math.random).toBe(original);
  });

  it('withDeterminism restores globals even when the body throws', () => {
    const RealDate = Date;
    const original = Math.random;
    expect(() =>
      withDeterminism({}, () => {
        throw new Error('failure');
      })
    ).toThrow('failure');
    expect(Date).toBe(RealDate);
    expect(Math.random).toBe(original);
  });
});
