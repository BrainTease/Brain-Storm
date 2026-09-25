import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter;
  private readonly credentialIssuedTotal: Counter;
  private readonly bstMintedTotal: Counter;
  private readonly stellarRpcLatency: Histogram;
  private readonly circuitBreakerState: Gauge;
  private readonly circuitBreakerTrips: Counter;
  private readonly circuitBreakerFallbacks: Counter;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.credentialIssuedTotal = new Counter({
      name: 'credential_issued_total',
      help: 'Total number of credentials issued',
      labelNames: ['credential_type'],
      registers: [register],
    });

    this.bstMintedTotal = new Counter({
      name: 'bst_minted_total',
      help: 'Total number of BST tokens minted',
      labelNames: ['user_id'],
      registers: [register],
    });

    this.stellarRpcLatency = new Histogram({
      name: 'stellar_rpc_latency_seconds',
      help: 'Stellar RPC call latency in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Current circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      labelNames: ['breaker_name'],
      registers: [register],
    });

    this.circuitBreakerTrips = new Counter({
      name: 'circuit_breaker_trips_total',
      help: 'Total number of times a circuit breaker has opened',
      labelNames: ['breaker_name'],
      registers: [register],
    });

    this.circuitBreakerFallbacks = new Counter({
      name: 'circuit_breaker_fallbacks_total',
      help: 'Total number of times a circuit breaker fallback was invoked',
      labelNames: ['breaker_name'],
      registers: [register],
    });
  }

  setCircuitBreakerState(breakerName: string, stateValue: number) {
    this.circuitBreakerState.set({ breaker_name: breakerName }, stateValue);
  }

  incrementCircuitBreakerTrip(breakerName: string) {
    this.circuitBreakerTrips.inc({ breaker_name: breakerName });
  }

  incrementCircuitBreakerFallback(breakerName: string) {
    this.circuitBreakerFallbacks.inc({ breaker_name: breakerName });
  }

  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  incrementCredentialIssued(credentialType: string) {
    this.credentialIssuedTotal.inc({ credential_type: credentialType });
  }

  incrementBstMinted(userId: string) {
    this.bstMintedTotal.inc({ user_id: userId });
  }

  observeStellarRpcLatency(method: string, status: string, durationSeconds: number) {
    this.stellarRpcLatency.observe({ method, status }, durationSeconds);
  }
}
