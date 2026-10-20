<script lang="ts">
/**
 * 纯数字输入框的公共导出入口。
 *
 * 具体实现仍集中在右侧属性面板的 PropertyControls 目录，二维组件配置面板通过本入口复用同一套
 * Figma 尺寸、左对齐数字和禁用步进按钮规则，避免各业务面板自行包装 Element Plus 控件。
 */
import ScenePropertyNumberInput from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyNumberInput/index.vue'

export default ScenePropertyNumberInput
</script>
