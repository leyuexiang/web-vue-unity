<script lang="ts">
/**
 * 日期时间选择器的公共导出入口。
 * 实现集中在右侧属性面板的 PropertyControls；直接导出同一组件实例，确保属性、事件、插槽和
 * v-model 类型不经过二次包装，倒计时与日期输入配置始终复用同一套可变宽度行为。
 */
import ScenePropertyDatePicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyDatePicker/index.vue'

export default ScenePropertyDatePicker
</script>
