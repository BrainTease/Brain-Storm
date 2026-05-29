# Developer Onboarding Guide

Welcome to Brain-Storm! This guide walks new developers through setup, project structure, development workflow, and common issues.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Project Structure Overview](#project-structure-overview)
3. [Development Workflow](#development-workflow)
4. [Debugging Tips](#debugging-tips)
5. [Common Issues & FAQ](#common-issues--faq)
6. [Contribution Guidelines](#contribution-guidelines)

---

## Initial Setup

### Prerequisites

Verify you have the required tools installed:

```bash
node --version        # v18+
npm --version         # v9+
rustup --version      # Latest stable
cargo --version       # Latest stable
docker --version      # Optional, for local testnet
```

### 1. Clone & Install

```bash
git clone https://github.com/BrainTease/Brain-Storm.git
cd Brain-Storm
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your local settings:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=brain-storm
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your-random-secret-min-32-chars

# Stellar (testnet for development)
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=your-testnet-secret-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Start PostgreSQL (Docker or local)
docker run -d \
  --name brain-storm-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=brain-storm \
  -p 5432:5432 \
  postgres:15

# Run migrations
npm run db:migrate
```

### 4. Start Development Servers

**Terminal 1 — Backend:**
```bash
npm run dev:backend
# API: http://localhost:3000
# Swagger: http://localhost:3000/api/docs
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
# App: http://localhost:3001
```

**Terminal 3 — Smart Contracts (optional):**
```bash
cd contracts
cargo build --target wasm32-unknown-unknown
```

---

## Project Structure Overview

```
brain-storm/
├── apps/
│   ├── frontend/              # Next.js 14 React app
│   │   ├── src/
│   │   │   ├── app/          # App Router pages & layouts
│   │   │   ├── components/   # Reusable React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Utilities (API client, auth)
│   │   │   └── styles/       # Tailwind CSS
│   │   └── package.json
│   │
│   └── backend/               # NestJS REST API
│       ├── src/
│       │   ├── auth/         # JWT & RBAC
│       │   ├── courses/      # Course management
│       │   ├── users/        # User profiles
│       │   ├── stellar/      # Blockchain integration
│       │   ├── database/     # TypeORM entities & migrations
│       │   └── main.ts       # App entry point
│       └── package.json
│
├── contracts/                 # Soroban smart contracts (Rust)
│   ├── analytics/            # Progress tracking
│   ├── token/                # Reward tokens
│   ├── shared/               # RBAC & utilities
│   └── Cargo.toml
│
├── docs/                      # Documentation
│   ├── adr/                  # Architecture Decision Records
│   ├── api/                  # API documentation
│   └── *.md                  # Guides & runbooks
│
├── scripts/                   # Build & deploy scripts
├── .github/workflows/         # CI/CD pipelines
└── package.json              # Monorepo root
```

### Key Directories

| Path | Purpose |
|------|---------|
| `apps/frontend/src/app` | Next.js pages (App Router) |
| `apps/backend/src/auth` | JWT, RBAC, Passport strategies |
| `apps/backend/src/database` | TypeORM entities, migrations |
| `contracts/shared/src` | On-chain RBAC & validation |
| `docs/adr` | Architecture decisions |

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive names: `feature/add-course-enrollment`, `fix/jwt-expiry-bug`, `docs/update-readme`.

### 2. Make Changes

**Backend (NestJS):**
- Add new endpoints in `apps/backend/src/[module]/[module].controller.ts`
- Implement business logic in `apps/backend/src/[module]/[module].service.ts`
- Define database schema in `apps/backend/src/database/entities/`
- Create migrations: `npm run db:migration:create -- src/migrations/AddNewTable`

**Frontend (Next.js):**
- Add pages in `apps/frontend/src/app/[route]/page.tsx`
- Create components in `apps/frontend/src/components/`
- Use Zustand for state: `apps/frontend/src/lib/store.ts`

**Smart Contracts (Rust):**
- Edit contract logic in `contracts/[contract]/src/lib.rs`
- Run tests: `cargo test`
- Format code: `cargo fmt`

### 3. Test Your Changes

```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# Contract tests
cd contracts && cargo test

# Linting
npm run lint
```

### 4. Commit with Clear Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(courses): add course enrollment endpoint"
git commit -m "fix(auth): correct JWT expiry validation"
git commit -m "docs(onboarding): update setup instructions"
```

### 5. Push & Create Pull Request

```bash
git push -u origin feature/your-feature-name
```

Then open a PR on GitHub with:
- Clear title (under 70 chars)
- Description of changes
- Link to related issues
- Screenshots (if UI changes)

### 6. Code Review & Merge

- Address reviewer feedback
- Ensure all CI checks pass
- Merge to `main` when approved

---

## Debugging Tips

### Backend Debugging

**Enable verbose logging:**
```typescript
// apps/backend/src/main.ts
const app = await NestFactory.create(AppModule, {
  logger: ['debug', 'error', 'warn', 'log'],
});
```

**Inspect database queries:**
```typescript
// apps/backend/src/database/data-source.ts
export const AppDataSource = new DataSource({
  // ...
  logging: ['query', 'error'],
});
```

**Debug with VS Code:**
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "program": "${workspaceFolder}/apps/backend/dist/main.js",
      "preLaunchTask": "npm: build:backend",
      "outFiles": ["${workspaceFolder}/apps/backend/dist/**/*.js"]
    }
  ]
}
```

### Frontend Debugging

**React DevTools:**
- Install [React DevTools](https://react-devtools-tutorial.vercel.app/) browser extension
- Inspect component state in the DevTools panel

**Network inspection:**
- Open browser DevTools → Network tab
- Check API requests to `http://localhost:3000/v1/*`
- Verify response status and payload

**Zustand state inspection:**
```typescript
// Temporary debug in component
import { useStore } from '@/lib/store';
console.log('Current state:', useStore.getState());
```

### Smart Contract Debugging

**Run tests with output:**
```bash
cd contracts
cargo test -- --nocapture
```

**Check contract state on testnet:**
```bash
stellar contract invoke \
  --network testnet \
  --id <CONTRACT_ID> \
  -- get_balance --account <ACCOUNT_ID>
```

---

## Common Issues & FAQ

### Q: "Cannot find module '@stellar/stellar-sdk'"

**A:** Run `npm install` in the project root:
```bash
npm install
```

### Q: "PostgreSQL connection refused"

**A:** Verify the database is running:
```bash
# If using Docker
docker ps | grep brain-storm-db

# If not running, start it
docker run -d --name brain-storm-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=brain-storm \
  -p 5432:5432 \
  postgres:15
```

### Q: "JWT_SECRET not set" error

**A:** Ensure `.env` has `JWT_SECRET`:
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### Q: "Stellar testnet account not funded"

**A:** Use the Stellar Friendbot to fund your testnet account:
```bash
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

### Q: "Cargo build fails with 'wasm32 target not installed'"

**A:** Install the WebAssembly target:
```bash
rustup target add wasm32-unknown-unknown
```

### Q: "Port 3000 already in use"

**A:** Kill the process or use a different port:
```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev:backend
```

### Q: "Migrations not running"

**A:** Ensure migrations are in the correct directory and run:
```bash
npm run db:migrate
npm run db:migrate:show  # View migration status
```

---

## Contribution Guidelines

### Before You Start

1. Check [open issues](https://github.com/BrainTease/Brain-Storm/issues) — don't duplicate work
2. Read the [security best practices](./security-best-practices.md)
3. Review the [architecture decisions](./adr/README.md)

### Code Standards

- **TypeScript:** Use strict mode, no `any` types
- **Formatting:** Run `npm run lint:fix` before committing
- **Testing:** Aim for >80% coverage on new code
- **Comments:** Document complex logic, not obvious code

### Commit & PR Standards

- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/)
- **PR Title:** Under 70 characters, descriptive
- **PR Description:** Include what changed, why, and what was tested
- **Linked Issues:** Reference related issues with `Closes #123`

### Review Process

1. Create PR with clear description
2. Automated CI checks must pass
3. At least one code review approval required
4. Address feedback and re-request review
5. Merge when approved

### Getting Help

- **Questions?** Open a [Discussion](https://github.com/BrainTease/Brain-Storm/discussions)
- **Found a bug?** Open an [Issue](https://github.com/BrainTease/Brain-Storm/issues)
- **Need help?** Reach out in the [Discord community](https://discord.gg/stellardev)

---

**Happy coding! 🚀**
