.PHONY: setup dev test build lint lint-complexity lint-commit lint-naming lint-imports lint-utils quality-local clean docker-up docker-down export-openapi audit cargo-audit help

help:
	@echo "Brain-Storm Makefile"
	@echo "--------------------"
	@echo "make setup           - Install dependencies, add wasm target, build contracts"
	@echo "make dev             - Start backend and frontend in development mode"
	@echo "make test            - Run all tests (backend, frontend, contracts)"
	@echo "make build           - Build all apps for production"
	@echo "make lint            - Run linter on all apps"
	@echo "make lint-complexity - Report cyclomatic/cognitive complexity violations"
	@echo "make quality-local   - Run all dependency-free quality checks"
	@echo "make lint-commit     - Check commitlint config and PR template"
	@echo "make lint-naming     - Check kebab-case source file names"
	@echo "make lint-imports    - Check import order and duplicate imports"
	@echo "make lint-utils      - Check for duplicate exported utilities"
	@echo "make clean           - Remove node_modules and build artifacts"
	@echo "make docker-up       - Start PostgreSQL and Redis via Docker Compose"
	@echo "make docker-down     - Stop and remove Docker Compose services"
	@echo "make export-openapi  - Build backend and export openapi.json"
	@echo "make audit           - Run npm audit across all workspaces"
	@echo "make cargo-audit     - Run cargo-audit on Rust contracts"

setup:
	@echo "==> Installing Node.js dependencies..."
	npm install
	@echo "==> Adding wasm32 target..."
	rustup target add wasm32-unknown-unknown
	@echo "==> Building smart contracts..."
	./scripts/build.sh
	@echo "==> Setup complete!"

dev:
	@echo "==> Starting backend and frontend..."
	npm run dev:backend & npm run dev:frontend

test:
	@echo "==> Running backend tests..."
	npm run test --workspace=apps/backend
	@echo "==> Running frontend tests..."
	npm run test --workspace=apps/frontend || true
	@echo "==> Running contract tests..."
	cargo test

build:
	@echo "==> Building for production..."
	npm run build

lint:
	@echo "==> Running lint checks..."
	npm run lint --workspace=apps/backend
	npm run lint --workspace=apps/frontend

lint-complexity:
	@echo "==> Checking cyclomatic complexity (TypeScript — max 15)..."
	npm run lint --workspace=apps/backend -- --rule 'complexity: [error, {max: 15}]' --no-eslintrc --parser @typescript-eslint/parser || true
	npm run lint --workspace=apps/frontend -- --rule 'complexity: [error, {max: 15}]' --no-eslintrc --parser @typescript-eslint/parser || true
	@echo "==> Checking cognitive complexity (Rust — threshold 25)..."
	cargo clippy --workspace --all-targets -- -W clippy::cognitive_complexity

quality-local:
	./scripts/check-commit-and-pr.sh
	./scripts/check-naming.sh
	./scripts/check-import-order.sh
	./scripts/check-duplicate-utils.sh

lint-commit:
	./scripts/check-commit-and-pr.sh

lint-naming:
	./scripts/check-naming.sh

lint-imports:
	./scripts/check-import-order.sh

lint-utils:
	./scripts/check-duplicate-utils.sh

clean:
	@echo "==> Cleaning project..."
	rm -rf node_modules apps/backend/dist apps/frontend/.next target

docker-up:
	@echo "==> Starting PostgreSQL and Redis..."
	docker compose up -d postgres redis

docker-down:
	@echo "==> Stopping Docker services..."
	docker compose down

audit:
	@echo "==> Running npm audit across workspaces..."
	@for ws in apps/backend apps/frontend; do \
		echo "  -> npm audit in $$ws"; \
		npm audit --workspace=$$ws --audit-level=moderate || true; \
	done

cargo-audit:
	@echo "==> Running cargo-audit and cargo-deny on Rust contracts..."
	./scripts/rust-audit.sh

export-openapi:
	@echo "==> Exporting OpenAPI spec..."
	npm run build --workspace=apps/backend
	cd apps/backend && EXPORT_OPENAPI=true node dist/main --export-openapi
	mkdir -p docs/api/dist
	cp apps/backend/openapi.json docs/api/dist/openapi.json
	cp docs/api/swagger-ui.html docs/api/dist/index.html
	@echo "==> OpenAPI spec exported to docs/api/dist/"
