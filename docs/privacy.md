# Privacy

Riddles has **no backend, no accounts, no analytics and no advertising**.

## Controller

Controller within the meaning of the GDPR (Art. 4(7), Art. 13(1)(a)):

Stefan Niedermaier\
Ostendstr. 5\
85777 Fahrenzhausen\
Germany

Email: [stefan@niedermaier.bayern](mailto:stefan@niedermaier.bayern)

Riddles is a private, non-commercial open-source project. No data protection officer is
appointed (not required, Art. 37 GDPR). The same details are shown in the app under
**Imprint** (home screen footer, Settings → About); they are defined once in
`src/core/legal.ts`.

## What is stored

All data is stored in your browser's `localStorage` on your device, under keys starting
with `riddles:`:

- settings (language, theme, animations, game options)
- running games, so you can continue later
- pre-generated puzzles for a quick start
- statistics and personal bests (incl. the calendar days on which you played, for the
  "days played" and day-streak figures), level progress and records

Nothing of this is ever sent anywhere. Storing it is strictly necessary for the app to work
(§ 25(2) no. 2 TDDDG), so no consent is required; it stays until the user deletes it (see
below).

## Network access

The app's files are downloaded from GitHub Pages on the first visit and cached by a service
worker. Afterwards the app only contacts GitHub Pages to check for a new version. Like any
web server, GitHub (GitHub, Inc., USA) may log technical request data (e.g. IP address) – see
the [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
The legal basis is the legitimate interest in delivering the app securely and reliably
(Art. 6(1)(f) GDPR). The data may be processed in the USA; GitHub transfers it on the basis of
the EU–US Data Privacy Framework and the EU standard contractual clauses (Art. 45 and 46
GDPR). GitHub's privacy statement describes how long it keeps this data.

## Sharing

The share button on the home screen hands the app link to the device's share sheet (or copies
it to the clipboard). The app does not learn whether or with whom it was shared.

The same information is shown in the app under **Settings → Your data → Privacy notice**.

## Backup, transfer and deletion

- **Settings → Your data → Export backup** saves everything as a JSON file.
- **Import backup** replaces the data on this device with the content of such a file.
- **Delete all data** removes every `riddles:` entry from this device. Uninstalling the app
  or clearing the browser's site data has the same effect.

## Your rights

You have the right of access, rectification, erasure, restriction of processing, data
portability and objection (Art. 15–21 GDPR); contact the controller above. As the app itself
collects no data about you, these rights mainly concern the connection data processed by
GitHub. You may also lodge a complaint with a supervisory authority (Art. 77 GDPR), e.g. the
Bavarian Data Protection Authority (Bayerisches Landesamt für Datenschutzaufsicht, BayLDA).
