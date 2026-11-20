# Security

This document describes how Riddles is built and operated securely ("security first"),
how vulnerabilities are handled, and how the project relates to the EU Cyber Resilience
Act (CRA). For reporting a vulnerability see [SECURITY.md](../SECURITY.md).

## 1. Product overview and threat model

| Aspect            | Riddles                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| What it is        | Static PWA (HTML/JS/CSS) with three offline puzzle games                       |
| Backend           | none – no server-side code, no API, no accounts                                |
| Network           | only GitHub Pages (initial download, update checks); no third-party requests  |
| Data              | settings, saved games and statistics in `localStorage` on the device only     |
| Personal data     | none collected or transmitted (see [privacy](privacy.md))                     |
| Inputs            | taps/keys, and an optional user-selected backup JSON file (import)             |

Relevant threats and mitigations:

| Threat                                              | Mitigation                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Malicious/compromised npm package in the build      | lockfile from registry only with sha512, `npm ci --ignore-scripts`, registry signature + provenance check, `npm audit`, dependency review, Dependabot with cooldown, `min-release-age` |
| Compromised GitHub Action / CI token misuse         | actions pinned to commit SHAs, only GitHub-owned actions allowed, read-only default token, no persisted credentials |
| Tampered deployment                                 | deploy only from protected `main` after all checks; signed build-provenance and SBOM attestations |
| Unreviewed or forged changes on `main`              | branch ruleset: pull request required, required status checks, signed commits, linear history, no force-push/deletion |
| Cross-site scripting / injected scripts             | Vue template escaping, no `v-html`, no `eval`; strict Content-Security-Policy (`script-src 'self'` + hash, `object-src 'none'`, `base-uri 'self'`) |
| Malicious backup file on import                     | JSON parse only (no code), format/app-id validation, values only written to own `riddles:*` keys, explicit confirmation |
| Leaking data to third parties                       | no third-party resources, `connect-src 'self'`, `Referrer-Policy: no-referrer`                  |
| Secrets in the repository                           | none needed; GitHub secret scanning with push protection                                        |

## 2. Secure development and build

- All changes reach `main` through pull requests with required checks (see §4).
- CI gates (details in [deployment](deployment.md#supply-chain-safeguards)):
  supply-chain checks, CodeQL (`security-extended`), lint, type-check, unit tests, build.
- Dependencies: few runtime dependencies (Vue, Vue Router); runtime licenses restricted to
  permissive ones; weekly Dependabot updates.
- Secure defaults in the app: no permissions requested, works offline, data stays local,
  reduced attack surface (no backend, no forms, no external links except the source code).

## 3. SBOM and build provenance

Every deployment publishes a CycloneDX SBOM of all shipped components at
<https://stefanniedermaier.github.io/riddles/sbom.cdx.json> and creates signed
attestations (Sigstore, GitHub Artifact Attestations) for every deployed file:

```bash
# Verify that a deployed file was built from this repository by the CI workflow
curl -sO https://stefanniedermaier.github.io/riddles/index.html
gh attestation verify index.html --repo stefanniedermaier/riddles

# Also check the SBOM attestation
gh attestation verify index.html --repo stefanniedermaier/riddles \
  --predicate-type https://cyclonedx.org/bom
```

`gh attestation` requires GitHub CLI ≥ 2.49. Alternatively query the API directly:
`gh api repos/stefanniedermaier/riddles/attestations/sha256:$(sha256sum index.html | cut -d' ' -f1)`.

Locally, an SBOM can be generated with
`npm sbom --omit=dev --sbom-format=cyclonedx --sbom-type=application`.

## 4. Repository configuration

The GitHub repository settings are documented as code and can be (re-)applied with
[`scripts/github/configure-repo.sh`](../scripts/github/configure-repo.sh):

| Area                    | Setting                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Branch `main` (ruleset) | PR required (squash only, conversations resolved, stale approvals dismissed), required checks *Supply chain*, *CodeQL*, *Lint, test & build*, *Dependency review*, code-scanning results (no high/critical alerts), signed commits, linear history, no force-push, no deletion, **no bypass** |
| Tags `v*` (ruleset)     | signed, immutable (no update, no deletion, no force-push)                                 |
| Security features       | private vulnerability reporting, Dependabot alerts + security updates, secret scanning + push protection, CodeQL advanced setup (`security-extended` in CI; GitHub's default setup disabled) |
| Actions                 | only GitHub-owned actions, SHA pinning required, read-only default `GITHUB_TOKEN`, Actions cannot approve PRs, approval required for all external contributors' workflow runs |
| Environment             | `github-pages` deployable from `main` only                                               |
| Pages                   | built by GitHub Actions, HTTPS enforced                                                  |
| Repository              | squash merge only, branches deleted after merge, wiki and projects disabled              |

## 5. Vulnerability handling process

Aligned with CRA Annex I Part II:

1. **Intake** – private report via GitHub (SECURITY.md), Dependabot/CodeQL/secret-scanning
   alerts, or upstream advisories.
2. **Triage** within 14 days – reproduce, rate with CVSS, identify affected versions.
3. **Fix** in a private security advisory fork; regression test added.
4. **Release** – merge through the normal protected pipeline; installed apps receive the
   update automatically (update banner).
5. **Disclose** – publish the GitHub Security Advisory (request a CVE through GitHub when
   appropriate), credit the reporter, note it in the [changelog](../CHANGELOG.md).
6. **Learn** – add checks/tests that would have caught the issue.

Actively exploited vulnerabilities are handled with the highest priority. If the project
ever falls under the CRA (see §6), the reporting obligations to the CSIRT/ENISA (early
warning within 24 h, notification within 72 h, final report within 14 days after a fix)
apply in addition.

## 6. EU Cyber Resilience Act (CRA)

### Applicability

The CRA (Regulation (EU) 2024/2847) applies to products with digital elements made
available on the EU market **in the course of a commercial activity**. Riddles is a free,
open-source hobby project: it is not monetised (no prices, ads, paid features or use of
personal data), and it is not supplied as part of a commercial product or service.
According to Art. 2 and recitals 18–19 it is therefore **outside the scope** of the CRA,
and the maintainer is not a manufacturer or open-source software steward within its
meaning. (This is a self-assessment, not legal advice.)

This assessment must be revisited if the project is ever monetised, offered as part of a
commercial service, or maintained by a legal entity for commercial use.

### Voluntary alignment with Annex I

Even though not legally required, the project follows the CRA's essential requirements as
good practice:

| Annex I requirement                                                     | How Riddles addresses it                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| I.1 Appropriate level of cybersecurity based on risk                    | threat model §1; minimal architecture without backend                        |
| I.2(a) No known exploitable vulnerabilities on release                  | `npm audit` gates, dependency review, CodeQL; deploy blocked otherwise       |
| I.2(b) Secure by default configuration                                  | no permissions, no network beyond self, strict CSP, local data only          |
| I.2(c) Security updates, automatic where possible                       | service worker update banner; Dependabot security updates                    |
| I.2(d) Protection against unauthorised access                           | no accounts or remote interfaces; repository and deployment protected (§4)   |
| I.2(e) Confidentiality of data                                          | data never leaves the device; HTTPS only                                     |
| I.2(f) Integrity of data and code                                       | SRI-like lockfile integrity, signed commits, signed provenance attestations, import validation |
| I.2(g) Data minimisation                                                | only game state and settings are stored                                      |
| I.2(h) Availability / resilience                                        | fully offline-capable after first load                                      |
| I.2(i) Minimise impact on other services                                | no requests to third parties                                                 |
| I.2(j) Limit attack surfaces                                            | static site, few dependencies, no `eval`/`v-html`, no inline scripts except one hashed |
| I.2(k) Reduce impact of incidents (exploitation mitigation)             | CSP, origin isolation of the PWA                                             |
| I.2(l) Security monitoring / logging                                    | not applicable client-side (no backend); CI and alert logs on GitHub         |
| I.2(m) Secure removal of data                                           | *Settings → Delete all data*; uninstall clears storage                       |
| II.1 Identify and document components (SBOM)                            | CycloneDX SBOM per deployment + attestation (§3)                             |
| II.2 Address vulnerabilities without delay, provide updates            | process §5, Dependabot                                                       |
| II.3 Regular security testing                                           | CodeQL, audits and tests on every change and weekly via Dependabot PRs       |
| II.4 Public disclosure of fixed vulnerabilities                         | GitHub Security Advisories, changelog                                        |
| II.5 Coordinated vulnerability disclosure policy                        | [SECURITY.md](../SECURITY.md)                                                |
| II.6 Contact address for reporting                                      | GitHub private vulnerability reporting                                       |
| II.7 Secure distribution of updates                                     | HTTPS-only GitHub Pages, signed provenance                                   |
| II.8 Updates free of charge, with advisory information                  | always free; advisories published                                            |

### User information (Annex II, voluntary)

| Item                                   | Information                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Maintainer                             | Stefan Niedermaier, <https://github.com/stefanniedermaier>               |
| Point of contact for vulnerabilities   | [GitHub private vulnerability reporting](https://github.com/stefanniedermaier/riddles/security/advisories/new) |
| Product identification                 | Riddles, version shown in *Settings → About*                             |
| Intended purpose                       | casual puzzle games for personal use                                     |
| Support period                         | latest version only, best effort while maintained (see SECURITY.md)      |
| Installing security updates            | automatic; tap *Update* when the banner appears                          |
| SBOM                                   | `/riddles/sbom.cdx.json` on the deployed site                            |
| Secure decommissioning                 | *Settings → Delete all data*, then remove the app                        |
