# Contributing to Riddles

Thanks for your interest! Riddles is a small, non-commercial hobby project: free puzzle
games as an offline Progressive Web App, without accounts, backend or tracking. Bug
reports, ideas and pull requests are all welcome.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) in every interaction.

## Ways to contribute

| You want to …                     | Please …                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| report a bug                      | open a [bug report](https://github.com/stefanniedermaier/riddles/issues/new?template=bug_report.yml) – app version (*Settings → About*), device and browser help a lot |
| report an accessibility barrier   | open an [accessibility report](https://github.com/stefanniedermaier/riddles/issues/new?template=accessibility.yml) – see [ACCESSIBILITY.md](ACCESSIBILITY.md) |
| suggest a feature or a new game   | open a [feature request](https://github.com/stefanniedermaier/riddles/issues/new?template=feature_request.yml) first, before writing code |
| report a security vulnerability   | **do not open an issue** – report privately as described in [SECURITY.md](SECURITY.md)   |
| fix a typo or a small bug         | open a pull request directly                                                              |

For anything bigger than a small fix, please open an issue first, so we can agree on the
approach before you put time into it.

## Development setup

Requirements: **Node.js 26** (see [`.nvmrc`](.nvmrc)) and npm.

```bash
nvm use
npm ci
npm run dev
```

The dev server is reachable from a phone in the same network. All scripts, the testing
approach and debugging tips are in [docs/development.md](docs/development.md); the
structure of the app and of a game module in [docs/architecture.md](docs/architecture.md).

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change – small, focused pull requests are easiest to review.
3. Run the checks locally:

   ```bash
   npm test
   npm run lint
   npm run type-check
   npm run knip
   ```

   For UI changes also run the end-to-end and accessibility tests:

   ```bash
   npm run build-only
   npm run test:e2e
   ```

4. Open the pull request and fill in the checklist of the template.

`main` is protected: every change goes through a pull request with passing checks,
**signed commits** and a linear history (squash merge). See
[docs/security.md](docs/security.md) for all required checks.

## Guidelines

- **Game logic stays pure.** Everything in `src/games/<id>/logic/` is framework-free
  TypeScript with unit tests; Vue components only render state and forward input.
  Generators take a seed, so every puzzle is reproducible.
- **Tests.** New logic and bug fixes come with tests next to the code (`__tests__/`).
- **Both languages.** Every user-facing text exists in English **and** German.
- **Accessibility.** Follow [ACCESSIBILITY.md](ACCESSIBILITY.md) and section 9 of the
  [design guide](docs/design-guide.md): contrast in light and dark mode, colour never the
  only cue, keyboard play, labels for screen readers, reduced motion.
- **Privacy and security.** No tracking, no third-party requests, no secrets, no
  `v-html`/`eval` or inline scripts (Content-Security-Policy).
- **Dependencies.** Avoid new runtime dependencies; if one is really needed it must be
  permissively licensed and pass `npm run check:deps`.
- **Design.** UI follows the [design guide](docs/design-guide.md); a new game or a redesign
  goes through its checklist.
- **Originality.** Games use generic puzzle mechanics; never copy names, artwork, levels
  or layouts of existing commercial games.
- **Docs and changelog.** Update the docs where behaviour changes and add a line to the
  `Unreleased` section of the [CHANGELOG](CHANGELOG.md).

## License

By contributing you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
