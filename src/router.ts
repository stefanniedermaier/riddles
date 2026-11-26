import { createRouter, createWebHistory } from 'vue-router'

import { routerBase } from '@/core/site'
import { gameRoutes } from '@/games/registry'
import HomeView from '@/views/HomeView.vue'

// Real paths (one address per page for search engines). Every public page exists as a
// prerendered file (`scripts/prerender.mjs`); other paths reach the app through 404.html
// or, once installed, the service worker. German pages run under `/riddles/de/`.
export function createAppRouter() {
  return createRouter({
    history: createWebHistory(routerBase(window.location.pathname)),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
      { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
      { path: '/imprint', name: 'imprint', component: () => import('@/views/ImprintView.vue') },
      ...gameRoutes,
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })
}
