import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentManagementCapabilities } from '@/auth/capabilities'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/sceneManage',
      component: () => import('@/layout/index.vue'),
      children: [
        {
          path: '/resourceManage',
          name: 'resourceManage',
          redirect: { name: 'modelManage' },
          children: [
            {
              path: 'model',
              name: 'modelManage',
              component: () => import('../views/resourceManage/modelManage/index.vue'),
            },
            {
              path: 'icon',
              name: 'iconManage',
              component: () => import('../views/resourceManage/iconManage/index.vue'),
            },
            {
              // 模板页复用资源管理外壳，路径与同级模型、图片页面保持一致，便于侧栏和地址栏直接访问。
              path: 'template',
              name: 'templateManage',
              component: () => import('../views/resourceManage/templateManage/index.vue'),
            },
          ],
        },
        {
          path: '/sceneManage',
          name: 'sceneManage',
          component: () => import('../views/SceneManage/index.vue'),
        },
      ],
    },
    {
      path: '/sceneEdit',
      name: 'sceneEdit',
      component: () => import('../views/sceneEdit/index.vue'),
    },
    {
      path: '/scenePreview',
      name: 'scenePreview',
      component: () => import('../views/scenePreview/index.vue'),
    },
    {
      path: '/plantingManage',
      name: 'plantingManage',
      alias: '/planting-management',
      component: () => import('../views/plantingManage/index.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: '404',
      component: () => import('../views/404.vue'),
    },
  ],
})

/**
 * 已挂载后的站内导航再次校验模板页面能力，防止租户端通过脚本或地址栏跳转恢复页面。
 * 首次启动时认证尚未完成，App 会在挂载 RouterView 前执行同一检查。
 */
router.beforeEach((to) => {
  if (to.name === 'templateManage' && !getCurrentManagementCapabilities().template.canAccess) {
    return { name: 'modelManage', replace: true }
  }
  return true
})

export default router
