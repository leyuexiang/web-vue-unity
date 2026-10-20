<template>
  <div ref="containerRef" class="decorate-06">
    <svg xmlns="http://www.w3.org/2000/svg" :width="w" :height="h">
      <polygon class="stroke fill" :points="`15.5 6.5 20.5 0.5 50.5 0.5 55.5 6.5 15.5 6.5`" />
      <polygon
        class="stroke fill"
        :points="`15.5 ${h - 6.5} 20.5 ${h - 0.5} 50.5 ${h - 0.5} 55.5 ${h - 6.5} 15.5 ${h - 6.5}`"
      />
      <polygon
        class="stroke fill"
        :points="`${w - 15.5} 6.5 ${w - 20.5} 0.5 ${w - 50.5} 0.5 ${w - 55.5} 6.5 ${w - 15.5} 6.5`"
      />
      <polygon
        class="stroke fill"
        :points="`${w - 15.5} ${h - 6.5} ${w - 20.5} ${h - 0.5} ${w - 50.5} ${
      h - 0.5} ${w - 55.5} ${h - 6.5} ${w - 15.5} ${h - 6.5}`"
      />
      <polygon
        class="stroke fill"
        :points="`15.5 6.5 0.5 ${h / 2} 15.5 ${h - 6.5} ${w - 15.5} ${
      h - 6.5} ${w - 0.5} ${h / 2} ${w - 15.5} 6.5 15.5 6.5`"
      />
      <polyline class="stroke fill-none" :points="`20.5 14.5 8.5 ${h / 2} 20.5 ${h - 14.5}`" />
      <polyline
        class="stroke fill-none"
        :points="`${w - 20.5} 14.5 ${w - 8.5} ${h / 2} ${w - 20.5} ${h - 14.5}`"
      />
    </svg>
    <!-- 仅标题消费字体配置，旧配置缺省时继续使用继承字体。 -->
    <span class="text" :style="{ fontFamily: option.fontFamily || undefined }">{{
      option.dataset
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VDecorate06' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-06 {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，文字与图形会空白。 */
  width: 100%;
  height: 100%;
}
.decorate-06 svg {
  position: absolute;
  z-index: 0;
  pointer-events: none;
}
.decorate-06 .fill {
  /* 动态颜色通过自定义变量传递，保留响应式更新并兼容样式值校验。 */
  --decoration-fill: v-bind('option.colors[0]');

  fill: var(--decoration-fill);
}
.decorate-06 .fill-none {
  fill: none;
}
.decorate-06 .stroke {
  --decoration-stroke: v-bind('option.colors[1]');

  stroke: var(--decoration-stroke);
}
.decorate-06 .text {
  /* 字号和文字颜色仍使用原配置，只调整样式传值方式。 */
  --decoration-font-size: v-bind('option.textSize + "px"');
  --decoration-color: v-bind('option.textColor');

  position: relative;
  z-index: 1;
  font-size: var(--decoration-font-size);
  color: var(--decoration-color);
}
</style>
