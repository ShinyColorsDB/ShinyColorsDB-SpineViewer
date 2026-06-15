import { createRouter, createWebHistory } from 'vue-router'
import DesktopViewer from '../views/DesktopViewer.vue'
import MobileViewer from '../views/MobileViewer.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'desktop',
      component: DesktopViewer,
    },
    {
      path: '/mobile',
      name: 'mobile',
      component: MobileViewer,
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isMobile && to.name === 'desktop') {
    next({ name: 'mobile', query: to.query })
    return
  }

  if (!isMobile && to.name === 'mobile') {
    next({ name: 'desktop', query: to.query })
    return
  }

  next()
})

export default router
