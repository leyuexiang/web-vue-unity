import 'vue'
import type { App } from 'vue'
import type { Emitter } from 'mitt'
import type { MITT_ON_KEY_ENUM } from '@/enums/index'

export {}

// 定义你的事件类型
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

declare module 'vue' {
  interface ComponentCustomProperties {
    $eventBus: Emitter<Events>
  }
}

declare global {
  interface Window {
    $vue: App<Element>
  }
}
