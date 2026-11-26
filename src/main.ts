import './styles/tokens.css'
import './styles/base.css'
import './styles/play.css'

import { createApp } from 'vue'

import App from './App.vue'
import { installI18n } from './core/i18n'
import { runMigrations } from './core/migrations'
import { installInstallPrompt } from './core/install'
import { requestPersistentStorage } from './core/storage'
import { preferPortrait } from './core/orientation'
import { installRipple } from './core/ripple'
import { installRouteFocus } from './core/routeFocus'
import { rewriteLegacyHash } from './core/site'
import { installStillness } from './core/stillness'
import { installTheme } from './core/theme'
import { games } from './games/registry'
import { createAppRouter } from './router'

// Convert data of older versions before any view reads it.
runMigrations(games.flatMap((game) => (game.migrate ? [game.migrate] : [])))

installTheme()
// Starts loading the texts of the active language (a chunk of its own) right away.
const texts = installI18n()
installInstallPrompt()
installRipple()
installStillness()
preferPortrait()

// Old hash links (`#/sudoku`) become paths before the router reads the address.
rewriteLegacyHash()
const router = createAppRouter()
installRouteFocus(router)
// Mount once the texts are there (from the service worker cache: no visible delay). Should
// they fail to load, the app still mounts rather than staying blank.
void texts
  .catch(() => undefined)
  .then(() => createApp(App).use(router).mount('#app'))

// Ask once to keep our local data even under storage pressure (fire and forget).
void requestPersistentStorage()
