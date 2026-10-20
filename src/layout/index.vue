<template>
  <el-container class="manage-app-shell">
    <el-header>
      <LayoutHeader />
    </el-header>

    <el-main class="manage-app-main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { useManageThemeRootSync } from '@/views/manageShared/useManageThemeRootSync'
import LayoutHeader from './Header.vue'
import { RouterView } from 'vue-router'

defineOptions({
  name: 'LayoutIndex',
})

// 根属性同步限定在管理布局生命周期内，离开后不会污染场景编辑器主题。
useManageThemeRootSync()
</script>

<style scoped></style>
