# PR Preview Environments

Every pull request targeting `main` or `develop` automatically gets an ephemeral preview environment.

## How It Works

1. **On PR open / push** — `.github/workflows/pr-preview.yml` builds Docker images tagged `pr-<number>`, deploys a per-PR Docker Compose stack on the preview server, and posts the URLs as a PR comment.
2. **On PR close** — the stack (containers + volumes) is torn down automatically and the comment is updated.

## Preview URLs

The bot posts a comment like this on every PR:

| Service               | URL                                        |
| --------------------- | ------------------------------------------ |
| Frontend              | `http://PREVIEW_HOST:3200+PR_NUM`          |
| Backend API / Swagger | `http://PREVIEW_HOST:3100+PR_NUM/api/docs` |

Port assignment: `backend = 3100 + PR_NUM`, `frontend = 3200 + PR_NUM`.

## Database

Each preview gets its own ephemeral PostgreSQL container (`postgres:15-alpine`) with a fresh `brain_storm_preview` database. The schema is created at container startup via the application migrations. No production or staging data is used.

Stellar interactions use `testnet`.

## Required Secrets

| Secret               | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `PREVIEW_HOST`       | Hostname/IP of the preview server                          |
| `PREVIEW_SSH_USER`   | SSH username on the preview server                         |
| `PREVIEW_SSH_KEY`    | Private SSH key for the preview server                     |
| `PREVIEW_JWT_SECRET` | JWT signing secret for preview envs (non-production value) |

## Limitations

- Preview environments run on a **shared preview server** — they are not isolated at the network level.
- Resources are not auto-scaled; concurrent PRs share the server's capacity.
- The preview database is seeded only with the schema — no demo data unless manually seeded.
- Stellar contract interactions use testnet; funded testnet keys are required for full contract testing.
