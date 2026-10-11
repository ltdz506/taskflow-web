import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/token'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/tasks', name: 'tasks', component: () => import('@/views/TaskflowView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/**
 * 全局守卫：
 * 1. 未登录访问受保护页面 → 送回登录页
 * 2. 已登录再访问登录页 → 送回首页
 */
router.beforeEach((to) => {
  const loggedIn = Boolean(getToken())

  if (!to.meta.public && !loggedIn) {
    return { name: 'login' }
  }
  if (to.name === 'login' && loggedIn) {
    return { name: 'home' }
  }
})

export default router
