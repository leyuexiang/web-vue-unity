/**
 * 所有二维组件、图表文字面板共用的字体列表与回退链。
 *
 * 字体文件由 `src/assets/main.css` 统一注册为本地资源，选项中的第一个
 * 字体名必须和 `@font-face` 的家族名一致；后面的通用字体只在资源加载失败
 * 或文本不包含目标字体字形时作为浏览器回退。集中维护可以避免不同面板出现
 * 同名字体取值不一致，也避免每个选择器重复创建相同数组。
 */
export const FONT_FAMILY_OPTIONS = [
  { label: '系统默认', value: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '思源黑体', value: '"Source Han Sans SC", "Microsoft YaHei", sans-serif' },
  { label: '思源宋体', value: '"Source Han Serif SC", "Songti SC", SimSun, serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Roboto Slab', value: '"Roboto Slab", serif' },
  { label: 'Oxanium', value: 'Oxanium, sans-serif' },
  { label: 'D-DIN', value: '"D-DIN", sans-serif' },
  { label: 'Orbitron', value: 'Orbitron, sans-serif' },
  { label: '优设标题黑', value: 'YouSheBiaoTiHei, sans-serif' },
  {
    label: '庞门正道标题体',
    value: 'PangMenZhengDaoBiaoTi, "PangMenZhengDaoBiaoTiTiMianFeiBan-4", sans-serif',
  },
] as const
