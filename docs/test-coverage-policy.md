# Test Coverage Policy

The Code Quality Gates workflow enforces a minimum of 85% line coverage for
each maintained application workspace: frontend, backend, SDK, and Rust
contracts. A missing report, a failed coverage command, or a workspace below
the threshold fails the gate. Contract results are included in the same
workflow summary as the JavaScript workspace results.

The gate uses each workspace's existing coverage command and records the full
reports as workflow artifacts. Additional per-metric thresholds configured by
a workspace remain in force.

## Baseline Remediation

The current baseline must be established by the first CI run of this gate; no
tests were run locally while implementing this policy. A workspace below 85%
does not receive an automatic exception. The failing workspace and measured
percentage in the CI report are the remediation starting point. Track any
remaining gap in a GitHub issue naming the workspace, current percentage,
owner, and target date, and close that remediation issue when the workspace
meets the enforced floor. Do not lower or bypass the shared threshold to make a
failing baseline pass.