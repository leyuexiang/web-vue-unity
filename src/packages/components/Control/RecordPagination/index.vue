<template>
  <div class="record-pagination" :style="{ gap: `${option.gap}px` }" :aria-busy="state?.loading">
    <!-- 固定两个原生按钮，文字原样显示，组件不补充箭头或图标。 -->
    <button
      v-for="button in buttons"
      :key="button.key"
      type="button"
      class="record-pagination__button"
      :style="buttonStyle"
      :disabled="button.disabled"
      :aria-label="button.text"
      :tabindex="isPreview ? 0 : -1"
      @click.stop="move(button.direction)"
      @dblclick.stop
    >
      {{ button.text }}
    </button>
    <div v-if="isPreview && state?.error" class="record-pagination__error" role="alert" @click.stop>
      <span>{{ state.error }}</span>
      <button type="button" :disabled="state.loading" @click.stop="context.retry(widgetId)">
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecordPaginationOption } from './config'
import { canMoveRecord } from './model'
import { useRecordPaginationContext } from './runtimeContext'

defineOptions({ name: 'VRecordPagination' })
const props = withDefaults(
  defineProps<{ option: RecordPaginationOption; widgetId?: string; isPreview?: boolean }>(),
  {
    widgetId: '',
    isPreview: false,
  },
)
const context = useRecordPaginationContext()
const state = computed(() => context.getState(props.widgetId))
/** 共享外观只计算一次；任一字号、颜色或字体更新同步作用于两个按钮。 */
const buttonStyle = computed(() => {
  const style = props.option.buttonStyle
  return {
    fontFamily: style.fontFamily || 'inherit',
    fontSize: `${style.fontSize}px`,
    fontStyle: style.italic ? 'italic' : 'normal',
    fontWeight: style.bold ? 'bold' : 'normal',
    borderRadius: `${props.option.borderRadius}px`,
    '--record-color': style.color,
    '--record-background': style.backgroundColor,
    '--record-pressed-color': style.pressedColor,
    '--record-pressed-background': style.pressedBackgroundColor,
  }
})
/** 编辑态仅展示外观，预览态才根据当前列表边界允许切换。 */
const buttons = computed(() =>
  (['previous', 'next'] as const).map((key) => {
    const button = props.option[key]
    const direction = key === 'previous' ? -1 : 1
    return {
      key,
      direction: direction as -1 | 1,
      text: button.text,
      disabled:
        props.isPreview &&
        (!props.option.interactive ||
          !state.value ||
          !canMoveRecord(state.value, props.option.pagination, direction)),
    }
  }),
)
/** 原始点击不冒泡；宿主在选中记录提交成功后统一执行已有点击事件。 */
const move = (direction: -1 | 1) => {
  if (props.isPreview && props.option.interactive) void context.move(props.widgetId, direction)
}
</script>

<style scoped lang="scss">
.record-pagination {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  background: transparent;
}
.record-pagination__button {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  overflow: hidden;
  color: var(--record-color);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  touch-action: manipulation;
  cursor: pointer;
  background: var(--record-background);
  border: 0;
  &:active:not(:disabled) {
    color: var(--record-pressed-color);
    background: var(--record-pressed-background);
  }
  &:disabled {
    color: #8e9997;
    cursor: not-allowed;
    background: #394e4b;
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}
.record-pagination__error {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  display: flex;
  gap: 8px;
  width: 100%;
  font: 12px/1.5 sans-serif;
  color: #ffd18f;
  button {
    flex-shrink: 0;
    color: inherit;
    cursor: pointer;
    background: transparent;
    border: 1px solid currentColor;
  }
}
</style>
