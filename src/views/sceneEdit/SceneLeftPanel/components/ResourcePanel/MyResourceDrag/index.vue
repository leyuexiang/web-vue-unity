<template>
  <div class="scene-edit-resource-content">
    <el-scrollbar class="scene-edit-resource-scroll">
      <!--
        组件、图标、图表和装饰在“我的资源”中必须使用独立数据源。
        当前项目尚未提供这三类二维资源的用户保存与读取契约，因而明确展示空状态；
        绝不能为了填充界面回退到系统资源的静态清单，否则会把系统预置内容误显示为用户内容。
      -->
      <div class="scene-edit-my-resource-empty">
        <el-empty :description="`暂无我的${categoryName}`" />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
/**
 * 我的资源独立分类的名称由资源导航传入。
 *
 * 此组件刻意不依赖系统资源配置和渲染数据。后续补齐用户组件、图表或装饰的接口时，
 * 只在这里接入对应数据源与拖拽转换，不会影响系统资源的既有创建链路。
 */
defineProps<{
  categoryName: string
}>()
</script>

<style scoped lang="scss">
.scene-edit-my-resource-empty {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 24px 12px;
}
</style>
