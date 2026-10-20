<template>
  <div class="page-frame-config">
    <template v-if="!selectedFrameChild">
      <section class="scene-edit-property-section">
        <div class="scene-edit-property-section__header">框架外观</div>
        <div class="scene-edit-property-section__body">
          <ScenePropertyRow label="布局预设" control-fill>
            <ScenePropertySelect v-model="option.layout">
              <el-option
                v-for="layout in PAGE_FRAME_LAYOUT_OPTIONS"
                :key="layout.value"
                :label="layout.label"
                :value="layout.value"
              />
            </ScenePropertySelect>
          </ScenePropertyRow>
          <ScenePropertyRow label="外边框图片" control-fill
            ><ScenePropertyImageResourcePicker
              v-model="option.background.value"
              v-model:resource-key="backgroundResourceKey"
          /></ScenePropertyRow>
          <ScenePropertyRow label="图片透明度"
            ><ScenePropertyNumberInput
              v-model="option.background.opacity"
              :min="0"
              :max="1"
              :step="0.05"
          /></ScenePropertyRow>
        </div>
      </section>

      <section class="scene-edit-property-section">
        <div class="scene-edit-property-section__header">槽位管理</div>
        <div class="scene-edit-property-section__body">
          <ScenePropertyRow
            v-for="slot in fixedSlots"
            :key="slot.child.id"
            :label="slot.label"
            control-fill
          >
            <div class="page-frame-config__slot-row">
              <ScenePropertySwitch v-model="slot.child.visible" />
              <ScenePropertyButton width="72px" plain @click="emit('selectChild', slot.child.id)"
                >配置</ScenePropertyButton
              >
            </div>
          </ScenePropertyRow>
        </div>
      </section>

      <section class="scene-edit-property-section">
        <div class="scene-edit-property-section__header">菜单配置</div>
        <div class="scene-edit-property-section__body">
          <ScenePropertyRow label="新增按钮" control-fill>
            <div class="page-frame-config__toolbar">
              <ScenePropertyButton width="100%" @click="addMenu('left')"
                >左侧菜单</ScenePropertyButton
              ><ScenePropertyButton width="100%" @click="addMenu('right')"
                >右侧菜单</ScenePropertyButton
              >
            </div>
          </ScenePropertyRow>
          <ScenePropertyRow label="默认选中" control-fill>
            <ScenePropertySelect v-model="option.defaultMenuId" placeholder="请选择默认菜单">
              <el-option label="不设置默认选中" value="" />
              <el-option
                v-for="child in option.menuChildren"
                :key="child.id"
                :label="`${child.side === 'left' ? '左侧' : '右侧'} · ${child.label || '未命名菜单'}`"
                :value="child.id"
              />
            </ScenePropertySelect>
          </ScenePropertyRow>
          <ScenePropertyRow label="一级按钮" control-fill>
            <div class="page-frame-config__menu-list">
              <button
                v-for="child in option.menuChildren"
                :key="child.id"
                type="button"
                class="page-frame-config__menu-item"
                @click="emit('selectChild', child.id)"
              >
                <span>{{ child.side === 'left' ? '左' : '右' }}</span
                ><strong>{{ child.label || '未命名菜单' }}</strong
                ><small>{{ child.visible ? '显示' : '隐藏' }}</small>
              </button>
            </div>
          </ScenePropertyRow>
        </div>
      </section>
    </template>

    <section v-else class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">当前子节点 · {{ selectedChildLabel }}</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="锁定状态"
          ><ScenePropertySwitch v-model="selectedFrameChild.locked"
        /></ScenePropertyRow>
        <div
          :inert="selectedFrameChild.locked || undefined"
          :aria-disabled="selectedFrameChild.locked"
        >
          <ScenePropertyRow label="显示状态"
            ><ScenePropertySwitch v-model="selectedFrameChild.visible"
          /></ScenePropertyRow>

          <template v-if="selectedFrameChild.kind === 'logo'">
            <ScenePropertyRow label="Logo 文案" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.text"
            /></ScenePropertyRow>
            <ScenePropertyRow label="Logo 图片" control-fill
              ><ScenePropertyImageResourcePicker v-model="selectedFrameChild.imageUrl"
            /></ScenePropertyRow>
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="-2000"
                :max="2000"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="-2000"
                :max="2000"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'menu-slot'">
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="菜单间距（从左至右）"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.itemGap"
                :min="PAGE_FRAME_MENU_ITEM_GAP_RANGE.min"
                :max="PAGE_FRAME_MENU_ITEM_GAP_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'title'">
            <ScenePropertyRow label="主标题" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.text"
            /></ScenePropertyRow>
            <ScenePropertyRow label="副标题" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.subtitle"
            /></ScenePropertyRow>
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'weather'">
            <ScenePropertyRow label="温度" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.temperature"
            /></ScenePropertyRow>
            <ScenePropertyRow label="天气" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.condition"
            /></ScenePropertyRow>
            <ScenePropertyRow label="默认图标" control-fill
              ><ScenePropertyImageResourcePicker v-model="selectedFrameChild.iconUrl"
            /></ScenePropertyRow>
            <ScenePropertyRow label="预置天气图片" control-fill>
              <div class="page-frame-config__weather-images">
                <div
                  v-for="(image, index) in selectedFrameChild.images"
                  :key="image.id"
                  class="page-frame-config__weather-image-row"
                >
                  <ScenePropertyInput v-model="image.condition" placeholder="天气类型" />
                  <ScenePropertySelect
                    filterable
                    clearable
                    placeholder="从天气图标库选择"
                    :model-value="image.iconName"
                    @update:model-value="selectWeatherIcon(image, $event)"
                  >
                    <el-option
                      v-for="icon in weatherIconOptions"
                      :key="icon.name"
                      :label="icon.title"
                      :value="icon.name"
                    >
                      <div class="page-frame-config__weather-icon-option">
                        <component :is="icon.component" />
                        <span>{{ icon.title }}</span>
                      </div>
                    </el-option>
                  </ScenePropertySelect>
                  <ScenePropertyButton
                    width="54px"
                    type="danger"
                    plain
                    @click="removeWeatherImage(index)"
                    >删除</ScenePropertyButton
                  >
                  <ScenePropertyImageResourcePicker
                    class="page-frame-config__weather-image-picker"
                    :model-value="image.imageUrl"
                    @update:model-value="selectWeatherImage(image, $event)"
                  />
                </div>
                <ScenePropertyButton width="100%" plain @click="addWeatherImage"
                  >添加自定义天气</ScenePropertyButton
                >
              </div>
            </ScenePropertyRow>
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'time'">
            <ScenePropertyRow label="日期" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.date" placeholder="2026-07-07"
            /></ScenePropertyRow>
            <ScenePropertyRow label="时间" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.time" placeholder="10:10:07"
            /></ScenePropertyRow>
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'account'">
            <ScenePropertyRow label="管理员" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.name"
            /></ScenePropertyRow>
            <ScenePropertyRow label="角色" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.role"
            /></ScenePropertyRow>
            <ScenePropertyRow label="头像" control-fill
              ><ScenePropertyImageResourcePicker v-model="selectedFrameChild.avatarUrl"
            /></ScenePropertyRow>
            <ScenePropertyRow label="水平偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetX"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="垂直偏移"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.offsetY"
                :min="PAGE_FRAME_CHILD_OFFSET_RANGE.min"
                :max="PAGE_FRAME_CHILD_OFFSET_RANGE.max"
                :step="1"
            /></ScenePropertyRow>
          </template>
          <template v-else-if="selectedFrameChild.kind === 'menu-button'">
            <ScenePropertyRow label="按钮文字" control-fill
              ><ScenePropertyInput v-model="selectedFrameChild.label"
            /></ScenePropertyRow>
            <ScenePropertyRow label="页面地址" control-fill
              ><ScenePropertyInput
                v-model="selectedFrameChild.pageUrl"
                placeholder="/scenePreview 或 https://..."
            /></ScenePropertyRow>
            <ScenePropertyRow label="跳转方式"
              ><div class="page-frame-config__navigation-mode">
                <ScenePropertySwitch v-model="selectedFrameChild.openInNewWindow" /><span
                  >新窗口打开</span
                >
              </div></ScenePropertyRow
            >
            <ScenePropertyRow label="所属菜单" control-fill
              ><ScenePropertySelect
                v-model="selectedFrameChild.side"
                :options="menuSideOptions"
                @change="syncMenuSlot"
            /></ScenePropertyRow>
            <ScenePropertyRow label="顺序" control-fill
              ><div class="page-frame-config__toolbar">
                <ScenePropertyButton width="100%" plain @click="moveSelectedMenu(-1)"
                  >上移</ScenePropertyButton
                ><ScenePropertyButton width="100%" plain @click="moveSelectedMenu(1)"
                  >下移</ScenePropertyButton
                >
              </div></ScenePropertyRow
            >
            <ScenePropertyRow label="下级菜单" control-fill
              ><div class="page-frame-config__toolbar">
                <ScenePropertyButton width="100%" @click="addNestedMenu"
                  >新增下级</ScenePropertyButton
                ><ScenePropertyButton width="100%" type="danger" plain @click="removeSelectedMenu"
                  >删除按钮</ScenePropertyButton
                >
              </div></ScenePropertyRow
            >
            <ScenePropertyRow v-if="nestedNodes.length" label="二/三级" control-fill>
              <div class="page-frame-config__menu-list">
                <button
                  v-for="item in nestedNodes"
                  :key="item.node.id"
                  type="button"
                  class="page-frame-config__menu-item"
                  :class="{ 'is-selected': nestedNodeId === item.node.id }"
                  :style="{ paddingLeft: `${item.depth * 12}px` }"
                  @click="nestedNodeId = item.node.id"
                >
                  <span>{{ item.depth }}级</span><strong>{{ item.node.label }}</strong>
                </button>
              </div>
            </ScenePropertyRow>
            <template v-if="selectedNestedNode">
              <ScenePropertyRow label="子菜单文字" control-fill
                ><ScenePropertyInput v-model="selectedNestedNode.node.label"
              /></ScenePropertyRow>
              <ScenePropertyRow label="子菜单链接" control-fill
                ><ScenePropertyInput v-model="selectedNestedNode.node.pageUrl"
              /></ScenePropertyRow>
              <ScenePropertyRow label="跳转方式"
                ><div class="page-frame-config__navigation-mode">
                  <ScenePropertySwitch v-model="selectedNestedNode.node.openInNewWindow" /><span
                    >新窗口打开</span
                  >
                </div></ScenePropertyRow
              >
              <ScenePropertyRow label="子菜单状态"
                ><ScenePropertySwitch v-model="selectedNestedNode.node.visible"
              /></ScenePropertyRow>
              <ScenePropertyRow label="子菜单操作" control-fill
                ><div class="page-frame-config__toolbar">
                  <ScenePropertyButton
                    width="100%"
                    :disabled="selectedNestedNode.depth >= 3"
                    @click="addNestedChild"
                    >新增下级</ScenePropertyButton
                  ><ScenePropertyButton width="100%" type="danger" plain @click="removeNested"
                    >删除</ScenePropertyButton
                  >
                </div></ScenePropertyRow
              >
            </template>
          </template>

          <template v-if="'style' in selectedFrameChild">
            <ScenePropertyRow label="文字颜色"
              ><ScenePropertyColorPicker v-model="selectedFrameChild.style.color" variant="swatch"
            /></ScenePropertyRow>
            <ScenePropertyRow label="字体" control-fill
              ><ScenePropertySelect
                v-model="selectedFrameChild.style.fontFamily"
                :options="fontOptions"
            /></ScenePropertyRow>
            <ScenePropertyRow label="字号"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.style.fontSize"
                :min="8"
                :max="72"
                :step="1"
            /></ScenePropertyRow>
            <ScenePropertyRow label="字重"
              ><ScenePropertyNumberInput
                v-model="selectedFrameChild.style.fontWeight"
                :min="100"
                :max="900"
                :step="100"
            /></ScenePropertyRow>
          </template>
        </div>
        <ScenePropertyRow label="返回框架" control-fill
          ><ScenePropertyButton width="100%" plain @click="emit('selectChild', '')"
            >完成子节点配置</ScenePropertyButton
          ></ScenePropertyRow
        >
      </div>
    </section>

    <section v-if="selectedFrameChild?.kind === 'menu-button'" class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">菜单图标</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="未选中图标" control-fill
          ><ScenePropertyImageResourcePicker v-model="selectedFrameChild.iconUrl"
        /></ScenePropertyRow>
        <ScenePropertyRow label="选中图标" control-fill
          ><ScenePropertyImageResourcePicker v-model="selectedFrameChild.activeIconUrl"
        /></ScenePropertyRow>
        <ScenePropertyRow label="未选中图标缩放"
          ><ScenePropertyNumberInput
            v-model="selectedFrameChild.iconScale"
            :min="PAGE_FRAME_MENU_SCALE_RANGE.min"
            :max="PAGE_FRAME_MENU_SCALE_RANGE.max"
            :step="0.05"
        /></ScenePropertyRow>
        <ScenePropertyRow label="选中图标缩放"
          ><ScenePropertyNumberInput
            v-model="selectedFrameChild.activeIconScale"
            :min="PAGE_FRAME_MENU_SCALE_RANGE.min"
            :max="PAGE_FRAME_MENU_SCALE_RANGE.max"
            :step="0.05"
        /></ScenePropertyRow>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyColorPicker from '@/components/ScenePropertyColorPicker/index.vue'
import ScenePropertyImageResourcePicker from '@/components/ScenePropertyImageResourcePicker/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertyNumberInput from '@/components/ScenePropertyNumberInput/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
import ScenePropertySwitch from '@/components/ScenePropertySwitch/index.vue'
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
import { PAGE_MENU_FONT_OPTIONS } from './appearance'
import { createPageMenuNode, findPageMenuNode, flattenPageMenuTree } from './menuTree'
import { GOVIEW_ICON_LIST } from '@/packages/components/Widget/Icon/iconCatalog'
import {
  PAGE_FRAME_CHILD_OFFSET_RANGE,
  PAGE_FRAME_LAYOUT_OPTIONS,
  PAGE_FRAME_MENU_ITEM_GAP_RANGE,
  PAGE_FRAME_MENU_SCALE_RANGE,
  createPageFrameMenuChild,
  findPageFrameChild,
  movePageFrameMenuChild,
  normalizePageFrameOption,
  removePageFrameMenuChild,
  type PageFrameOption,
  type PageFrameWeatherImage,
} from './pageFrameTypes'
import { hydrateTcmMenuIconResources } from './tcmMenuIconResources'

defineOptions({ name: 'VPageMenuConfigPanel' })
const emit = defineEmits<{ selectChild: [childId: string] }>()
const props = defineProps({
  option: { type: Object as PropType<PageFrameOption>, required: true },
  selectedChildId: { type: String, default: '' },
})
const menuSideOptions = [
  { label: '左侧菜单', value: 'left' },
  { label: '右侧菜单', value: 'right' },
]
const fontOptions = PAGE_MENU_FONT_OPTIONS
const weatherIconOptions = GOVIEW_ICON_LIST.filter((icon) => icon.category === 'weather')
const nestedNodeId = ref('')
const selectedFrameChild = computed(() =>
  props.selectedChildId ? findPageFrameChild(props.option, props.selectedChildId) : null,
)
/**
 * 页面框架背景使用资源市场图片时，地址只服务于当前编辑器预览，稳定编号才用于跨设备恢复。
 * 选择器清空图片时同步清除来源，避免下一次保存继续把旧资源登记为依赖。
 */
const backgroundResourceKey = computed<string | undefined>({
  get: () => props.option.background.resourceKey,
  set: (value) => {
    const normalized = typeof value === 'string' && value.trim() ? value.trim() : undefined
    props.option.background.resourceKey = normalized
    props.option.background.sourceType = normalized ? 'resource-market' : 'external'
  },
})
const selectedMenu = computed(() =>
  selectedFrameChild.value?.kind === 'menu-button' ? selectedFrameChild.value : null,
)
const fixedSlots = computed(() => [
  { label: 'Logo', child: props.option.logo },
  { label: '左侧菜单', child: props.option.menuSlots.left },
  { label: '中央标题', child: props.option.title },
  { label: '右侧菜单', child: props.option.menuSlots.right },
  { label: '天气', child: props.option.weather },
  { label: '时间', child: props.option.time },
  { label: '管理员', child: props.option.account },
])
const selectedChildLabel = computed(() =>
  selectedFrameChild.value?.kind === 'menu-button'
    ? selectedFrameChild.value.label
    : fixedSlots.value.find((item) => item.child.id === props.selectedChildId)?.label || '子节点',
)
const nestedNodes = computed(() =>
  selectedMenu.value
    ? flattenPageMenuTree(selectedMenu.value.children).map((item) => ({
        ...item,
        depth: item.depth + 1,
      }))
    : [],
)
const selectedNestedNode = computed(() =>
  selectedMenu.value && nestedNodeId.value
    ? findPageMenuNode(selectedMenu.value.children, nestedNodeId.value)
    : null,
)
/** 旧配置尚未保存 time 时，在面板初始化阶段补上独立时间槽位。 */
if (!props.option.time) {
  props.option.time = normalizePageFrameOption(props.option).time
}
/** 兼容尚未保存 images 字段的历史页面框架，打开面板即补齐预置天气类型。 */
watch(
  () => props.option.weather.images,
  (images) => {
    if (Array.isArray(images)) return
    props.option.weather.images = normalizePageFrameOption(props.option).weather.images
  },
  { immediate: true },
)
watch(
  selectedMenu,
  () => {
    nestedNodeId.value = nestedNodes.value[0]?.node.id || ''
  },
  { immediate: true },
)
watch(
  () =>
    [
      props.option.layout,
      ...props.option.menuChildren.map((menu) => `${menu.id}:${menu.label}`),
    ].join('|'),
  () => {
    if (props.option.layout === 'tcm-bottom') void hydrateTcmMenuIconResources(props.option)
  },
  { immediate: true },
)
const addMenu = (side: 'left' | 'right') => {
  const child = createPageFrameMenuChild(props.option.menuChildren.length, side)
  props.option.menuChildren.push(child)
  if (props.option.menuChildren.length === 1 && !props.option.defaultMenuId) {
    props.option.defaultMenuId = child.id
  }
  emit('selectChild', child.id)
}
const syncMenuSlot = () => {
  if (!selectedMenu.value) return
  selectedMenu.value.slot = selectedMenu.value.side === 'left' ? 'left-menu' : 'right-menu'
}
const moveSelectedMenu = (delta: number) => {
  const menu = selectedMenu.value
  if (menu) movePageFrameMenuChild(props.option, menu.id, delta < 0 ? -1 : 1)
}
const removeSelectedMenu = () => {
  const menu = selectedMenu.value
  if (menu && removePageFrameMenuChild(props.option, menu.id)) emit('selectChild', '')
}
const addWeatherImage = () => {
  if (selectedFrameChild.value?.kind !== 'weather') return
  selectedFrameChild.value.images.push({
    id: `page-frame-weather-image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    condition: '',
    iconName: '',
    imageUrl: '',
  })
}
const selectWeatherIcon = (image: PageFrameWeatherImage, value: unknown) => {
  image.iconName = typeof value === 'string' ? value : ''
  if (image.iconName) image.imageUrl = ''
}
const selectWeatherImage = (image: PageFrameWeatherImage, value: unknown) => {
  image.imageUrl = typeof value === 'string' ? value : ''
  if (image.imageUrl) image.iconName = ''
}
const removeWeatherImage = (index: number) => {
  if (selectedFrameChild.value?.kind !== 'weather') return
  selectedFrameChild.value.images.splice(index, 1)
}
const addNestedMenu = () => {
  const menu = selectedMenu.value
  if (!menu) return
  const node = createPageMenuNode(2, menu.children.length)
  menu.children.push(node)
  nestedNodeId.value = node.id
}
const addNestedChild = () => {
  const selected = selectedNestedNode.value
  if (!selected || selected.depth >= 2) return
  const node = createPageMenuNode(selected.depth + 2, selected.node.children.length)
  selected.node.children.push(node)
  nestedNodeId.value = node.id
}
const removeNested = () => {
  const selected = selectedNestedNode.value
  if (!selected) return
  const index = selected.parent.findIndex((node) => node.id === selected.node.id)
  if (index >= 0) selected.parent.splice(index, 1)
  nestedNodeId.value = nestedNodes.value[0]?.node.id || ''
}
</script>

<style scoped lang="scss">
.page-frame-config {
  min-width: 0;
}
.page-frame-config__toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
}
.page-frame-config__slot-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}
.page-frame-config__navigation-mode {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-size: 13px;
  color: var(--scene-edit-text);
  white-space: nowrap;
}
.page-frame-config__menu-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 220px;
  overflow: auto;
  background: var(--scene-edit-bg-input);
  border: 1px solid rgb(255 255 255 / 14%);
}
.page-frame-config__menu-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  min-height: 32px;
  padding: 0 8px;
  color: var(--scene-edit-text);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}
.page-frame-config__weather-images {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.page-frame-config__weather-image-row {
  display: grid;
  grid-template-columns: minmax(82px, 0.7fr) minmax(0, 1.3fr) auto;
  gap: 6px;
  align-items: center;
}
.page-frame-config__weather-image-picker {
  grid-column: 1 / -1;
}
.page-frame-config__weather-icon-option {
  display: flex;
  gap: 8px;
  align-items: center;
}
.page-frame-config__weather-icon-option svg {
  width: 18px;
  height: 18px;
  color: currentcolor;
}
.page-frame-config__menu-item:hover,
.page-frame-config__menu-item.is-selected {
  background: rgb(90 178 165 / 16%);
}
.page-frame-config__menu-item span,
.page-frame-config__menu-item small {
  color: var(--scene-edit-header-primary);
}
.page-frame-config__menu-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  white-space: nowrap;
}
</style>
