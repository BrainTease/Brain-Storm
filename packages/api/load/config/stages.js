/**
 * Load Profile Stages for k6 Tests
 * Defines different load patterns for various test scenarios
 */

// Smoke Test: Minimal load to verify functionality
export const smokeTest = [
  { duration: '30s', target: 1 }, // 1 VU for 30 seconds
  { duration: '30s', target: 5 }, // Ramp to 5 VUs
  { duration: '1m', target: 5 }, // Sustain 5 VUs for 1 minute
  { duration: '30s', target: 0 }, // Ramp down
];

// Load Test: Normal expected load
export const loadTest = [
  { duration: '2m', target: 10 }, // Ramp up to 10 VUs
  { duration: '3m', target: 50 }, // Ramp to 50 VUs
  { duration: '5m', target: 100 }, // Ramp to 100 VUs
  { duration: '10m', target: 100 }, // Sustain 100 VUs
  { duration: '2m', target: 0 }, // Ramp down
];

// Stress Test: Find breaking point
export const stressTest = [
  { duration: '2m', target: 50 }, // Warm up
  { duration: '2m', target: 100 }, // Stage 1
  { duration: '2m', target: 200 }, // Stage 2
  { duration: '2m', target: 300 }, // Stage 3
  { duration: '2m', target: 400 }, // Stage 4
  { duration: '2m', target: 500 }, // Stage 5 (breaking point?)
  { duration: '2m', target: 600 }, // Stage 6
  { duration: '2m', target: 0 }, // Recovery
];

// Spike Test: Sudden traffic increase
export const spikeTest = [
  { duration: '30s', target: 10 }, // Normal load
  { duration: '1m', target: 500 }, // Sudden spike
  { duration: '2m', target: 500 }, // Sustain spike
  { duration: '30s', target: 10 }, // Back to normal
  { duration: '30s', target: 0 }, // Ramp down
];

// Soak Test: Sustained load over extended period
export const soakTest = [
  { duration: '5m', target: 50 }, // Ramp up
  { duration: '2h', target: 50 }, // Sustain for 2 hours
  { duration: '5m', target: 0 }, // Ramp down
];

// Breakpoint Test: Incrementally increase until failure
export const breakpointTest = [
  { duration: '2m', target: 100 },
  { duration: '2m', target: 200 },
  { duration: '2m', target: 400 },
  { duration: '2m', target: 800 },
  { duration: '2m', target: 1000 },
  { duration: '2m', target: 1200 },
  { duration: '2m', target: 1500 },
  { duration: '2m', target: 0 },
];

// Scalability Test: Test horizontal scaling
export const scalabilityTest = [
  { duration: '5m', target: 100 }, // Baseline
  { duration: '10m', target: 200 }, // 2x
  { duration: '10m', target: 400 }, // 4x
  { duration: '10m', target: 800 }, // 8x
  { duration: '5m', target: 0 }, // Ramp down
];

// Peak Hour Simulation
export const peakHourTest = [
  { duration: '5m', target: 50 }, // Off-peak
  { duration: '10m', target: 200 }, // Peak hour
  { duration: '15m', target: 300 }, // Maximum peak
  { duration: '10m', target: 200 }, // Declining peak
  { duration: '5m', target: 50 }, // Return to off-peak
  { duration: '2m', target: 0 }, // Ramp down
];

// Wave Pattern: Simulates traffic waves
export const waveTest = [
  { duration: '5m', target: 100 },
  { duration: '5m', target: 50 },
  { duration: '5m', target: 150 },
  { duration: '5m', target: 75 },
  { duration: '5m', target: 200 },
  { duration: '5m', target: 100 },
  { duration: '2m', target: 0 },
];

/**
 * Get stages by profile name
 * @param {string} profile - Profile name (smoke, load, stress, spike, soak)
 * @returns {Array} - Array of stage objects
 */
export function getStages(profile = 'load') {
  const profiles = {
    smoke: smokeTest,
    load: loadTest,
    stress: stressTest,
    spike: spikeTest,
    soak: soakTest,
    breakpoint: breakpointTest,
    scalability: scalabilityTest,
    peak: peakHourTest,
    wave: waveTest,
  };

  return profiles[profile] || loadTest;
}

export default {
  smokeTest,
  loadTest,
  stressTest,
  spikeTest,
  soakTest,
  breakpointTest,
  scalabilityTest,
  peakHourTest,
  waveTest,
  getStages,
};
