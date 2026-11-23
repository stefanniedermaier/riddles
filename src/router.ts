import { createRouter, createWebHashHistory } from 'vue-router'

import { gameRoutes } from '@/games/registry'
import HomeView from '@/views/HomeView.vue'

// Hash history works on GitHub Pages without a server-side SPA fallback
// and keeps the PWA start URL simple.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
    ...gameRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
