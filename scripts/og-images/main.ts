/**
 * Link preview card (1200 × 630) for `npm run og-images`: the app (`?game=app`) or one game
 * (`?game=<id>`) in a language (`&lang=de`), drawn with the real game logos in the light look.
 */
import '@/styles/tokens.css'
import '@/styles/base.css'
import './card.css'

import { createApp } from 'vue'

import Card from './Card.vue'

const query = new URLSearchParams(window.location.search)
const game = query.get('game') ?? 'app'
const locale = query.get('lang') === 'de' ? 'de' : 'en'
document.documentElement.lang = locale
createApp(Card, { game, locale }).mount('#app')
