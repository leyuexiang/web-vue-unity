import { createRouter, createWebHistory } from 'vue-router'
import EditorView from '@/views/EditorView.vue'

const pendingMigration = (title: string) => ({
  component: EditorView,
  props: { migrationTitle: title },
})

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/sceneManage' },
    { path: '/editor', name: 'editor', component: EditorView },
    { path: '/sceneManage', name: 'scene-manage', ...pendingMigration('场景管理') },
    { path: '/resourceManage/model', name: 'resource-model', ...pendingMigration('模型资源') },
    { path: '/resourceManage/icon', name: 'resource-icon', ...pendingMigration('图标资源') },
    { path: '/resourceManage/template', name: 'resource-template', ...pendingMigration('场景模板') },
    { path: '/sceneEdit', name: 'scene-edit', component: EditorView },
    { path: '/scenePreview', name: 'scene-preview', ...pendingMigration('场景预览') },
    { path: '/plantingManage', name: 'planting-manage', ...pendingMigration('种植管理') },
    { path: '/:pathMatch(.*)*', name: 'not-found', ...pendingMigration('页面') },
  ],
})
