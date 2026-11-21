# Cargo Audit / Cargo Deny Report

> Recorded as part of [#1539] — Run cargo-deny/cargo-audit and fix advisories (deny.toml).

## Tools

| Tool                                                                      | Purpose                                                                                                                  | Command                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| [`cargo-audit`](https://github.com/rustsec/rustsec/tree/main/cargo-audit) | Checks `Cargo.lock` against the [RustSec Advisory Database](https://rustsec.org/) for known CVEs and security advisories | `cargo audit --deny warnings` |
| [`cargo-deny`](https://embarkstudios.github.io/cargo-deny/)               | Enforces license policy, bans, duplicate versions, and trusted source registries                                         | `cargo deny check`            |

## Configuration

- **cargo-deny**: [`deny.toml`](../deny.toml) at the workspace root.
- **cargo-audit**: Uses `~/.cargo/advisory-db` (fetched automatically).

## Baseline

`cargo audit` and `cargo deny` are enforced in CI via `.github/workflows/contracts.yml`.
No RustSec advisories were known to affect this workspace's dependency tree at the time
of this baseline.

The `deny.toml` configuration:

- **Advisories**: Denies all known vulnerabilities; warns on unmaintained/yanked crates.
- **Licenses**: Allows MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unicode, OpenSSL, Zlib, CC0-1.0.
  Denies GPL/LGPL/AGPL.
- **Bans**: Warns on duplicate crate versions. Explicit skip entries for `base64` 0.13,
  `darling` 0.14, and `indexmap` 1.x (each justified inline in `deny.toml`).
- **Sources**: Only crates.io is trusted.

## Running locally

```bash
# Install tools once
cargo install cargo-audit --locked
cargo install cargo-deny --locked

# Run both checks (matches CI)
./scripts/rust-audit.sh

# Or individually
cargo audit --deny warnings
cargo deny check
```

The `make cargo-audit` target also runs the full script.

## Adding advisory exceptions

If `cargo audit` flags an advisory that does not affect your usage, add it to the
`[advisories] ignore` list in `deny.toml` with a mandatory justification comment:

```toml
ignore = [
  { id = "RUSTSEC-YYYY-NNNN", reason = "Affects X API which this workspace does not use" },
]
```

Do not add exceptions without a reason comment — the CI workflow will still pass, but the
intent must be documented for future reviewers.

## CI enforcement

`.github/workflows/contracts.yml` installs `cargo-audit` and `cargo-deny` and runs both
checks on every push/PR touching `contracts/**`, `Cargo.toml`, or `Cargo.lock`.
Both steps are required to pass before merge.
