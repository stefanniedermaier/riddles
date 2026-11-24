import { defineGame } from '../module'
import { de, en } from './i18n'
import { descriptor } from './index'
import { routes } from './routes'

export default defineGame({ id: 'codebreaker', descriptor, routes, messages: { en, de } })
