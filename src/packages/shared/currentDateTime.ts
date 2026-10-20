import { computed, onMounted, onUnmounted, ref } from 'vue'

const padTimePart = (value: number) => String(value).padStart(2, '0')

export const formatCurrentDateTime = (datetime: Date) => {
  const date = `${datetime.getFullYear()}-${padTimePart(datetime.getMonth() + 1)}-${padTimePart(datetime.getDate())}`
  const time = [
    padTimePart(datetime.getHours()),
    padTimePart(datetime.getMinutes()),
    padTimePart(datetime.getSeconds()),
  ].join(':')
  return { date, time, dateTime: `${date} ${time}` }
}

/** 系统时间组件与页面框架时间槽位共用的本地时钟。 */
export const useCurrentDateTime = (refreshInterval = 500) => {
  const current = ref(formatCurrentDateTime(new Date()))
  let timer: ReturnType<typeof setInterval> | null = null

  const update = () => {
    current.value = formatCurrentDateTime(new Date())
  }

  onMounted(() => {
    update()
    timer = setInterval(update, refreshInterval)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return {
    date: computed(() => current.value.date),
    time: computed(() => current.value.time),
    dateTime: computed(() => current.value.dateTime),
  }
}
