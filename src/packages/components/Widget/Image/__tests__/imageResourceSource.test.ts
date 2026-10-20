import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')

describe('二维图片资源来源', () => {
  it('通过下拉选择提供外部资源和资源市场两种互斥模式', () => {
    const panelSource = readSource('../ConfigPanel.vue')

    expect(panelSource).toContain('<ScenePropertySelect v-model="resourceSource"')
    expect(panelSource).toContain('label="外部资源" value="external"')
    expect(panelSource).toContain('label="资源市场" value="resource-market"')
    expect(panelSource).not.toContain('ScenePropertyRadioGroup')
    expect(panelSource).toContain('placeholder="请输入在线图片链接"')
  })

  it('资源市场模式复用三维看板图片选择器并绑定稳定编号', () => {
    const panelSource = readSource('../ConfigPanel.vue')

    expect(panelSource).toContain('<ScenePropertyImageResourcePicker')
    expect(panelSource).toContain('v-model:resource-key="option.resourceKey"')
    expect(panelSource).toContain(
      "import ScenePropertyImageResourcePicker from '@/components/ScenePropertyImageResourcePicker/index.vue'",
    )
  })

  it('新建图片默认保持外部资源加载方式', () => {
    const configSource = readSource('../config.ts')

    expect(configSource).toContain("sourceType: 'external'")
  })
})
