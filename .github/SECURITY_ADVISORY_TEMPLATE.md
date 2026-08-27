---
name: "Security Vulnerability Report"
about: "Report a security vulnerability via GitHub's private vulnerability reporting feature"
labels: ["security"]
---

<!--
  STOP — read this before continuing.

  This form submits a PRIVATE security advisory visible only to repository
  maintainers. It is NOT a public issue.

  For urgent matters or if you prefer email, contact: security@stellar-raide-stellar-raide-airflex.io
  Full policy: https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/blob/main/SECURITY.md
-->

## Affected Component

<!--
  Select the component(s) affected by this vulnerability.
  Delete lines that do not apply.
-->

- [ ] Production API (server/)
- [ ] Soroban escrow contract (contracts/)
- [ ] Authentication / OTP flow
- [ ] Stellar wallet generation or key handling
- [ ] Frontend (frontend/)
- [ ] Paystack webhook handling
- [ ] Other (describe below)

---

## Vulnerability Description

<!--
  Describe the vulnerability clearly and concisely.
  What is the root cause? Why is it exploitable?
-->



---

## Steps to Reproduce

<!--
  Provide the minimum steps required to reproduce the issue.
  Include curl commands, scripts, or a proof-of-concept where possible.
-->

1.
2.
3.

---

## Impact

<!--
  What could an attacker achieve by exploiting this vulnerability?
  Examples: drain escrow funds, take over another user's account,
  bypass OTP verification, expose private keys.
-->



---

## Severity (your estimate)

- [ ] Critical — direct loss of user funds or mass account takeover
- [ ] High     — authenticated access to another user's data
- [ ] Medium   — security control bypass without immediate fund loss
- [ ] Low      — minor information disclosure or defence-in-depth gap

---

## Suggested Fix (optional)

<!--
  If you have a suggestion for how to fix the issue, describe it here.
  Code snippets are welcome.
-->



---

## Environment

| Field | Value |
|-------|-------|
| Affected version / commit | <!-- e.g. main @ abc1234 --> |
| Network | <!-- Testnet / Mainnet / Local --> |
| Reproduction environment | <!-- e.g. local dev, staging --> |

---

## Attachments

<!--
  Attach screenshots, logs, or exploit scripts here.
  Do NOT include real user credentials or private keys in this form.
  Send those via encrypted email to security@stellar-raide-stellar-raide-airflex.io instead.
-->



---

## Disclosure Preferences

- [ ] I consent to being credited in the published security advisory
- [ ] I would like to co-ordinate on a public write-up after the fix is deployed
- [ ] I prefer to remain anonymous
