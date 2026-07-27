use soroban_sdk::contracterror;

/// Standardized error codes for all contracts in the Brain-Storm protocol.
/// These error codes are used across all contracts to provide consistent error handling.
#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SharedError {
    // Initialization & State (1-10)
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidState = 3,

    // Authorization & Access Control (11-20)
    Unauthorized = 11,
    AdminOnly = 12,
    CuratorOnly = 13,
    InvalidRole = 14,

    // Validation Errors (21-40)
    InvalidAmount = 21,
    InvalidPercentage = 22,
    InvalidTimestamp = 23,
    EmptyString = 24,
    InvalidCredential = 25,
    InvalidMetadata = 26,

    // State & Data (41-60)
    NotFound = 41,
    AlreadyExists = 42,
    AlreadyPaused = 43,
    NotPaused = 44,

    // Contract State (61-70)
    ContractPaused = 61,
    ReentrantCall = 62,
    OperationBlocked = 63,

    // Proposals & Governance (71-90)
    ProposalExpired = 71,
    ProposalAlreadyExecuted = 72,
    InsufficientApprovals = 73,
    ProposalNotFound = 74,

    // Limits & Restrictions (91-110)
    LimitExceeded = 91,
    BlacklisterError = 92,
    WhitelistError = 93,
    TransferDenied = 94,
    ApprovalRequired = 95,

    // Credential & Metadata Specific (111-130)
    CredentialExpired = 111,
    CredentialNotValid = 112,
    CredentialCannotRenew = 113,
    HashMismatch = 114,

    // NFT & Linkage (131-150)
    NFTContractNotSet = 131,
    NFTMintFailed = 132,
    LinkageNotFound = 133,

    // General Errors (200+)
    OperationFailed = 200,
}
