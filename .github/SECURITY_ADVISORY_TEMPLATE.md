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

  What to expect after submitting (see SECURITY.md → Response SLAs):
    - Acknowledgement within 48 hours
    - Triage and severity classification within 5 business days
    - Progress updates at least every 7 days
    - Resolution within: Critical 7 days · High 30 days · Medium 60 days · Low 90 days
      (measured from the end of triage)
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

<!--
  Maintainers confirm the final severity during triage (within 5 business days).
  The confirmed severity sets the resolution SLA.
-->

- [ ] Critical (CVSS 9.0–10.0) — direct loss of user funds or mass account takeover · resolution SLA 7 days
- [ ] High     (CVSS 7.0–8.9)  — authenticated access to another user's data · resolution SLA 30 days
- [ ] Medium   (CVSS 4.0–6.9)  — security control bypass without immediate fund loss · resolution SLA 60 days
- [ ] Low      (CVSS 0.1–3.9)  — minor information disclosure or defence-in-depth gap · resolution SLA 90 days

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

<!--
  Coordinated disclosure (SECURITY.md → Coordinated Disclosure): public
  disclosure is permitted once the advisory is published (fix + 7 days), or
  90 days after this report, whichever comes first — unless an extension is
  agreed in writing.
-->

- [ ] I agree to the coordinated disclosure timeline in SECURITY.md
- [ ] I consent to being credited in the published security advisory
- [ ] I would like to co-ordinate on a public write-up after the fix is deployed
- [ ] I prefer to remain anonymous
