<template>
  <!-- 日期时间是一个完整文本区域，字体在容器统一继承。 -->
  <div class="decorate-time-common" :style="{ fontFamily: option.fontFamily || undefined }">
    <div
      :style="`
        color: ${option.timeColor};
        font-size: ${option.timeSize}px;
        line-height: ${option.timeLineHeight}px;
        letter-spacing: ${option.timeTextIndent}px;
        font-weight: ${option.fontWeight};
        text-shadow: ${boxShadow};
      `"
    >
      {{ dateTime }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrentDateTime } from '@/packages/shared/currentDateTime'
import Config from './config'

defineOptions({ name: 'VTimeCommon' })

const props = defineProps<{ option: Config['option'] }>()

const { dateTime } = useCurrentDateTime()
const boxShadow = computed(() => {
  if (props.option.showShadow) {
    return `${props.option.hShadow}px ${props.option.vShadow}px ${
      props.option.blurShadow}px ${props.option.colorShadow}`
  }
  return 'none'
})

</script>

<style scoped>
.decorate-time-common {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-align: center;
}
</style>
