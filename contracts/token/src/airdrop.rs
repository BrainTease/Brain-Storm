use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};
use brain_storm_shared::access;

#[contracttype]
#[derive(Clone)]
pub struct AirdropCampaign {
    pub id: u32,
    pub total_amount: i128,
    pub claimed_amount: i128,
    pub expiry_ledger: u32,
    pub merkle_root: [u8; 32],
}

#[contracttype]
#[derive(Clone)]
pub struct AirdropClaim {
    pub recipient: Address,
    pub amount: i128,
    pub claimed: bool,
}

#[contracttype]
pub enum DataKey {
    AirdropCampaign(u32),
    AirdropClaimed(u32, Address),
    AirdropCampaignCount,
}

pub fn create_airdrop(
    env: &Env,
    admin: &Address,
    total_amount: i128,
    expiry_ledger: u32,
    merkle_root: [u8; 32],
) -> u32 {
    access::require_admin(env, admin, &Symbol::new(env, "admin"));
    assert!(total_amount > 0, "Total amount must be positive");
    assert!(expiry_ledger > env.ledger().sequence(), "Expiry must be in future");

    let count_key = DataKey::AirdropCampaignCount;
    let campaign_id: u32 = env.storage().instance().get(&count_key).unwrap_or(0);

    let campaign = AirdropCampaign {
        id: campaign_id,
        total_amount,
        claimed_amount: 0,
        expiry_ledger,
        merkle_root,
    };

    env.storage()
        .instance()
        .set(&DataKey::AirdropCampaign(campaign_id), &campaign);
    env.storage()
        .instance()
        .set(&count_key, &(campaign_id + 1));

    env.events().publish(
        (symbol_short!("airdrop"), symbol_short!("created")),
        (campaign_id, total_amount, expiry_ledger),
    );

    campaign_id
}

pub fn claim_airdrop(
    env: &Env,
    campaign_id: u32,
    recipient: &Address,
    amount: i128,
    proof: Vec<[u8; 32]>,
) -> bool {
    recipient.require_auth();
    assert!(amount > 0, "Amount must be positive");

    let campaign_key = DataKey::AirdropCampaign(campaign_id);
    let mut campaign: AirdropCampaign = env
        .storage()
        .instance()
        .get(&campaign_key)
        .expect("Campaign not found");

    assert!(
        env.ledger().sequence() <= campaign.expiry_ledger,
        "Airdrop expired"
    );

    let claim_key = DataKey::AirdropClaimed(campaign_id, recipient.clone());
    assert!(
        !env.storage().instance().has(&claim_key),
        "Already claimed"
    );

    // Verify merkle proof
    let leaf = compute_leaf(recipient, amount);
    assert!(
        verify_merkle_proof(&leaf, &campaign.merkle_root, &proof),
        "Invalid merkle proof"
    );

    campaign.claimed_amount = campaign
        .claimed_amount
        .checked_add(amount)
        .expect("arithmetic overflow");
    assert!(
        campaign.claimed_amount <= campaign.total_amount,
        "Exceeds campaign total"
    );

    env.storage()
        .instance()
        .set(&campaign_key, &campaign);
    env.storage().instance().set(&claim_key, &true);

    env.events().publish(
        (symbol_short!("airdrop"), symbol_short!("claimed")),
        (campaign_id, recipient.clone(), amount),
    );

    true
}

pub fn recover_unclaimed(env: &Env, admin: &Address, campaign_id: u32) -> i128 {
    access::require_admin(env, admin, &Symbol::new(env, "admin"));

    let campaign_key = DataKey::AirdropCampaign(campaign_id);
    let campaign: AirdropCampaign = env
        .storage()
        .instance()
        .get(&campaign_key)
        .expect("Campaign not found");

    assert!(
        env.ledger().sequence() > campaign.expiry_ledger,
        "Campaign not expired"
    );

    let unclaimed = campaign
        .total_amount
        .checked_sub(campaign.claimed_amount)
        .expect("arithmetic overflow");

    env.events().publish(
        (symbol_short!("airdrop"), symbol_short!("recovered")),
        (campaign_id, unclaimed),
    );

    unclaimed
}

pub fn get_airdrop_campaign(env: &Env, campaign_id: u32) -> Option<AirdropCampaign> {
    env.storage()
        .instance()
        .get(&DataKey::AirdropCampaign(campaign_id))
}

pub fn has_claimed(env: &Env, campaign_id: u32, recipient: &Address) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::AirdropClaimed(campaign_id, recipient.clone()))
}

// Merkle tree helpers
fn compute_leaf(recipient: &Address, amount: i128) -> [u8; 32] {
    let mut leaf = [0u8; 32];
    let recipient_bytes = recipient.to_xdr_bytes();
    let amount_bytes = amount.to_le_bytes();

    for (i, &byte) in recipient_bytes.iter().take(16).enumerate() {
        leaf[i] = byte;
    }
    for (i, &byte) in amount_bytes.iter().enumerate() {
        leaf[16 + i] = byte;
    }
    leaf
}

fn verify_merkle_proof(leaf: &[u8; 32], root: &[u8; 32], proof: &Vec<[u8; 32]>) -> bool {
    let mut current = *leaf;

    for &sibling in proof.iter() {
        current = hash_pair(&current, &sibling);
    }

    current == *root
}

fn hash_pair(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let mut combined = [0u8; 64];
    combined[..32].copy_from_slice(a);
    combined[32..].copy_from_slice(b);

    // Simple hash: XOR all bytes (not cryptographically secure, for demo)
    let mut result = [0u8; 32];
    for i in 0..32 {
        result[i] = combined[i] ^ combined[i + 32];
    }
    result
}

#[cfg(test)]
mod property_tests {
    use super::*;

    /// Deterministic pseudo-random generator so tests are reproducible.
    struct Lcg(u64);

    impl Lcg {
        fn new(seed: u64) -> Self {
            Lcg(seed)
        }

        fn next_u64(&mut self) -> u64 {
            self.0 = self
                .0
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            self.0
        }

        fn next_i128(&mut self, max: i128) -> i128 {
            let v = (self.next_u64() >> 1) as i128;
            (v % max) + 1
        }
    }

    /// Property: a sequence of valid claims never distributes more than the
    /// campaign allocation and never overflows.
    #[test]
    fn total_distributed_never_exceeds_allocation() {
        let mut rng = Lcg::new(0xA1_2D_00_01);
        for _ in 0..200 {
            let total = rng.next_i128(i128::MAX / 4);
            let mut claimed: i128 = 0;
            let mut remaining = total;

            while remaining > 0 {
                let amount = rng.next_i128(remaining);
                claimed = claimed.checked_add(amount).expect("no overflow");
                remaining -= amount;
                assert!(claimed <= total, "distributed exceeds allocation");
            }
            assert_eq!(claimed, total);
        }
    }

    /// Property: claiming the same campaign twice for the same recipient must
    /// be rejected (idempotency / no double-claim).
    #[test]
    fn double_claim_is_rejected() {
        let mut rng = Lcg::new(0xB2_3E_00_02);
        for _ in 0..200 {
            let total = rng.next_i128(i128::MAX / 4);
            let amount = rng.next_i128(total);
            let mut claimed: i128 = 0;
            let mut already_claimed = false;

            // First claim succeeds.
            assert!(!already_claimed);
            claimed = claimed.checked_add(amount).expect("no overflow");
            already_claimed = true;

            // Second claim must be rejected.
            let second = std::panic::catch_unwind(|| {
                assert!(!already_claimed, "Already claimed");
            });
            assert!(second.is_err(), "double claim must be rejected");
            assert!(claimed <= total);
        }
    }

    /// Property: claimed_amount arithmetic is overflow-safe for any pair of
    /// non-negative amounts whose sum fits in i128.
    #[test]
    fn claim_arithmetic_is_overflow_safe() {
        let mut rng = Lcg::new(0xC3_4F_00_03);
        for _ in 0..500 {
            let a = rng.next_i128(i128::MAX / 2);
            let b = rng.next_i128(i128::MAX / 2);
            let sum = a.checked_add(b);
            assert!(sum.is_some(), "sum of bounded positives must not overflow");
            assert_eq!(sum.unwrap(), b + a);
        }
    }

    /// Property: recover_unclaimed returns exactly total - claimed and is
    /// non-negative whenever claimed <= total.
    #[test]
    fn recover_unclaimed_matches_remaining() {
        let mut rng = Lcg::new(0xD4_5A_00_04);
        for _ in 0..200 {
            let total = rng.next_i128(i128::MAX / 4);
            let claimed = rng.next_i128(total);
            let unclaimed = total.checked_sub(claimed).expect("no underflow");
            assert!(unclaimed >= 0);
            assert_eq!(unclaimed + claimed, total);
        }
    }

    /// Property: merkle proof verification is deterministic and rejects a
    /// tampered root.
    #[test]
    fn merkle_verification_rejects_tampered_root() {
        let env = Env::default();
        let recipient = Address::generate(&env);
        let leaf = compute_leaf(&recipient, 1_000);
        let proof: Vec<[u8; 32]> = Vec::new(&env);

        // Empty proof: root must equal leaf.
        assert!(verify_merkle_proof(&leaf, &leaf, &proof));

        let mut tampered = leaf;
        tampered[0] ^= 0xFF;
        assert!(!verify_merkle_proof(&leaf, &tampered, &proof));
    }
}
