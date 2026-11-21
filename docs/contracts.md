# Smart Contracts Interaction Guide

This guide covers all deployed Soroban smart contracts on the Stellar network for the Brain-Storm platform.

---

## Contract Addresses

| Contract    | Testnet                                    | Mainnet |
| ----------- | ------------------------------------------ | ------- |
| Certificate | `CDA...` _(replace with deployed address)_ | TBD     |
| Token (BST) | `CAS...` _(replace with deployed address)_ | TBD     |
| Analytics   | `CBZ...` _(replace with deployed address)_ | TBD     |
| Governance  | `CGV...` _(replace with deployed address)_ | TBD     |

> Deployed addresses are also stored in `scripts/deployed-contracts.json` after running `./scripts/deploy.sh`.

---

## Prerequisites

```bash
# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Configure testnet identity (one-time)
stellar keys generate --global admin --network testnet
stellar keys fund admin --network testnet
```

---

## Certificate Contract

Manages soulbound NFT certificates issued to students upon course completion.

### Function Signatures

| Function                    | Parameters                                                                    | Returns                     | Auth        |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------------- | ----------- |
| `initialize`                | `admin: Address`                                                              | —                           | None (once) |
| `mint_certificate`          | `admin: Address, recipient: Address, course_id: Symbol, metadata_url: String` | `u64` (cert ID)             | Admin       |
| `get_certificate`           | `id: u64`                                                                     | `Option<CertificateRecord>` | None        |
| `get_certificates_by_owner` | `owner: Address`                                                              | `Vec<CertificateRecord>`    | None        |

### Event Schema

| Topic 1          | Topic 2        | Data                           |
| ---------------- | -------------- | ------------------------------ |
| `Symbol("mint")` | `Symbol("to")` | `(id: u64, course_id: Symbol)` |

> See [Standardized Event Schema](#standardized-event-schema) for the shared topic/payload conventions.

### CLI Examples

```bash
# Mint a certificate
stellar contract invoke \
  --id <CERT_CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  mint_certificate \
  --admin <ADMIN_ADDRESS> \
  --recipient <STUDENT_ADDRESS> \
  --course_id RUST101 \
  --metadata_url "https://api.brain-storm.com/v1/certs/1"

# Read a certificate
stellar contract invoke \
  --id <CERT_CONTRACT_ID> \
  --network testnet \
  -- \
  get_certificate \
  --id 1

# List all certificates for a student
stellar contract invoke \
  --id <CERT_CONTRACT_ID> \
  --network testnet \
  -- \
  get_certificates_by_owner \
  --owner <STUDENT_ADDRESS>
```

---

## Token Contract (BST)

Brain-Storm Token (BST) — SEP-0041 compatible token with instructor vesting.

### Function Signatures

| Function         | Parameters                                                                                     | Returns          | Auth        |
| ---------------- | ---------------------------------------------------------------------------------------------- | ---------------- | ----------- |
| `mint`           | `to: Address, amount: i128`                                                                    | —                | Admin       |
| `transfer`       | `from: Address, to: Address, amount: i128`                                                     | —                | `from`      |
| `balance`        | `id: Address`                                                                                  | `i128`           | None        |
| `create_vesting` | `admin: Address, beneficiary: Address, total_amount: i128, cliff_ledger: u32, end_ledger: u32` | —                | Admin       |
| `claim_vesting`  | `beneficiary: Address`                                                                         | `i128` (claimed) | Beneficiary |

### Event Schema

| Topic 1              | Topic 2          | Data                                         |
| -------------------- | ---------------- | -------------------------------------------- |
| `Symbol("transfer")` | `Symbol("from")` | `(from: Address, to: Address, amount: i128)` |
| `Symbol("mint")`     | `Symbol("to")`   | `(to: Address, amount: i128)`                |

> See [Standardized Event Schema](#standardized-event-schema) for the shared topic/payload conventions.

### CLI Examples

```bash
# Mint 100 BST (amount in stroops: 100 * 10^7)
stellar contract invoke \
  --id <TOKEN_ID> \
  --source admin \
  --network testnet \
  -- \
  mint \
  --to <USER_ADDRESS> \
  --amount 1000000000

# Check balance
stellar contract invoke \
  --id <TOKEN_ID> \
  --network testnet \
  -- \
  balance \
  --id <USER_ADDRESS>

# Create vesting schedule for an instructor
stellar contract invoke \
  --id <TOKEN_ID> \
  --source admin \
  --network testnet \
  -- \
  create_vesting \
  --admin <ADMIN_ADDRESS> \
  --beneficiary <INSTRUCTOR_ADDRESS> \
  --total_amount 10000000000 \
  --cliff_ledger 500000 \
  --end_ledger 1000000
```

---

## Analytics Contract

Tracks per-student, per-course progress on-chain.

### Function Signatures

| Function          | Parameters                                                                | Returns                  | Auth             |
| ----------------- | ------------------------------------------------------------------------- | ------------------------ | ---------------- |
| `record_progress` | `caller: Address, student: Address, course_id: Symbol, progress_pct: u32` | —                        | Caller (backend) |
| `get_progress`    | `student: Address, course_id: Symbol`                                     | `Option<ProgressRecord>` | None             |

### Event Schema

| Topic 1               | Topic 2               | Data                                                       |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| `Symbol("analytics")` | `Symbol("prog_upd")`  | `(student: Address, course_id: Symbol, progress_pct: u32)` |
| `Symbol("analytics")` | `Symbol("completed")` | `(student: Address, course_id: Symbol)`                    |

> See [Standardized Event Schema](#standardized-event-schema) for the shared topic/payload conventions.

### CLI Examples

```bash
# Record 75% progress
stellar contract invoke \
  --id <ANALYTICS_ID> \
  --source backend-signer \
  --network testnet \
  -- \
  record_progress \
  --caller <BACKEND_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --course_id RUST101 \
  --progress_pct 75

# Read progress
stellar contract invoke \
  --id <ANALYTICS_ID> \
  --network testnet \
  -- \
  get_progress \
  --student <STUDENT_ADDRESS> \
  --course_id RUST101
```

---

## Governance Contract

On-chain proposal and voting for platform parameter changes.

### Function Signatures

| Function           | Parameters                                                                      | Returns             | Auth                       |
| ------------------ | ------------------------------------------------------------------------------- | ------------------- | -------------------------- |
| `create_proposal`  | `proposer: Address, title: Symbol, description: String, voting_end_ledger: u32` | `u32` (proposal ID) | BST holder                 |
| `vote`             | `voter: Address, proposal_id: u32, support: bool`                               | —                   | BST holder                 |
| `execute_proposal` | `proposal_id: u32`                                                              | —                   | Anyone (after voting ends) |
| `get_proposal`     | `proposal_id: u32`                                                              | `Option<Proposal>`  | None                       |

### Event Schema

| Topic 1                | Topic 2              | Data                                                       |
| ---------------------- | -------------------- | ---------------------------------------------------------- |
| `Symbol("governance")` | `Symbol("proposal")` | `(proposal_id: u32, proposer: Address, voting_end: u32)`   |
| `Symbol("governance")` | `Symbol("vote")`     | `(proposal_id: u32, voter: Address, support: bool)`        |
| `Symbol("governance")` | `Symbol("executed")` | `(proposal_id: u32)`                                       |

> See [Standardized Event Schema](#standardized-event-schema) for the shared topic/payload conventions.

### CLI Examples

```bash
# Create a proposal
stellar contract invoke \
  --id <GOVERNANCE_ID> \
  --source proposer \
  --network testnet \
  -- \
  create_proposal \
  --proposer <PROPOSER_ADDRESS> \
  --title "Increase reward rate" \
  --description "Proposal to increase BST rewards per course completion from 100 to 150." \
  --voting_end_ledger 600000

# Vote in favour
stellar contract invoke \
  --id <GOVERNANCE_ID> \
  --source voter \
  --network testnet \
  -- \
  vote \
  --voter <VOTER_ADDRESS> \
  --proposal_id 1 \
  --support true
```

---

## Standardized Event Schema

All contracts in `contracts/` emit events using a single, shared convention implemented in
`contracts/shared` (`events` module). Consumers (backend listeners, indexers, dashboards) can
therefore decode every event with one generic parser.

### Topic Layout

Every event has exactly **two topics**:

| Topic | Value                                    | Purpose                                  |
| ----- | ---------------------------------------- | ---------------------------------------- |
| 1     | `Symbol(<contract>)`                     | Contract namespace, e.g. `"certificate"` |
| 2     | `Symbol(<action>)`                       | Action name, e.g. `"mint"`, `"transfer"` |

The payload is always a single `ScVal` tuple (a `Vec` of values) in the order documented per
contract above. Payloads never contain nested maps, so they remain cheap to encode and stable
to decode.

### Namespaces and Actions

| Contract    | Topic 1 (namespace) | Topic 2 (actions)                          |
| ----------- | ------------------- | ------------------------------------------ |
| Certificate | `"certificate"`     | `"mint"`                                   |
| Token (BST) | `"token"`           | `"transfer"`, `"mint"`                     |
| Analytics   | `"analytics"`       | `"prog_upd"`, `"completed"`                |
| Governance  | `"governance"`      | `"proposal"`, `"vote"`, `"executed"`       |

### Topic Changes (Migration Notes)

The Certificate contract previously emitted `Symbol("mint")` as Topic 1 and `Symbol("to")` as
Topic 2. It now follows the shared layout: Topic 1 is `Symbol("certificate")` and Topic 2 is
`Symbol("mint")`. The payload `(id: u64, course_id: Symbol)` is unchanged.

- **Off-chain listeners** that filtered on `Topic 1 == "mint"` must filter on
  `Topic 1 == "certificate" && Topic 2 == "mint"`. The `contracts/shared` event helpers expose
  the canonical symbols so clients can match on constants instead of string literals.
- **On-chain storage is unaffected.** No event data is persisted in contract storage, so this
  change requires no storage migration and is fully backward compatible at the state level.
- Events emitted before the upgrade remain queryable on-chain; indexers should handle both the
  legacy and the standardized topic layout during a transition window.

### Unified Initialization and Upgrade Pattern

All contracts now share the same initialization and upgrade entry points, provided by
`contracts/shared` (`init` module):

| Function             | Parameters                          | Auth        | Notes                                              |
| -------------------- | ----------------------------------- | ----------- | -------------------------------------------------- |
| `initialize`         | `admin: Address`                    | None (once) | Reverts with `AlreadyInitialized` on second call.  |
| `upgrade`            | `admin: Address, new_wasm_hash: BytesN<32>` | Admin | Reverts with `NotInitialized` if not initialized. |
| `version`            | —                                   | None        | Returns the contract's `u32` storage schema version. |

Conventions:

- `initialize` is idempotent-safe: it checks the stored admin key and panics with
  `AlreadyInitialized` rather than overwriting state.
- `upgrade` requires the stored admin's authorization and only swaps the WASM; it never
  rewrites storage keys.
- Each contract stores a `version: u32` under a dedicated key so future migrations can detect
  the layout they are reading.

### Storage Layout Compatibility

The standardized init/upgrade pattern and event schema **do not change any existing storage
keys or value layouts**. All previously written data (certificates, balances, vesting
schedules, progress records, proposals) remains readable after upgrade. The only new storage
entry is the `version` key, which is additive and ignored by older readers.

If a future change does require a storage migration, bump the contract's `version` and add a
`migrate` entry point; document the migration steps here before deploying.

---

## TypeScript / JavaScript Integration

Install the SDK:

```bash
npm install @stellar/stellar-sdk
```

### Mint a Certificate

```typescript
import {
  Contract,
  Address,
  xdr,
  TransactionBuilder,
  Networks,
  Keypair,
  SorobanRpc,
} from '@stellar/stellar-sdk';

const CERT_CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID!;
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

async function mintCertificate(
  adminKeypair: Keypair,
  studentAddress: string,
  courseId: string,
  metadataUrl: string
): Promise<string> {
  const adminAccount = await server.getAccount(adminKeypair.publicKey());
  const contract = new Contract(CERT_CONTRACT_ID);

  const tx = new TransactionBuilder(adminAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'mint_certificate',
        Address.fromString(adminKeypair.publicKey()).toScVal(),
        Address.fromString(studentAddress).toScVal(),
        xdr.ScVal.scvSymbol(courseId),
        xdr.ScVal.scvString(metadataUrl)
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(adminKeypair);

  const result = await server.sendTransaction(prepared);
  return result.hash;
}
```

### Record Progress

```typescript
async function recordProgress(
  backendKeypair: Keypair,
  studentAddress: string,
  courseId: string,
  progressPct: number
): Promise<void> {
  const account = await server.getAccount(backendKeypair.publicKey());
  const contract = new Contract(process.env.ANALYTICS_CONTRACT_ID!);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'record_progress',
        Address.fromString(backendKeypair.publicKey()).toScVal(),
        Address.fromString(studentAddress).toScVal(),
        xdr.ScVal.scvSymbol(courseId),
        xdr.ScVal.scvU32(progressPct)
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(backendKeypair);
  await server.sendTransaction(prepared);
}
```

### Get BST Token Balance

```typescript
async function getTokenBalance(userAddress: string): Promise<bigint> {
  const account = await server.getAccount(userAddress);
  const contract = new Contract(process.env.TOKEN_CONTRACT_ID!);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call('balance', Address.fromString(userAddress).toScVal()))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationSuccess(result)) {
    return result.result!.retval.i128().lo().toBigInt();
  }
  throw new Error('Simulation failed');
}
```

---

## End-to-End Credential Issuance Flow

```
Student completes lesson
        │
        ▼
Backend: POST /v1/progress  ──► AnalyticsContract.record_progress(student, course, pct)
        │
        │  (pct == 100)
        ▼
AnalyticsContract emits  ──► event: analytics / completed
        │
        ▼
Backend listener detects completion
        │
        ▼
Backend: POST /v1/credentials/issue  (JWT or API key auth)
        │
        ▼
CredentialsService.issue()
  ├── CertificateContract.mint_certificate(admin, student, courseId, metadataUrl)
  └── TokenContract.mint(student, 100 BST)
        │
        ▼
Credential record saved to PostgreSQL (txHash stored)
        │
        ▼
Student dashboard: GET /v1/credentials/:userId  ──► shows new certificate
```

### Verifying a Credential

```bash
# Via API
curl https://api.brain-storm.com/v1/credentials/verify/<TX_HASH>

# Via Stellar CLI
stellar tx fetch --hash <TX_HASH> --network testnet
```
