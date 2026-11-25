import './styles/tokens.css'
import './styles/base.css'

import { createApp } from 'vue'

import App from './App.vue'
import { installI18n } from './core/i18n'
import { installInstallPrompt } from './core/install'
import { requestPersistentStorage } from './core/storage'
import { installRipple } from './core/ripple'
import { installTheme } from './core/theme'
import { router } from './router'

installTheme()
installI18n()
installInstallPrompt()
installRipple()

createApp(App).use(router).mount('#app')

// Ask once to keep our local data even under storage pressure (fire and forget).
void requestPersistentStorage()
