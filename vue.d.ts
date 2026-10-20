declare module '*.vue' {
  // 将单文件组件声明为 Vue 组件类型，使 TypeScript 能正确推导 `import X from './X.vue'`。
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
