# Developer Onboarding Guide

Welcome to Brain-Storm! This comprehensive guide takes you from setup to your first contribution.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Project Structure Overview](#project-structure-overview)
4. [Development Workflow](#development-workflow)
5. [Debugging Tips](#debugging-tips)
6. [Common Issues & FAQ](#common-issues--faq)
7. [Contribution Guidelines](#contribution-guidelines)

---

## Prerequisites

Ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ | JavaScript runtime |
| npm | v9+ | Package manager |
| PostgreSQL | v12+ | Database |
| Rust | v1.75+ | Smart contract language |
| Stellar CLI | v21.5.0+ | Blockchain interaction |
| Docker | Latest | Containerization (optional) |
| Git | Latest | Version control |

**Verify installations:**
```bash
node --version
npm --version
psql --version
rustc --version
stellar --version
```

---

## Initial Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/BrainTease/Brain-Storm.git
cd Brain-Storm
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your local settings
```

**Key variables for local development:**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=brain_storm_dev
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
JWT_SECRET=your-secret-key-min-32-chars
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=your-testnet-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Set Up Database

```bash
# Create database
createdb brain_storm_dev

# Run migrations
npm run db:migrate
```

### 4. Install Rust Wasm Target

```bash
rustup target add wasm32-unknown-unknown
```

### 5. Database Seeding

The project includes a comprehensive seed script that creates realistic demo data for local development. The seed is **idempotent** — running it multiple times is safe (it cleans up before re-seeding).

#### Basic Seed (Default: Students, Courses, Enrollments)

```bash
cd apps/backend
npx ts-node src/database/seed.ts
```

#### Seed with Reviews

```bash
npx ts-node src/database/seed.ts --with-reviews
```

#### Seed with Sample Tips/Transactions

```bash
npx ts-node src/database/seed.ts --with-tips
```

#### Full Demo Dataset (Reviews + Tips)

```bash
npx ts-node src/database/seed.ts --with-reviews --with-tips
```

#### Custom Record Count

```bash
npx ts-node src/database/seed.ts --count=25
```

#### Seed Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `--with-reviews` | Include sample course reviews | Not included |
| `--with-tips` | Include sample BST tip transactions | Not included |
| `--count=N` | Number of courses/students to generate | 10 |

#### Environment Safety

The seed script is **guarded against running in production** — it will exit immediately with an error if `NODE_ENV=production` is detected.

#### What Gets Seeded

| Entity | Description |
|--------|-------------|
| Admin | 1 admin account (`admin@brainstorm.dev`) |
| Instructors | Up to 5 instructor profiles with Stellar keys |
| Curators | 3 content curator accounts |
| Students | 20 student profiles (2x count) |
| Courses | 10 courses with realistic titles/descriptions |
| Modules | 3-6 modules per course |
| Lessons | 2-4 lessons per module with markdown content |
| Enrollments | Students enrolled in 1-4 courses each |
| Progress | Random progress records for enrollments |
| Notifications | Enrollment and tip notifications |
| Reviews | (Optional) Student reviews with ratings |
| Tips | (Optional) Sample BST tip transactions |

### 6. Start Development Servers

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# API available at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# App available at http://localhost:3001
```

**Terminal 3 - Smart Contracts (optional):**
```bash
cd contracts
cargo build --target wasm32-unknown-unknown
```

---

## Project Structure Overview

```
brain-storm/
├── apps/
│   ├── backend/                    # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/              # Authentication & JWT
│   │   │   ├── courses/           # Course management
│   │   │   ├── enrollments/       # Student enrollments
│   │   │   ├── progress/          # Progress tracking
│   │   │   ├── credentials/       # Certificate issuance
│   │   │   ├── stellar/           # Blockchain integration
│   │   │   ├── users/             # User management
│   │   │   ├── common/            # Shared utilities
│   │   │   └── main.ts            # App entry point
│   │   ├── tests/                 # Unit & integration tests
│   │   └── package.json
│   │
│   └── frontend/                   # Next.js 14 App Router
│       ├── src/
│       │   ├── app/               # Route segments
│       │   ├── components/        # React components
│       │   ├── store/             # Zustand state
│       │   ├── lib/               # Utilities & API client
│       │   └── hooks/             # Custom hooks
│       ├── e2e/                   # Playwright tests
│       └── package.json
│
├── contracts/                      # Soroban smart contracts
│   ├── analytics/                 # Progress tracking
│   ├── token/                     # Reward tokens
│   ├── shared/                    # RBAC & utilities
│   └── Cargo.toml
│
├── docs/                          # Documentation
├── scripts/                       # Build & deploy scripts
└── package.json                   # Workspace root
```

### Key Directories

**Backend (`apps/backend/src/`):**
- `auth/` — JWT, OAuth, Stellar authentication
- `courses/` — Course CRUD, modules, lessons
- `stellar/` — Soroban contract calls, Horizon API
- `common/` — Guards, pipes, filters, logger

**Frontend (`apps/frontend/src/`):**
- `app/` — Next.js pages (App Router)
- `components/ui/` — Reusable UI primitives
- `store/` — Zustand stores for auth, courses, progress
- `lib/` — API client, helpers

**Contracts (`contracts/`):**
- Each contract is a Rust crate with `src/lib.rs`
- Tests in `#[cfg(test)]` modules
- Built to `wasm32-unknown-unknown` target

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use conventional commit prefixes: `feature/`, `fix/`, `docs/`, `chore/`

### 2. Make Changes

**Backend example:**
```bash
cd apps/backend
npm run dev  # Hot reload enabled
```

**Frontend example:**
```bash
cd apps/frontend
npm run dev  # Hot reload enabled
```

### 3. Run Tests

```bash
# Backend unit tests
npm run test:backend

# Backend integration tests
npm run test:backend:integration

# Frontend tests
npm run test:frontend

# Smart contracts
cd contracts && cargo test
```

### 4. Lint & Format

```bash
# Format code
npm run format

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

### 5. Commit & Push

```bash
git add .
git commit -m "feat: add new feature"
git push -u origin feature/your-feature-name
```

Follow [Conventional Commits](./docs/contributing/COMMIT_CONVENTIONS.md).

### 6. Open Pull Request

- Use the PR template in `.github/pull_request_template.md`
- Link related issues
- Ensure all CI checks pass
- Request review from maintainers

---

## Debugging Tips

### Backend Debugging

**Enable debug logs:**
```env
LOG_LEVEL=debug
```

**Use NestJS CLI:**
```bash
npm run dev:backend -- --debug
```

**Inspect database:**
```bash
psql -h localhost -U postgres -d brain_storm_dev
```

**Common queries:**
```sql
-- List all users
SELECT id, email, role FROM users;

-- Check enrollments
SELECT * FROM enrollments WHERE user_id = 'user-id';

-- View progress
SELECT * FROM progress WHERE user_id = 'user-id';
```

### Frontend Debugging

**React DevTools:**
- Install [React DevTools](https://react-devtools-tutorial.vercel.app/) browser extension
- Inspect component state in Zustand stores

**Network inspection:**
- Open DevTools → Network tab
- Check API responses and request payloads

**Console errors:**
```bash
# Enable verbose logging
NEXT_PUBLIC_DEBUG=true npm run dev:frontend
```

### Smart Contract Debugging

**Build with debug info:**
```bash
cd contracts/analytics
cargo build --target wasm32-unknown-unknown
```

**Run tests with output:**
```bash
cargo test -- --nocapture
```

**Inspect contract state:**
```bash
stellar contract invoke \
  --id <contract-id> \
  --network testnet \
  -- get_progress --user <user-id>
```

---

## Common Issues & FAQ

### Issue: Database Connection Failed

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -c "SELECT 1"

# If not running, start it
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

### Issue: Port Already in Use

**Symptom:** `Error: listen EADDRINUSE :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Issue: Stellar Testnet Connection Error

**Symptom:** `Error: Network request failed`

**Solution:**
```bash
# Verify testnet is accessible
curl https://horizon-testnet.stellar.org/

# Check your STELLAR_SECRET_KEY is valid
stellar keys list
```

### Issue: Smart Contract Build Fails

**Symptom:** `error: could not compile 'analytics'`

**Solution:**
```bash
# Update Rust
rustup update

# Clean build
cd contracts
cargo clean
cargo build --target wasm32-unknown-unknown
```

### Issue: Tests Failing Locally but Passing in CI

**Symptom:** Inconsistent test results

**Solution:**
```bash
# Clear cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests again
npm run test
```

### FAQ

**Q: How do I add a new API endpoint?**
A: Create a new controller in `apps/backend/src/`, define the route, add guards/pipes, and write tests.

**Q: How do I deploy a smart contract?**
A: Use `./scripts/deploy.sh testnet <contract-name>` for testnet or mainnet.

**Q: Where do I find API documentation?**
A: Visit `http://localhost:3000/api/docs` (Swagger UI) when the backend is running.

**Q: How do I reset the database?**
A: Run `npm run db:reset` (drops and recreates schema).

**Q: Can I use Docker for development?**
A: Yes, use `docker compose up -d` to start PostgreSQL, Redis, and backend.

---

## Contribution Guidelines

### Code Style

- **TypeScript:** Use strict mode, avoid `any` types
- **Naming:** camelCase for variables/functions, PascalCase for classes/types
- **Comments:** Document complex logic, not obvious code
- **Imports:** Organize by external, internal, relative

### Testing Requirements

- Unit tests for business logic (minimum 80% coverage)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Smart contract tests for all public functions

### PR Checklist

- [ ] Tests pass locally (`npm run test`)
- [ ] Code formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] Commit messages follow conventions
- [ ] PR description explains changes
- [ ] Related issues linked
- [ ] No breaking changes (or documented)

### Review Process

1. Automated checks (CI/CD)
2. Code review (maintainers)
3. Approval & merge
4. Deployment (if applicable)

### Getting Help

- **Questions:** Open a discussion in GitHub Discussions
- **Bugs:** File an issue with reproduction steps
- **Security:** Email security@brainstorm.dev (do not open public issues)
- **Chat:** Join our Discord community

---

## Next Steps

1. Set up your development environment (follow Initial Setup)
2. Read the [Architecture Overview](./docs/architecture.md)
3. Pick a [good first issue](https://github.com/BrainTease/Brain-Storm/labels/good%20first%20issue)
4. Make your first contribution!

Welcome to the team! 🚀
