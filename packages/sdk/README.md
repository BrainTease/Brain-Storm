# Brain-Storm TypeScript SDK

Typed HTTP client for the Brain-Storm API, generated from the OpenAPI spec.

## Installation

```bash
npm install @brain-storm/sdk
```

## Usage

```typescript
import { BrainStormClient } from '@brain-storm/sdk';

const client = new BrainStormClient({
  baseURL: 'https://api.brain-storm.com',
});

// Authenticate
const { access_token } = await client.auth.login({
  email: 'user@example.com',
  password: 'securepass123',
});
client.setToken(access_token);

// List courses
const courses = await client.courses.list({ level: 'beginner', page: 1, limit: 20 });

// Record progress
await client.progress.record({ courseId: 'uuid', progressPct: 75 });
```

## Regenerating the SDK

Run from the monorepo root:

```bash
./scripts/generate-sdk.sh
```

This exports the OpenAPI spec from the backend and rebuilds `packages/sdk`.
