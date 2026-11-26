import { defineGame } from '../module'
import { descriptor } from './index'
import { routes } from './routes'

export default defineGame({ id: 'freecell', descriptor, routes })
