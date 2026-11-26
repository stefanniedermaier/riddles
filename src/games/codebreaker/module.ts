import { defineGame } from '../module'
import { descriptor } from './index'
import { routes } from './routes'

export default defineGame({ id: 'codebreaker', descriptor, routes })
