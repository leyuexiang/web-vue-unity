<script lang="ts">
/**
 * 颜色选择器的公共导出入口。
 * 实现仍归属右侧属性面板的 PropertyControls；此桥接层仅让二维组件包可自动复用同一实例，
 * 从而避免三十余个配置面板分别维护导入路径或重复封装取色器逻辑。
 */
import ScenePropertyColorPicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'

export default ScenePropertyColorPicker
</script>
