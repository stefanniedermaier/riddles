# CI tools

Security scanners used by `.github/workflows/deploy.yml`. Only GitHub-owned actions are
allowed in this repository, so these tools are not used as third-party actions but pinned here:

| Tool | Pinned in | Installed with |
| ---- | --------- | -------------- |
| [actionlint](https://github.com/rhysd/actionlint) | `actionlint/go.mod` | `go -C .github/tools/actionlint build -o <dir>/ tool` |
| [gitleaks](https://github.com/gitleaks/gitleaks) | `gitleaks/go.mod` | `go -C .github/tools/gitleaks build -o <dir>/ tool` |
| [OSV-Scanner](https://github.com/google/osv-scanner) | `osv-scanner/go.mod` | `go -C .github/tools/osv-scanner build -o <dir>/ tool` |
| [zizmor](https://github.com/zizmorcore/zizmor) | `zizmor/requirements.txt` | `pip install --require-hashes --no-deps -r .github/tools/zizmor/requirements.txt` |

Go tools are built from source; every module is verified against `go.sum` and the Go checksum
database. zizmor is installed only if its wheel matches one of the pinned SHA-256 hashes.
Dependabot (`gomod` and `pip`) proposes updates with a 7-day cooldown.

Run them locally from the repository root, e.g.:

```bash
go -C .github/tools/actionlint build -o "$PWD/.bin/" tool && .bin/actionlint
go -C .github/tools/gitleaks build -o "$PWD/.bin/" tool && .bin/gitleaks git --redact .
go -C .github/tools/osv-scanner build -o "$PWD/.bin/" tool && .bin/osv-scanner scan source --lockfile package-lock.json
```
