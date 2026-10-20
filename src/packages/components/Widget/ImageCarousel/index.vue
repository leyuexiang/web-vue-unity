<template>
  <div
    class="widget-image-carousel"
    :class="[
      `is-${option.direction || 'horizontal'}`,
      `is-dot-${option.dotPlacement || 'bottom'}`,
      `is-effect-${option.effect || 'slide'}`,
    ]"
    :style="transitionStyleVars"
  >
    <button
      v-if="option.showArrow && normalizedImages.length > 1"
      class="widget-image-carousel__arrow widget-image-carousel__arrow--prev"
      @click="handlePrev"
    >
      ‹
    </button>

    <div class="widget-image-carousel__viewport">
      <template v-if="option.effect === 'card'">
        <div class="widget-image-carousel__card-track">
          <img
            v-for="(src, index) in normalizedImages"
            :key="`${index}-${src}`"
            :src="src"
            class="widget-image-carousel__image widget-image-carousel__image--card"
            :class="getCardRoleClass(index)"
            :style="imageFitStyle"
          />
        </div>
      </template>
      <transition v-else :name="transitionName" mode="out-in">
        <img
          v-if="currentImage"
          :key="currentImageKey"
          :src="currentImage"
          class="widget-image-carousel__image"
          :style="imageFitStyle"
        />
      </transition>
    </div>

    <button
      v-if="option.showArrow && normalizedImages.length > 1"
      class="widget-image-carousel__arrow widget-image-carousel__arrow--next"
      @click="handleNext"
    >
      ›
    </button>

    <div
      v-if="option.showDots && normalizedImages.length > 1"
      class="widget-image-carousel__dots"
      :class="`is-type-${option.dotType || 'dot'}`"
    >
      <span
        v-for="(_, index) in normalizedImages"
        :key="index"
        class="widget-image-carousel__dot"
        :class="{ 'is-active': index === activeIndex }"
        @click="handleDotClick(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import Config from './config'

defineOptions({ name: 'VImageCarousel' })

const props = defineProps<{ option: Config['option'] }>()

const activeIndex = ref(0)
const transitionDirection = ref<1 | -1>(1)
let timer: ReturnType<typeof setInterval> | null = null

const normalizedImages = computed(() => {
  /**
   * 图片轮播需要同时兼容两条来源：
   * 1. 基础面板手工配置写入的 dataset；
   * 2. 数据映射链路写入的 options。
   *
   * 优先读取 options，是因为运行时数据映射会覆盖它；
   * 若没有映射结果，再回退到 dataset。
   */
  const optionImages = Array.isArray(props.option.options)
    ? props.option.options.map((item) => String(item?.value || '')).filter(Boolean)
    : []
  if (optionImages.length > 0) return optionImages

  return Array.isArray(props.option.dataset)
    ? props.option.dataset.map((item) => String(item || '')).filter(Boolean)
    : []
})

const currentImage = computed(() => normalizedImages.value[activeIndex.value] || '')
const currentImageKey = computed(() => `${activeIndex.value}-${currentImage.value}`)
const normalizedImagesSignature = computed(() => JSON.stringify(normalizedImages.value))
const imageFitStyle = computed<CSSProperties>(() => ({
  objectFit: props.option.fit,
}))

/**
 * 轮播方向和前进/后退方向都会影响 slide 动画的位移方向。
 * 这里统一转成 CSS 变量，让样式层可以直接消费，不再只是“切配置名”。
 */
const transitionStyleVars = computed(() => {
  const isVertical = props.option.direction === 'vertical'
  return {
    /**
     * 统一把过渡位移和动画时长下发给样式层：
     * - slide 依赖 enter / leave 位移方向；
     * - card 依赖更柔和的统一时长；
     * - 这样后续继续微调视觉时，不需要把数值散落到多处样式规则里。
     */
    '--carousel-enter-x': isVertical ? '0%' : `${transitionDirection.value * 100}%`,
    '--carousel-leave-x': isVertical ? '0%' : `${transitionDirection.value * -100}%`,
    '--carousel-enter-y': isVertical ? `${transitionDirection.value * 100}%` : '0%',
    '--carousel-leave-y': isVertical ? `${transitionDirection.value * -100}%` : '0%',
    '--carousel-motion-duration': props.option.effect === 'card' ? '420ms' : '360ms',
  }
})

const transitionName = computed(() =>
  props.option.effect === 'fade'
    ? 'widget-image-carousel-fade'
    : 'widget-image-carousel-slide',
)

const stopAutoplay = () => {
  if (timer) clearInterval(timer)
  timer = null
}

const startAutoplay = () => {
  stopAutoplay()
  if (!props.option.autoplay || normalizedImages.value.length <= 1) return
  timer = setInterval(() => {
    handleNext()
  }, Math.max(Number(props.option.interval) || 5000, 1000))
}

const handlePrev = () => {
  if (normalizedImages.value.length <= 1) return
  transitionDirection.value = -1
  activeIndex.value =
    (activeIndex.value - 1 + normalizedImages.value.length) % normalizedImages.value.length
}

const handleNext = () => {
  if (normalizedImages.value.length <= 1) return
  transitionDirection.value = 1
  activeIndex.value = (activeIndex.value + 1) % normalizedImages.value.length
}

const handleDotClick = (index: number) => {
  if (index === activeIndex.value || index < 0 || index >= normalizedImages.value.length) return
  transitionDirection.value = index > activeIndex.value ? 1 : -1
  activeIndex.value = index
  /**
   * 手动点击指示器后，下一次自动轮播应从“这次手动操作”开始重新计时。
   * 否则用户刚点完，旧计时器可能立刻又切到下一张，交互体验会很突兀。
   */
  startAutoplay()
}

/**
 * 卡片效果必须让图片节点保持稳定，不能每次切换都销毁重建。
 * 否则浏览器只能看到“旧节点消失 + 新节点出现”，看起来就像硬切换。
 *
 * 这里把所有图片常驻渲染，只根据当前索引切换角色类名：
 * - current：当前主图
 * - prev / next：左右两侧过渡图
 * - hidden：其余图片缩到后面并透明隐藏
 */
const getCardRoleClass = (index: number) => {
  const total = normalizedImages.value.length
  if (total === 0) return 'is-hidden'
  if (total === 1) return index === 0 ? 'is-current' : 'is-hidden'

  const prevIndex = (activeIndex.value - 1 + total) % total
  const nextIndex = (activeIndex.value + 1) % total

  if (index === activeIndex.value) return 'is-current'
  if (index === prevIndex) return 'is-prev'
  if (index === nextIndex) return 'is-next'
  return 'is-hidden'
}

watch(
  normalizedImagesSignature,
  () => {
    /**
     * 这里只在“图片列表内容真正变化”时重置轮播位置。
     * 画布层每次渲染都会重新生成一份运行时 option，
     * 如果直接 watch 数组/对象引用，切换选中对象时也会被误判成“数据变了”，
     * 于是当前页被重置回第一张，看起来就像组件被刷新了。
     */
    activeIndex.value = 0
    transitionDirection.value = 1
    startAutoplay()
  },
  { immediate: true },
)

watch(
  () => [props.option.autoplay, props.option.interval],
  () => {
    /**
     * 自动播放和间隔变化只需要重启计时器，
     * 不应该顺带重置当前显示索引。
     */
    startAutoplay()
  },
)

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<style scoped lang="scss">
.widget-image-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.widget-image-carousel__viewport {
  position: relative;
  width: 100%;
  height: 100%;
}
.widget-image-carousel__card-track {
  position: relative;
  width: 100%;
  height: 100%;
}
.widget-image-carousel__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

/**
 * 卡片效果用三层图模拟旧项目“中间主图 + 两侧陪衬”观感。
 * 当前项目没有旧项目那套原生轮播库，这里用 transform / opacity / scale
 * 做近似实现，保证切换时至少有明确的卡片位移和层级变化。
 */
.widget-image-carousel__image--card {
  transition:
    transform var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1),
    opacity var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1),
    filter var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1),
    z-index 0ms linear;
}
.widget-image-carousel__image--card.is-prev,
.widget-image-carousel__image--card.is-next {
  z-index: 1;
  pointer-events: none;

  /**
   * 两侧卡片需要更明显的“陪衬感”，
   * 所以这里继续压低透明度，让中间主卡更突出。
   */
  opacity: 0.5;
  filter: saturate(0.58) brightness(0.82);
}
.widget-image-carousel__image--card.is-current {
  z-index: 3;
  opacity: 1;
  filter: saturate(1) brightness(1);
}
.widget-image-carousel__image--card.is-hidden {
  z-index: 0;
  pointer-events: none;

  /**
   * 隐藏态保留极弱可见度，避免从有到无的突兀断层，
   * 同时仍然保证它不会干扰当前卡片层级。
   */
  opacity: 0.5;
  filter: saturate(0.5) brightness(0.7);
}
.widget-image-carousel.is-horizontal .widget-image-carousel__image--card.is-prev {
  transform: translate3d(-24%, 0, 0) scale(0.74);
}
.widget-image-carousel.is-horizontal .widget-image-carousel__image--card.is-current {
  transform: translate3d(0, 0, 0) scale(1);
}
.widget-image-carousel.is-horizontal .widget-image-carousel__image--card.is-next {
  transform: translate3d(24%, 0, 0) scale(0.74);
}
.widget-image-carousel.is-horizontal .widget-image-carousel__image--card.is-hidden {
  transform: translate3d(0, 0, 0) scale(0.58);
}
.widget-image-carousel.is-vertical .widget-image-carousel__image--card.is-prev {
  transform: translate3d(0, -24%, 0) scale(0.74);
}
.widget-image-carousel.is-vertical .widget-image-carousel__image--card.is-current {
  transform: translate3d(0, 0, 0) scale(1);
}
.widget-image-carousel.is-vertical .widget-image-carousel__image--card.is-next {
  transform: translate3d(0, 24%, 0) scale(0.74);
}
.widget-image-carousel.is-vertical .widget-image-carousel__image--card.is-hidden {
  transform: translate3d(0, 0, 0) scale(0.58);
}

/**
 * 淡入淡出只处理透明度。
 * 这样和旧项目的 fade 语义更接近，不会出现滑动位移。
 */
.widget-image-carousel-fade-enter-active,
.widget-image-carousel-fade-leave-active {
  transition: opacity var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1);
}
.widget-image-carousel-fade-enter-from,
.widget-image-carousel-fade-leave-to {
  opacity: 0;
}
.widget-image-carousel-fade-enter-to,
.widget-image-carousel-fade-leave-from {
  opacity: 1;
}

/**
 * 滑动效果使用位置过渡。
 * 位移方向由脚本层通过 CSS 变量传入，支持：
 * - 水平前进 / 后退
 * - 垂直前进 / 后退
 */
.widget-image-carousel-slide-enter-active,
.widget-image-carousel-slide-leave-active {
  transition:
    transform var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1),
    opacity var(--carousel-motion-duration) cubic-bezier(0.22, 1, 0.36, 1);
}
.widget-image-carousel-slide-enter-from {
  opacity: 0.92;
  transform: translate3d(var(--carousel-enter-x), var(--carousel-enter-y), 0);
}
.widget-image-carousel-slide-enter-to,
.widget-image-carousel-slide-leave-from {
  opacity: 1;
  transform: translate(0, 0);
}
.widget-image-carousel-slide-leave-to {
  opacity: 0.92;
  transform: translate3d(var(--carousel-leave-x), var(--carousel-leave-y), 0);
}
.widget-image-carousel__arrow {
  position: absolute;
  top: 50%;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: rgb(234 244 255 / 92%);
  cursor: pointer;
  background: rgb(9 20 35 / 82%);
  border: 1px solid rgb(124 169 255 / 24%);
  border-radius: 999px;
  transform: translateY(-50%);
}
.widget-image-carousel__arrow--prev {
  left: 8px;
}
.widget-image-carousel__arrow--next {
  right: 8px;
}
.widget-image-carousel__dots {
  position: absolute;

  /**
   * 卡片模式下当前主图层级会抬高到 3。
   * 指示器必须再高一层，否则会被主图盖住，出现“点存在但看不到”的问题。
   */
  z-index: 5;
  display: flex;
  gap: 6px;
}
.widget-image-carousel.is-dot-bottom .widget-image-carousel__dots {
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
}
.widget-image-carousel.is-dot-top .widget-image-carousel__dots {
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}
.widget-image-carousel.is-dot-left .widget-image-carousel__dots {
  top: 50%;
  left: 8px;
  flex-direction: column;
  transform: translateY(-50%);
}
.widget-image-carousel.is-dot-right .widget-image-carousel__dots {
  top: 50%;
  right: 8px;
  flex-direction: column;
  transform: translateY(-50%);
}
.widget-image-carousel__dot {
  width: 8px;
  height: 8px;
  cursor: pointer;
  background: rgb(255 255 255 / 35%);
  border-radius: 999px;
}
.widget-image-carousel__dots.is-type-line .widget-image-carousel__dot {
  width: 18px;
  height: 4px;
  border-radius: 999px;
}
.widget-image-carousel__dot.is-active {
  background: #4a9ef8;
}
</style>
