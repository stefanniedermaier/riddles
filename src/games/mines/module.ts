import { defineGame } from '../module'
import { descriptor } from './index'
import { routes } from './routes'

export default defineGame({ id: 'mines', descriptor, routes })
