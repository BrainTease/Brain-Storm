$env:PATH += ";C:\Program Files\Git\bin"
Set-Location "C:\Users\USER\Documents\Brain-Storm"

# ── #634 ──────────────────────────────────────────────────────────────────────
git rm --cached contracts/token/src/staking.rs 2>$null
git add -f contracts/token/src/staking.rs
git commit -F msg634.txt

# ── #635 ──────────────────────────────────────────────────────────────────────
git add -f contracts/credential_metadata/src/linkage.rs
git rm --cached contracts/credential_metadata/src/lib.rs 2>$null
git add -f contracts/credential_metadata/src/lib.rs
git commit -F msg635.txt

# ── #648 ──────────────────────────────────────────────────────────────────────
git add -f apps/backend/src/jobs/job.entity.ts
git add -f "apps/backend/src/jobs/dto/index.ts"
git add -f apps/backend/src/jobs/jobs.service.ts
git add -f apps/backend/src/jobs/jobs.controller.ts
git add -f apps/backend/src/jobs/jobs.module.ts
git commit -F msg648.txt

# ── #649 ──────────────────────────────────────────────────────────────────────
git add -f apps/backend/src/media/media.entity.ts
git add -f apps/backend/src/media/storage.service.ts
git add -f apps/backend/src/media/media.controller.ts
git add -f apps/backend/src/media/media.module.ts
git commit -F msg649.txt

Write-Host "All 4 commits done"
git log --oneline -5
