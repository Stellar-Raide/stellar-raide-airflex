# 🌀 AirFlex 
**The Decentralized P2P Airtime & Data Exchange Platform.**

AirFlex is a hybrid fintech and Web3 platform that allows users to convert excess airtime and data into liquid cash (and vice versa) using a Peer-to-Peer (P2P) marketplace. By leveraging the **Stellar Blockchain**, AirFlex ensures fast, transparent, and low-fee transactions.

---

## 🚀 Project Overview
AirFlex solves the "trapped value" problem in mobile credit. Whether a user mistakenly over-recharged their line or wants to purchase data at rates cheaper than official telco prices, AirFlex provides a secure escrow-backed environment to trade.

### Key Features
* **User Management:** Secure signup via phone number with OTP verification.
* **Virtual Wallets:** Instant creation of a dedicated virtual bank account for automated funding.
* **P2P Marketplace:** Buy and sell airtime/data directly with other users.
* **Web3 Integration:** Stellar-based tokens for stable value storage and smart-contract escrow.
* **Transaction Security:** 4-digit transaction PIN for all wallet movements.
* **Revenue Model:** Nominal fees on deposits and bank withdrawals.

---

## 🛠 Technical Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js, Tailwind CSS |
| **Backend** | Node.js (Express) |
| **Database** | PostgreSQL (Relational transactions) |
| **Blockchain** | **Stellar Network** (Asset Issuance & Soroban Smart Contracts) |
| **Payments** | Paystack API (Virtual Accounts & Payouts) |
| **SMS/OTP** | Termii |

---

## 🌊 Application Flow

### 1. Onboarding
1.  **Visit:** User lands on the AirFlex homepage.
2.  **Signup:** User registers with their **Phone Number** and a password.
3.  **Verify:** An **OTP** is sent to the phone number for verification.
4.  **Generation:** System automatically creates:
    * A **Virtual Wallet** in the app database.
    * A **Stellar Keypair** (Public/Private key) for Web3 transactions.
    * A **Virtual Bank Account** (e.g., Wema Bank) for Naira deposits.

### 2. Funding & Withdrawal
* **Funding:** User transfers Naira to their virtual account. A webhook triggers and updates the wallet balance.
* **Withdrawal:** User selects their bank from a dropdown, enters account details, and the system processes the payout via API after deducting the withdrawal fee.

### 3. P2P Exchange (The AirFlex Market)
* **Selling:** User lists airtime for sale. The app locks the asset in **Escrow**.
* **Buying:** Buyer accepts the trade. Once the airtime transfer is verified (via API or Proof of Transfer), the buyer's funds are released to the seller's wallet.
* **Blockchain Settlement:** Every trade can be settled using a Stellar-based stablecoin to ensure 100% transparency and auditability.

---

## ⛓ Stellar Blockchain Integration
AirFlex uses Stellar to provide a "trustless" layer for trades:
* **Asset Tokenization:** Airtime is represented as a custom Stellar asset (e.g., `AFX`).
* **Soroban Smart Contracts:** Rust-based contracts handle the Escrow, ensuring that the seller only gets paid when the buyer receives their data/airtime.
* **Near-Zero Fees:** Transactions on Stellar cost approximately 0.00001 XLM, allowing AirFlex to keep user costs extremely low.

---

## 🔒 Security Measures
* **Encrypted PINs:** All transaction PINs are hashed using `bcrypt`.
* **Escrow Protection:** Funds are never released until the trade conditions are met.
* **Rate Limiting:** Protects against brute-force attacks on OTP and PIN entry.

---

## 📈 Roadmap
- [ ] Phase 1: MVP with Virtual Accounts & Manual P2P.
- [ ] Phase 2: Integration of Stellar Smart Contracts for Escrow.
- [ ] Phase 3: Expansion to include Utility Bill payments (Electricity, Cable).
- [ ] Phase 4: Launch of AirFlex Mobile App (iOS/Android).
