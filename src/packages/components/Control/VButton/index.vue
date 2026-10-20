<template>
  <!-- 固定命中区域承接事件，内部视觉层缩放不会导致边缘点击丢失或选框移动。 -->
  <button
    ref="buttonRef"
    type="button"
    class="widget-button"
    :class="{ 'is-preview': isPreview, 'is-pressed': pressed }"
    :aria-label="option.text.value || option.label"
    :aria-disabled="!option.interactive"
    :tabindex="isPreview && option.interactive ? 0 : -1"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointerleave="cancelPointer"
    @pointercancel="cancelPointer"
    @lostpointercapture="handleLostCapture"
    @keydown="handleKeyDown"
    @keyup="handleKeyUp"
    @blur="resetPress"
    @click="handleClick"
  >
    <span class="widget-button__surface" :style="surfaceStyle">
      <!-- 两张图片提前挂载，按下时只切换透明度，避免首击才请求按下背景。 -->
      <img
        v-if="normalSource"
        class="widget-button__image"
        :src="normalSource"
        :style="{ objectFit: option.images.normal.fit, opacity: pressedSource && pressed ? 0 : 1 }"
        alt=""
        draggable="false"
      />
      <img
        v-if="pressedSource"
        class="widget-button__image"
        :src="pressedSource"
        :style="{ objectFit: option.images.pressed.fit, opacity: pressed ? 1 : 0 }"
        alt=""
        draggable="false"
      />
      <span class="widget-button__text-box" :style="textBoxStyle">
        <span class="widget-button__text" :style="textStyle">{{ option.text.value }}</span>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
import { useImageSource } from '../../Widget/Image/useImageSource'
import type { ButtonOption } from './config'

defineOptions({ name: 'VButton' })
const props = withDefaults(defineProps<{ option: ButtonOption; isPreview?: boolean }>(), {
  isPreview: false,
})
const buttonRef = ref<HTMLButtonElement>()
const pressed = ref(false)
const normalSource = useImageSource(() => props.option.images.normal)
const pressedSource = useImageSource(() => props.option.images.pressed)

/** 只在指针按下时读一次固定外框，后续移动不查询布局、不改变持久化配置。 */
let gesture: { id: number; valid: boolean; bounds: DOMRect } | null = null
let activeKey: string | null = null
const canInteract = computed(() => props.isPreview && props.option.interactive)
const surfaceStyle = computed<CSSProperties>(() => {
  const effect = props.option.press
  const applyEffect = pressed.value && effect.enabled
  return {
    backgroundColor: props.option.backgroundColor,
    border: `${props.option.borderWidth}px solid ${props.option.borderColor}`,
    borderRadius: `${props.option.borderRadius}px`,
    transform: applyEffect
      ? `translateY(${effect.offsetY}px) scale(${effect.scale / 100})`
      : undefined,
    filter: applyEffect ? `brightness(${effect.brightness / 100})` : undefined,
  }
})
const textBoxStyle = computed<CSSProperties>(() => {
  const text = props.option.text
  return {
    left: `${text.x}px`,
    top: `${text.y}px`,
    width: text.width > 0 ? `${text.width}px` : '100%',
    height: text.height > 0 ? `${text.height}px` : '100%',
    justifyContent: { top: 'flex-start', center: 'center', bottom: 'flex-end' }[text.verticalAlign],
  }
})
const textStyle = computed<CSSProperties>(() => {
  const text = props.option.text
  return {
    fontFamily: text.fontFamily || 'inherit',
    fontSize: `${text.fontSize}px`,
    color: text.fontColor,
    fontWeight: text.bold ? 'bold' : 'normal',
    lineHeight: text.lineHeight > 0 ? `${text.lineHeight}px` : 'normal',
    letterSpacing: `${text.letterSpacing}px`,
    textAlign: text.align,
    // 两端对齐只拉伸完整行，末行及单行自然回到左对齐。
    textAlignLast: text.align === 'justify' ? 'left' : 'auto',
    whiteSpace: text.wrap ? 'pre-wrap' : 'nowrap',
    overflowWrap: text.wrap ? 'anywhere' : 'normal',
  }
})

/** 使用固定按钮外框校验命中；视觉层变换和透明图片不改变有效点击区域。 */
const isInside = (event: PointerEvent) => {
  const bounds = gesture?.bounds
  return Boolean(
    bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom,
  )
}
const handlePointerDown = (event: PointerEvent) => {
  if (!canInteract.value || !event.isPrimary || event.button !== 0 || !buttonRef.value) return
  activeKey = null
  gesture = { id: event.pointerId, valid: true, bounds: buttonRef.value.getBoundingClientRect() }
  pressed.value = true
  // 指针捕获保证在按钮外松开也能恢复；命中仍按按下时的固定外框判断。
  buttonRef.value.setPointerCapture(event.pointerId)
}
const handlePointerMove = (event: PointerEvent) => {
  if (gesture?.id === event.pointerId && !isInside(event)) cancelPointer(event)
}
const handlePointerUp = (event: PointerEvent) => {
  if (gesture?.id !== event.pointerId) return
  gesture.valid = gesture.valid && isInside(event)
  pressed.value = false
}
/** 取消后保留无效标记，阻止浏览器捕获指针后生成的残余点击冒泡到场景事件。 */
const cancelPointer = (event: PointerEvent) => {
  if (gesture?.id !== event.pointerId) return
  gesture.valid = false
  pressed.value = false
}
const handleLostCapture = (event: PointerEvent) => {
  // 正常松开后浏览器先释放捕获再派发 click，此时必须保留有效点击标记。
  if (pressed.value) cancelPointer(event)
}
const resetPress = () => {
  if (gesture) gesture.valid = false
  pressed.value = false
  activeKey = null
}
/** 键盘沿用原生按钮点击语义，不主动派发事件，避免回车或空格触发两次。 */
const handleKeyDown = (event: KeyboardEvent) => {
  if (!canInteract.value || (event.key !== 'Enter' && event.key !== ' ')) return
  if (event.repeat) {
    event.preventDefault()
    return
  }
  activeKey = event.key
  pressed.value = true
}
const handleKeyUp = (event: KeyboardEvent) => {
  if (event.key !== activeKey) return
  activeKey = null
  pressed.value = false
}
const handleClick = (event: MouseEvent) => {
  const pointerClick = event.detail > 0 || ('pointerType' in event && Boolean(event.pointerType))
  if (!canInteract.value || (pointerClick && !gesture?.valid)) {
    event.preventDefault()
    event.stopPropagation()
  }
  // 合法点击只自然冒泡一次，由画布现有事件服务执行配置动作。
  gesture = null
}
watch(canInteract, (enabled) => {
  if (!enabled) resetPress()
})
/**
 * 仅按住期间监听窗口失焦和页签隐藏，避免切换窗口后没有 pointerup 而卡在按下态。
 * 松开、取消或卸载立即移除监听，不让场景里的闲置按钮长期占用全局事件。
 */
watch(
  pressed,
  (active, _, onCleanup) => {
    if (!active) return
    const handleVisibilityChange = () => {
      if (document.hidden) resetPress()
    }
    window.addEventListener('blur', resetPress)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    onCleanup(() => {
      window.removeEventListener('blur', resetPress)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  },
  { flush: 'sync' },
)
// 实例卸载也清理按住标记；没有计时器或逐帧动画需要保留。
onBeforeUnmount(resetPress)
</script>

<style scoped lang="scss">
.widget-button {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  font: inherit;
  text-align: inherit;
  touch-action: manipulation;
  user-select: none;
  background: transparent;
  border: 0;
  &.is-preview {
    cursor: pointer;
  }
  &:focus-visible {
    outline: 2px solid #5ab2a5;
    outline-offset: 2px;
  }
}
.widget-button__surface {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
  transform-origin: center;
  transition:
    transform 80ms ease-out,
    filter 80ms ease-out;
}
.widget-button__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.widget-button__text-box {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.widget-button__text {
  display: block;
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .widget-button__surface {
    transition: none;
  }
}
</style>
