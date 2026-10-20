/**
 * 把持久化的动画配置转换成 animate.css 可直接消费的类名。
 * 这里只做字符串拼接，不引入任何副作用，确保拖拽和输入时不会额外放大渲染成本。
 */
export const animationsClass = (animations: string[] | undefined) => {
  if (!animations?.length) return ''
  return `animate__animated animate__${animations[0]}`
}
