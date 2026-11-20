# Security Policy

Riddles is a free, non-commercial hobby project. Security is still taken seriously:
this policy describes how to report vulnerabilities and what you can expect.

## Supported versions

Only the **latest released version** – the one currently deployed at
<https://stefanniedermaier.github.io/riddles/> – receives security fixes. Installed apps
update themselves (an *Update* banner appears), so there is no need to support older
versions. Support is provided on a best-effort basis as long as the project is maintained;
the end of maintenance will be announced in the README at least 3 months in advance.

| Version            | Supported          |
| ------------------ | ------------------ |
| latest (`main`)    | ✅                 |
| anything older     | ❌ – please update |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub:
**[Report a vulnerability](https://github.com/stefanniedermaier/riddles/security/advisories/new)**
(repository → *Security* → *Report a vulnerability*).

Please include:

- a description of the problem and its impact,
- steps to reproduce or a proof of concept,
- affected version / commit and browser / platform,
- whether the issue is already public or actively exploited.

## What happens next

| Step                         | Target                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Acknowledgement              | within 7 days                                             |
| Initial assessment           | within 14 days                                            |
| Fix for high / critical      | as fast as possible, aim: 30 days                         |
| Fix for moderate / low       | with the next regular release                             |
| Public disclosure            | after a fix is deployed, via a GitHub Security Advisory   |

You will be kept informed in the private advisory and credited in the advisory unless you
prefer to stay anonymous. Please give us reasonable time to fix the issue before
disclosing it publicly (coordinated vulnerability disclosure, default 90 days).

## Scope

In scope: the source code in this repository, the build and deployment pipeline, and the
deployed app on GitHub Pages.

Out of scope: vulnerabilities in browsers, operating systems or GitHub itself (please
report those to the respective vendor), and issues that require a compromised device.

## Security measures

See [docs/security.md](docs/security.md) for the security architecture, the supply-chain
safeguards, SBOM and build-provenance verification, and the project's voluntary alignment
with the EU Cyber Resilience Act.
