import { describe, expect, it } from 'vitest'
import ImageConfig from '../config'
import { applyWidgetBindings } from '@/utils/dataConfig/dataConfigRuntimeBindings'
import { inferWidgetDataConfigFromOption } from '@/utils/dataConfig/widgetDataInference'
import { buildWidgetRuntimeOption } from '@/utils/dataConfig'
import { createSceneDefinition } from '@/scene-platform'
import { serializeSceneDefinitionToFourPackages } from '@/integrations/scene/sceneFourPackage'
import { assembleSceneDefinitionFromRuntimeFragments } from '@/integrations/scene/sceneRuntimeFragmentAssembler'

/** 使用真实图片配置和通用绑定入口，复现数据面板把市场编号映射到图片的路径。 */
const createMarketImage = () => {
  const component = new ImageConfig()
  component.option.sourceType = 'resource-market'
  component.option.resourceKey = 'market-image-a'
  component.option.value = '/runtime/image-a.png'
  return component
}

const bindings = [
  { kind: 'widget', targetPath: 'value', sourceField: 'imageId', valueType: 'string' },
] as const

describe('市场图片数据映射', () => {
  it('映射编号时同步切换资源编号并清除旧图片地址', () => {
    const component = createMarketImage()
    applyWidgetBindings(component, [...bindings], { imageId: 'market-image-b' })

    expect(component.option.resourceKey).toBe('market-image-b')
    expect(component.option.value).toBe('')
  })

  it('默认静态数据使用稳定编号，避免将临时地址当作市场图片数据', () => {
    const component = createMarketImage()
    const config = inferWidgetDataConfigFromOption('Widget', 'VImage', component.option)

    expect(config?.dataset.source).toEqual([{ value: 'market-image-a' }])
    expect(config?.request.config).toEqual({ data: [{ value: 'market-image-a' }] })
  })

  it('预览态按自定义来源字段切换编号，同时保留原始基础配置', () => {
    const component = createMarketImage()
    const config = inferWidgetDataConfigFromOption('Widget', 'VImage', component.option)!
    config.request.config = { data: [{ imageId: 'market-image-c' }] }
    config.bindings = [...bindings]
    component.dataConfig = config

    const runtime = buildWidgetRuntimeOption(component)
    expect(runtime).toMatchObject({ resourceKey: 'market-image-c', value: '' })
    // 预览配置是副本，退出预览后仍保留编辑器中的基础选择。
    expect(component.option.resourceKey).toBe('market-image-a')
  })

  it('同编号保留已解析地址，缺少来源字段时保持当前图片', () => {
    const component = createMarketImage()
    applyWidgetBindings(component, [...bindings], { imageId: 'market-image-a' })
    expect(component.option.value).toBe('/runtime/image-a.png')
    applyWidgetBindings(component, [...bindings], {})
    expect(component.option.resourceKey).toBe('market-image-a')
  })

  it.each(['', null])('空映射值 %s 清除旧编号及地址', (imageId) => {
    const component = createMarketImage()
    applyWidgetBindings(component, [...bindings], { imageId })
    expect(component.option.resourceKey).toBeUndefined()
    expect(component.option.value).toBe('')
  })

  it('地址映射和外部图片维持直接地址语义', () => {
    const component = createMarketImage()
    applyWidgetBindings(component, [...bindings], { imageId: 'https://example.test/image-b.png' })
    expect(component.option.value).toBe('https://example.test/image-b.png')
    component.option.sourceType = 'external'
    applyWidgetBindings(component, [...bindings], { imageId: '/images/external.png' })
    expect(component.option.value).toBe('/images/external.png')
  })

  it('映射后保存、恢复、再预览均使用新编号', () => {
    const component = createMarketImage()
    component.dataConfig = inferWidgetDataConfigFromOption('Widget', 'VImage', component.option)!
    component.dataConfig.request.config = { data: [{ imageId: 'market-image-saved' }] }
    component.dataConfig.bindings = [...bindings]
    applyWidgetBindings(component, [...bindings], { imageId: 'market-image-saved' })
    const scene = createSceneDefinition({
      id: 'image-binding-scene',
      name: '图片数据绑定',
      type: 'local3d',
      settings: {
        editor: {
          widgetSceneFragment: {
            widgets: [{ id: 'image-binding-widget', component }],
            widgetLayerTree: [{ id: 'image-binding-widget', type: 'widget' }],
          },
        },
      },
    })
    const payload = serializeSceneDefinitionToFourPackages(scene)
    const twoD = JSON.parse(payload.twoDJson)
    expect(twoD.components[0].renderConfig).toMatchObject({
      resourceKey: 'market-image-saved',
      value: '',
    })
    expect(twoD.components[0].resourceRefKeys).toEqual(['market-image-saved'])
    expect(JSON.parse(payload.dependenciesJson).resources).toEqual([
      expect.objectContaining({ resourceKey: 'market-image-saved', kind: 'image' }),
    ])
    const restored = assembleSceneDefinitionFromRuntimeFragments({
      manifest: {
        fragmentType: 'manifest',
        fragmentKey: scene.id,
        contentJson: JSON.stringify(payload),
      },
      options: {
        sceneId: scene.id,
        resolvedAssetUrls: {
          'market-image-saved': '/runtime/saved.png',
        },
      },
    })
    const editor = restored.settings.editor as {
      widgetSceneFragment: { widgets: Array<{ component: ImageConfig }> }
    }
    const restoredImage = editor.widgetSceneFragment.widgets[0].component
    expect(restoredImage.option.value).toBe('/runtime/saved.png')
    expect(buildWidgetRuntimeOption(restoredImage)).toMatchObject({
      resourceKey: 'market-image-saved',
      value: '/runtime/saved.png',
    })
  })
})
