# CDN & HTTP Caching Strategy — #707

> **Status:** Implemented  
> **Owner:** Platform / Infrastructure  
> **Middleware:** `apps/backend/src/common/middleware/cache-headers.middleware.ts`  
> **Next.js headers:** `apps/frontend/next.config.js`

---

## Overview

Brain-Storm serves two classes of cacheable content:

| Class | Where | TTL strategy |
|---|---|---|
| Static assets (JS, CSS, fonts, images) | Next.js / CDN | 1 year, immutable |
| Cacheable API reads | NestJS edge | Short TTL + stale-while-revalidate |

---

## 1. Static Asset Caching (Frontend)

`next.config.js` already adds the following response headers:

```
/_next/static/*   →  Cache-Control: public, max-age=31536000, immutable
/fonts/*          →  Cache-Control: public, max-age=31536000, immutable
```

Next.js content-hashes every asset filename at build time, so `immutable` is safe — clients and CDN will only fetch a new copy when the filename changes.

**CDN configuration (CloudFront / Cloudflare)**

- Set the origin to the Next.js server or the ECS/EKS service.
- **Forward headers:** `Accept-Encoding` (needed for Brotli/gzip negotiation).
- **Cache behaviour for `/_next/static/*`:** TTL 365 d, respect `Cache-Control: immutable`.
- **Invalidation:** triggered automatically by the CD pipeline on every deploy (see §4).

---

## 2. API Response Caching

`CacheHeadersMiddleware` adds `Cache-Control` and `ETag` to every response.

### Header matrix

| Route | Auth header present? | Cache-Control |
|---|---|---|
| `GET /v1/courses` | No | `public, max-age=60, stale-while-revalidate=300` |
| `GET /v1/courses/:id` | No | `public, max-age=120, stale-while-revalidate=600` |
| `GET /v1/stellar/balance/:key` | No | `public, max-age=30, stale-while-revalidate=60` |
| Any GET with `Authorization` | Yes | `private, max-age=30, stale-while-revalidate=60` |
| Any other GET | — | `no-cache` |
| POST / PATCH / PUT / DELETE | — | `no-store` |

### ETag & conditional requests

Every JSON response receives an `ETag` header (SHA-1 of the serialised body, 16 hex chars). Clients that cache a response send `If-None-Match: "<etag>"` on subsequent requests; the middleware returns `304 Not Modified` with an empty body when the content has not changed — cutting payload transfer to near zero.

### Adding a new cacheable route

1. Open `cache-headers.middleware.ts`.
2. Append an entry to `PUBLIC_ROUTES`:
   ```ts
   { pattern: /^\/v1\/leaderboard$/, maxAge: 30, swr: 120 },
   ```
3. Deploy. The CDN will start caching automatically.

---

## 3. CDN Edge Caching for API reads

Cacheable public routes (`max-age > 0`, no `Authorization` required) can be served directly from the CDN edge.

**Recommended CDN behaviour (CloudFront)**

```
Cache based on:  query string (all), no cookies, no auth headers
Minimum TTL:     0 s  (honour origin's Cache-Control)
Maximum TTL:     600 s
Compress:        yes (Brotli + gzip)
```

**Recommended CDN behaviour (Cloudflare)**

```
Cache Level: Standard
Edge Cache TTL: Respect origin headers
Always Online: Off (don't serve stale on origin errors — data is ephemeral)
```

---

## 4. Cache Invalidation

### On API data change

When a course or credential is written/updated, the NestJS service calls `cacheManager.del(key)` (already implemented in `CoursesService.invalidateCache()`).  
The CDN has a short `max-age` (≤ 120 s) so stale edge responses expire quickly even without explicit invalidation.

For critical mutations (course publish, credential issue) add an explicit CDN purge:

```ts
// CloudFront
await cloudfrontClient.send(new CreateInvalidationCommand({
  DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  InvalidationBatch: {
    Paths: { Quantity: 1, Items: ['/v1/courses/*'] },
    CallerReference: Date.now().toString(),
  },
}));
```

### On deploy (static assets)

The CD pipeline should invalidate `/_next/static/*` after every deployment.  
Since filenames are content-hashed, old filenames remain valid — only new filenames are served.  You only need to invalidate `/_next/static/*` as a safety measure.

---

## 5. Measuring Cache-Hit Ratio

### CloudFront

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=<DIST_ID> \
  --start-time $(date -u -d "-1 hour" +%FT%TZ) \
  --end-time $(date -u +%FT%TZ) \
  --period 3600 \
  --statistics Average
```

Target: **≥ 70 %** for the course-list endpoint in steady state.

### Cloudflare Analytics (Dashboard)

`Analytics → Caching → Cache Hit Rate` — filter by zone and path prefix `/v1/courses`.

### Self-hosted (Prometheus)

If you expose the NestJS `/metrics` endpoint, add an `http_cache_hit_total` counter in the middleware and graph it in Grafana.

---

## 6. Security Notes

- `private` responses are **never** stored by the CDN.
- Responses containing `Authorization`-dependent data automatically receive `private` — no manual opt-out needed.
- Do not add `public` to routes that could leak PII even for anonymous users (e.g. `/v1/users/:id`).
