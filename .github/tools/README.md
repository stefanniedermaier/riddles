# CI tools

Command-line tools used by `.github/workflows/deploy.yml`, pinned with checksums so that a
compromised release or download cannot change what runs in CI. Dependabot updates them.

| Tool                                                           | Pinned in                          | Job            |
| -------------------------------------------------------------- | ---------------------------------- | -------------- |
| [actionlint](https://github.com/rhysd/actionlint)              | `actionlint/go.mod` + `go.sum`     | `repo-lint`    |
| [editorconfig-checker](https://editorconfig-checker.github.io) | `editorconfig-checker/go.mod`      | `repo-lint`    |
| [zizmor](https://docs.zizmor.sh)                               | `zizmor/requirements.txt` (hashes) | `repo-lint`    |
| [gitleaks](https://github.com/gitleaks/gitleaks)               | `gitleaks/go.mod` + `go.sum`       | `secret-scan`  |
| [OSV-Scanner](https://google.github.io/osv-scanner/)           | `osv-scanner/go.mod` + `go.sum`    | `supply-chain` |

Go tools are built from source with the toolchain named in their `go.mod`; module and
toolchain downloads are verified against the Go checksum database. Each tool has its own
module so that its dependencies stay exactly as its authors tested them.

Run them locally (Go ≥ 1.21, network access to proxy.golang.org):

```bash
for tool in actionlint editorconfig-checker gitleaks osv-scanner; do
  GOTOOLCHAIN=auto go -C ".github/tools/$tool" build -trimpath -o "$PWD/.bin/" tool
done
.bin/actionlint && .bin/editorconfig-checker && .bin/gitleaks git --redact .
.bin/osv-scanner scan source --lockfile package-lock.json

python3 -m venv .venv && .venv/bin/pip install --require-hashes --only-binary :all: \
  -r .github/tools/zizmor/requirements.txt && .venv/bin/zizmor .github/workflows
```

To add or upgrade a Go tool by hand:
`cd .github/tools/<tool> && GOTOOLCHAIN=auto go get -tool <module>/cmd/<tool>@vX.Y.Z`.
