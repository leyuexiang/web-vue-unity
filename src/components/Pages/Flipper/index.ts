import Flipper from './index.vue'

type FlipType = 'up' | 'down'

// 在 verbatimModuleSyntax 模式下，值导出和类型导出需要显式拆开。

export { Flipper }
export type { FlipType }
