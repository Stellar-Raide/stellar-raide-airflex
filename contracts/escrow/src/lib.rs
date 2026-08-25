#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, Symbol,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    TradeCounter,
    Trade(u64),
    Paused,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum TradeStatus {
    Open,
    Locked,
    Completed,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TradeOffer {
    pub id: u64,
    pub seller: Address,
    pub buyer: Option<Address>,
    pub token: Address,       // USDC or NGNC contract address
    pub amount: i128,         // token amount in stroops (7 decimals)
    pub asset_type: Symbol,   // e.g. symbol_short!("AIRTIME")
    pub status: TradeStatus,
    pub expires_at: u64,      // Unix timestamp (ledger time)
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ContractError {
    ContractPaused,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

fn topic_created()   -> Symbol { symbol_short!("created")   }
fn topic_locked()    -> Symbol { symbol_short!("locked")    }
fn topic_completed() -> Symbol { symbol_short!("completed") }
fn topic_cancelled() -> Symbol { symbol_short!("cancelled") }
fn topic_disputed()  -> Symbol { symbol_short!("disputed")  }
fn topic_contract()  -> Symbol { symbol_short!("contract")  }
fn topic_paused()    -> Symbol { symbol_short!("paused")    }
fn topic_unpaused()  -> Symbol { symbol_short!("unpaused")  }

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn require_not_paused(env: &Env) {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if paused {
        panic!("ContractPaused");
    }
}

fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("not initialised")
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // -----------------------------------------------------------------------
    // Initialise — must be called once after deployment
    // -----------------------------------------------------------------------

    /// Sets the admin address and seeds the trade counter.
    /// Can only be called once (panics if already initialised).
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TradeCounter, &0u64);
        env.storage().instance().set(&DataKey::Paused, &false);
        // Bump instance TTL so it survives long-running trades
        env.storage().instance().extend_ttl(17_280, 17_280 * 30);
    }

    // -----------------------------------------------------------------------
    // pause / unpause — admin-only circuit breakers
    // -----------------------------------------------------------------------

    /// Halts all state-mutating operations. Only callable by admin.
    /// Emits a `topics: ["contract", "paused"]` event.
    pub fn pause(env: Env) {
        let admin = get_admin(&env);
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &true);

        env.events()
            .publish((topic_contract(), topic_paused()), ());
    }

    /// Resumes normal operations. Only callable by admin.
    /// Emits a `topics: ["contract", "unpaused"]` event.
    pub fn unpause(env: Env) {
        let admin = get_admin(&env);
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &false);

        env.events()
            .publish((topic_contract(), topic_unpaused()), ());
    }

    // -----------------------------------------------------------------------
    // create_listing — called by the Seller
    // -----------------------------------------------------------------------

    /// Registers a new trade offer on the ledger.
    ///
    /// * `seller`     — seller's Stellar address (must sign)
    /// * `token`      — address of the payment token contract (e.g. USDC)
    /// * `amount`     — token amount the buyer must pay (in base units)
    /// * `asset_type` — short symbol describing what is being sold
    /// * `expires_at` — Unix timestamp after which the trade is void
    ///
    /// Returns the new trade ID.
    pub fn create_listing(
        env: Env,
        seller: Address,
        token: Address,
        amount: i128,
        asset_type: Symbol,
        expires_at: u64,
    ) -> u64 {
        require_not_paused(&env);
        seller.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let now = env.ledger().timestamp();
        if expires_at <= now {
            panic!("expires_at must be in the future");
        }

        // Increment the global trade counter
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TradeCounter)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::TradeCounter, &id);

        let trade = TradeOffer {
            id,
            seller: seller.clone(),
            buyer: None,
            token,
            amount,
            asset_type: asset_type.clone(),
            status: TradeStatus::Open,
            expires_at,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Trade(id), &trade);
        // Keep the trade entry alive for at least 30 days of ledgers
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Trade(id), 17_280, 17_280 * 30);

        env.events()
            .publish((topic_created(), asset_type), (id, seller, amount));

        id
    }

    // -----------------------------------------------------------------------
    // deposit_to_escrow — called by the Buyer
    // -----------------------------------------------------------------------

    /// Locks the buyer's funds into the contract for a specific trade.
    ///
    /// Transfers `trade.amount` tokens from `buyer` → contract.
    /// Sets trade status to `Locked`.
    pub fn deposit_to_escrow(env: Env, buyer: Address, trade_id: u64) {
        require_not_paused(&env);
        buyer.require_auth();

        let mut trade: TradeOffer = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found");

        if trade.status != TradeStatus::Open {
            panic!("trade is not open");
        }

        let now = env.ledger().timestamp();
        if now >= trade.expires_at {
            panic!("trade has expired");
        }

        if buyer == trade.seller {
            panic!("seller cannot buy own trade");
        }

        // Pull funds from buyer into the contract
        let token_client = token::Client::new(&env, &trade.token);
        token_client.transfer(&buyer, &env.current_contract_address(), &trade.amount);

        trade.buyer = Some(buyer.clone());
        trade.status = TradeStatus::Locked;

        env.storage()
            .persistent()
            .set(&DataKey::Trade(trade_id), &trade);

        env.events()
            .publish((topic_locked(),), (trade_id, buyer));
    }

    // -----------------------------------------------------------------------
    // release_payment — called by the Backend / Oracle after delivery
    // -----------------------------------------------------------------------

    /// Releases escrowed funds to the seller once delivery is confirmed.
    ///
    /// Only the admin account can call this to prevent premature release.
    pub fn release_payment(env: Env, trade_id: u64) {
        require_not_paused(&env);

        let admin = get_admin(&env);
        admin.require_auth();

        let mut trade: TradeOffer = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found");

        if trade.status != TradeStatus::Locked {
            panic!("trade is not in Locked state");
        }

        // Push funds from contract to seller
        let token_client = token::Client::new(&env, &trade.token);
        token_client.transfer(
            &env.current_contract_address(),
            &trade.seller,
            &trade.amount,
        );

        trade.status = TradeStatus::Completed;
        env.storage()
            .persistent()
            .set(&DataKey::Trade(trade_id), &trade);

        env.events()
            .publish((topic_completed(),), (trade_id, trade.seller));
    }

    // -----------------------------------------------------------------------
    // cancel_and_refund — called by Buyer (after timeout) or Admin
    // -----------------------------------------------------------------------

    /// Returns escrowed funds to the buyer and marks the trade Cancelled.
    ///
    /// Can be called by:
    /// - The buyer, if the trade is Locked and has passed its expiry
    /// - The admin, at any point (for dispute resolution)
    pub fn cancel_and_refund(env: Env, caller: Address, trade_id: u64) {
        require_not_paused(&env);
        caller.require_auth();

        let admin = get_admin(&env);

        let mut trade: TradeOffer = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found");

        if trade.status != TradeStatus::Locked && trade.status != TradeStatus::Disputed {
            panic!("trade cannot be refunded in its current state");
        }

        let now = env.ledger().timestamp();
        let is_admin = caller == admin;
        let is_buyer = trade
            .buyer
            .as_ref()
            .map(|b| *b == caller)
            .unwrap_or(false);

        if !is_admin && !is_buyer {
            panic!("only admin or buyer can cancel");
        }

        // Buyer self-refund only allowed after the trade expiry (24 h timelock)
        if is_buyer && !is_admin && now < trade.expires_at {
            panic!("timelock has not expired yet");
        }

        let buyer = trade.buyer.clone().expect("no buyer recorded");

        // Return funds to the buyer
        let token_client = token::Client::new(&env, &trade.token);
        token_client.transfer(
            &env.current_contract_address(),
            &buyer,
            &trade.amount,
        );

        trade.status = TradeStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Trade(trade_id), &trade);

        env.events()
            .publish((topic_cancelled(),), (trade_id, buyer));
    }

    // -----------------------------------------------------------------------
    // flag_dispute — called by Buyer or Seller
    // -----------------------------------------------------------------------

    /// Flags a Locked trade as Disputed so the admin can intervene.
    pub fn flag_dispute(env: Env, caller: Address, trade_id: u64) {
        require_not_paused(&env);
        caller.require_auth();

        let mut trade: TradeOffer = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found");

        if trade.status != TradeStatus::Locked {
            panic!("only a Locked trade can be disputed");
        }

        let is_party = caller == trade.seller
            || trade
                .buyer
                .as_ref()
                .map(|b| *b == caller)
                .unwrap_or(false);

        if !is_party {
            panic!("only trade parties can flag a dispute");
        }

        trade.status = TradeStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Trade(trade_id), &trade);

        env.events()
            .publish((topic_disputed(),), (trade_id, caller));
    }

    // -----------------------------------------------------------------------
    // View helpers  (NOT blocked by paused flag)
    // -----------------------------------------------------------------------

    /// Returns a trade offer by ID.
    pub fn get_trade(env: Env, trade_id: u64) -> TradeOffer {
        env.storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .expect("trade not found")
    }

    /// Returns the current trade counter (total trades ever created).
    pub fn trade_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TradeCounter)
            .unwrap_or(0u64)
    }

    /// Returns the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialised")
    }

    /// Returns whether the contract is currently paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env,
    };

    fn setup() -> (Env, EscrowContractClient<'static>, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);

        // Deploy a mock token
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_id.address();
        let sac = StellarAssetClient::new(&env, &token_address);

        // Mint tokens to buyer
        sac.mint(&buyer, &10_000_0000000i128);

        client.initialize(&admin);

        (env, client, admin, seller, buyer, token_address)
    }

    // -----------------------------------------------------------------------
    // Existing functional tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_create_listing() {
        let (env, client, _admin, seller, _buyer, token) = setup();

        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400), // +24h
        );

        assert_eq!(trade_id, 1);
        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Open);
        assert_eq!(trade.seller, seller);
    }

    #[test]
    fn test_deposit_to_escrow() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );

        client.deposit_to_escrow(&buyer, &trade_id);

        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Locked);
        assert_eq!(trade.buyer, Some(buyer));
    }

    #[test]
    fn test_release_payment() {
        let (env, client, admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("DATA"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);
        client.release_payment(&trade_id);

        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Completed);

        // Verify seller received funds
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&seller), 500_0000000i128);
    }

    #[test]
    fn test_cancel_and_refund_after_expiry() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);

        // Advance time past expiry
        env.ledger().with_mut(|l| l.timestamp = 1_000_000 + 86_401);

        client.cancel_and_refund(&buyer, &trade_id);

        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Cancelled);

        // Verify buyer was refunded
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&buyer), 10_000_0000000i128);
    }

    #[test]
    #[should_panic(expected = "timelock has not expired yet")]
    fn test_cancel_before_expiry_fails() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);

        // Try to cancel before expiry — must panic
        client.cancel_and_refund(&buyer, &trade_id);
    }

    // -----------------------------------------------------------------------
    // Pausability tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_pause_and_unpause() {
        let (_env, client, _admin, _seller, _buyer, _token) = setup();

        // Initially not paused
        assert!(!client.is_paused());

        // Pause
        client.pause();
        assert!(client.is_paused());

        // Unpause
        client.unpause();
        assert!(!client.is_paused());
    }

    #[test]
    #[should_panic(expected = "ContractPaused")]
    fn test_create_listing_blocked_when_paused() {
        let (env, client, _admin, seller, _buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        client.pause();

        client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );
    }

    #[test]
    #[should_panic(expected = "ContractPaused")]
    fn test_deposit_to_escrow_blocked_when_paused() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );

        client.pause();

        client.deposit_to_escrow(&buyer, &trade_id);
    }

    #[test]
    #[should_panic(expected = "ContractPaused")]
    fn test_release_payment_blocked_when_paused() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("DATA"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);

        client.pause();

        client.release_payment(&trade_id);
    }

    #[test]
    #[should_panic(expected = "ContractPaused")]
    fn test_cancel_and_refund_blocked_when_paused() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);

        // Advance past expiry
        env.ledger().with_mut(|l| l.timestamp = 1_000_000 + 86_401);

        client.pause();

        client.cancel_and_refund(&buyer, &trade_id);
    }

    #[test]
    #[should_panic(expected = "ContractPaused")]
    fn test_flag_dispute_blocked_when_paused() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );
        client.deposit_to_escrow(&buyer, &trade_id);

        client.pause();

        client.flag_dispute(&buyer, &trade_id);
    }

    #[test]
    fn test_read_only_views_not_blocked_when_paused() {
        let (env, client, _admin, seller, _buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );

        client.pause();

        // These should all succeed even while paused
        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.id, trade_id);

        let count = client.trade_count();
        assert_eq!(count, 1);

        let admin = client.get_admin();
        assert!(!admin.to_string().is_empty());

        assert!(client.is_paused());
    }

    #[test]
    fn test_operations_resume_after_unpause() {
        let (env, client, _admin, seller, buyer, token) = setup();
        env.ledger().with_mut(|l| l.timestamp = 1_000_000);

        // Pause and then unpause
        client.pause();
        client.unpause();

        // Should be able to create a listing again
        let trade_id = client.create_listing(
            &seller,
            &token,
            &500_0000000i128,
            &symbol_short!("AIRTIME"),
            &(1_000_000 + 86_400),
        );

        // And deposit
        client.deposit_to_escrow(&buyer, &trade_id);

        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Locked);
    }

    #[test]
    #[should_panic(expected = "not initialised")]
    fn test_pause_fails_if_not_initialised() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        // Calling pause without initializing should panic
        client.pause();
    }
}
