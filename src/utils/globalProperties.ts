import mitt from 'mitt'
import type { App } from 'vue'
import type { Emitter } from 'mitt'
import type { MITT_ON_KEY_ENUM } from '@/enums/index'

// 定义事件类型（可以移到单独的类型文件中）
type Events = {
  [MITT_ON_KEY_ENUM.PAGE_LOADING]: boolean
  [MITT_ON_KEY_ENUM.SCENE_LOADING]: boolean
  [MITT_ON_KEY_ENUM.MODEL_DRAG_START]: unknown
  [MITT_ON_KEY_ENUM.TEMPLATE_DRAG_START]: unknown
  [MITT_ON_KEY_ENUM.PREVIEW_SCENE]: boolean
  [MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL]: unknown
  [MITT_ON_KEY_ENUM.TEMPLATE_DRAG_CANCEL]: unknown
  [MITT_ON_KEY_ENUM.HISTORY_APPLIED]: boolean
  [MITT_ON_KEY_ENUM.TRANSFORM_MODE_SHORTCUT]: 'translate' | 'rotate' | 'scale'
}

const emitter: Emitter<Events> = mitt<Events>()

const globalProperties = {
  install(app: App) {
    app.config.globalProperties.$eventBus = emitter
  },
}

export default {
  ...globalProperties,
}
