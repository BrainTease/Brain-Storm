use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SharedError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InvalidPercentage = 5,
    NotFound = 6,
    AlreadyExists = 7,
    ContractPaused = 8,
    ReentrantCall = 9,
    ProposalExpired = 10,
    ProposalAlreadyExecuted = 11,
    InsufficientApprovals = 12,
    InvalidTimestamp = 13,
    EmptyString = 14,
}
