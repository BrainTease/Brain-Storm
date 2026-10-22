import { env } from './config/env';
/**
 * OpenTelemetry SDK initialiser — must be imported before any other module.
 * Provides distributed tracing with context propagation across HTTP and async
 * operations. Exports spans to an OTLP-compatible collector (e.g. Jaeger,
 * Grafana Tempo) configured via OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * Usage: already required at the top of instrument.ts
 *   require('./tracing');
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT  - Collector endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME            - Service name reported in traces (default: brain-storm-api)
 *   OTEL_TRACES_SAMPLER_ARG      - Sampling ratio 0-1 (default: 1.0 in dev, 0.1 in prod)
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const isProd = env.isProduction;

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: env.otelServiceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: env.gitCommitSha,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.nodeEnv,
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${env.otelEndpoint}/v1/traces`,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Reduce noise from filesystem and DNS spans
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
  sampler: new TraceIdRatioBasedSampler(
    isProd ? env.otelTracesSampler : 1.0
  ),
  textMapPropagator: new W3CTraceContextPropagator(),
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
