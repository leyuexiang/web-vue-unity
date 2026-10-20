<script lang="ts">
/**
 * 图片资源选择器公共导出入口。
 *
 * 具体的资源市场查询、本地上传和资源登记逻辑仍集中在右侧属性控件层；二维部件、三维看板和
 * 后续属性面板统一从本入口引用，避免依赖自动组件扫描范围而出现模板标签存在但控件未注册的空白状态。
 */
// eslint-disable-next-line max-len -- 复用右侧属性控件的唯一实现，避免复制资源选择逻辑。
import ScenePropertyImageResourcePicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyImageResourcePicker/index.vue'

export default ScenePropertyImageResourcePicker
</script>
