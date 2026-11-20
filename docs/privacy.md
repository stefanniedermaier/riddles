# Privacy

Riddles has **no backend, no accounts, no analytics and no advertising**.

## What is stored

All data is stored in your browser's `localStorage` on your device, under keys starting
with `riddles:`:

- settings (language, theme, animations, game options)
- running games, so you can continue later
- pre-generated puzzles for a quick start
- statistics and personal bests, Shapes level progress

Nothing of this is ever sent anywhere.

## Network access

The app's files are downloaded from GitHub Pages on the first visit and cached by a service
worker. Afterwards the app only contacts GitHub Pages to check for a new version. Like any
web server, GitHub may log technical request data (e.g. IP address) – see the
[GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).

## Backup, transfer and deletion

- **Settings → Your data → Export backup** saves everything as a JSON file.
- **Import backup** replaces the data on this device with the content of such a file.
- **Delete all data** removes every `riddles:` entry from this device. Uninstalling the app
  or clearing the browser's site data has the same effect.
