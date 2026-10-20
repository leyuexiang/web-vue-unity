<script lang="ts">
/**
 * 布尔开关的公共导出入口。
 * 共享实现继续位于 PropertyControls；此处只提供给图表、二维部件和装饰配置的自动组件注册，
 * 保证它们与天气、场景和对象属性面板使用同一尺寸、颜色及事件透传契约。
 */
import ScenePropertySwitch from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertySwitch/index.vue'

export default ScenePropertySwitch
</script>
