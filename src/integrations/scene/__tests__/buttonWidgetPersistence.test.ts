import { describe, expect, it } from 'vitest'
import Config from '@/packages/components/Control/VButton/config'
import { createSceneDefinition, type SceneDefinition } from '@/scene-platform'
import { serializeSceneDefinitionToFourPackages } from '../sceneFourPackage'
import { assembleSceneDefinitionFromRuntimeFragments } from '../sceneRuntimeFragmentAssembler'
import { collectScenePackageResourceReferences } from '../sceneAssetUrlResolver'
import { validateEditorSceneAssets } from '../editorSceneAssetValidation'
import { INTERACTIVE_EVENT_ENUM } from '@/enums/scenePanelEnum'

/** 使用真实按钮配置覆盖双场景保存协议，而非单独复制按钮配置字段。 */
const createButtonScene = (type: 'local3d' | 'gis', config = new Config()): SceneDefinition =>
  createSceneDefinition({
    id: `button-${type}`,
    name: '按钮保存验证',
    type,
    coordinateSystem:
      type === 'local3d'
        ? { kind: 'local', unit: 'meter', upAxis: 'Y', gridEnabled: true }
        : {
            kind: 'wgs84',
            terrainEnabled: false,
            defaultLongitude: 104,
            defaultLatitude: 30,
            defaultHeight: 100,
          },
    settings: {
      editor: {
        widgetSceneFragment: {
          widgets: [{ id: 'button-1', component: config }],
          widgetLayerTree: [{ id: 'button-1', type: 'widget' }],
        },
      },
    },
  })

describe('可编辑按钮的资源与外观保存', () => {
  it.each(['local3d', 'gis'] as const)(
    '%s 场景保存双背景、文字布局及事件，重开后按编号恢复',
    (type) => {
      const config = new Config()
      config.option.images.normal = {
        sourceType: 'resource-market',
        value: 'https://temporary.example/normal?token=secret',
        resourceKey: 'button-normal',
        fit: 'cover',
      }
      config.option.images.pressed = {
        sourceType: 'resource-market',
        value: 'https://temporary.example/pressed?token=secret',
        resourceKey: 'button-pressed',
        fit: 'contain',
      }
      Object.assign(config.option.text, {
        value: '查看\n详情',
        align: 'right',
        verticalAlign: 'bottom',
        x: 12,
        y: 5,
        width: 130,
        height: 32,
        bold: true,
        fontSize: 22,
      })
      config.interactiveEvent = [
        {
          id: 'button-click',
          eventName: '按钮点击',
          eventType: INTERACTIVE_EVENT_ENUM.Click,
          isOpen: true,
          conditionGroupList: [],
        },
      ]
      const scene = createButtonScene(type, config)
      const payload = serializeSceneDefinitionToFourPackages(scene)
      const twoD = JSON.parse(payload.twoDJson)
      const dependencies = JSON.parse(payload.dependenciesJson)
      const saved = twoD.components[0]
      expect(saved.componentType).toBe('VButton')
      expect(saved.resourceRefKeys).toEqual(['button-normal', 'button-pressed'])
      expect(dependencies.resources).toHaveLength(2)
      expect(saved.renderConfig.images.normal.value).toBe('')
      expect(saved.renderConfig.images.pressed.value).toBe('')
      expect(payload.twoDJson).not.toContain('token=secret')
      expect(saved.renderConfig.text).toEqual(config.option.text)
      expect(saved.renderConfig.press).toEqual(config.option.press)
      expect(dependencies.behaviors).toHaveLength(1)
      // 保存不能清空编辑器的当前图片地址，也不携带按住等瞬时状态。
      expect(config.option.images.normal.value).toContain('token=secret')
      expect(saved.renderConfig).not.toHaveProperty('pressed')

      const restored = assembleSceneDefinitionFromRuntimeFragments({
        manifest: {
          fragmentType: 'manifest',
          fragmentKey: scene.id,
          contentJson: JSON.stringify(payload),
        },
        options: {
          sceneId: scene.id,
          resolvedAssetUrls: {
            'button-pressed': '/new/pressed.png',
            'button-normal': '/new/normal.png',
          },
        },
      })
      const editor = restored.settings.editor as unknown as {
        widgetSceneFragment: { widgets: Array<{ component: Config }> }
      }
      const option = editor.widgetSceneFragment.widgets[0].component.option
      expect(option.images.normal.value).toBe('/new/normal.png')
      expect(option.images.pressed.value).toBe('/new/pressed.png')
      expect(option.text).toEqual(config.option.text)
      expect(editor.widgetSceneFragment.widgets[0].component.interactiveEvent).toEqual(
        config.interactiveEvent,
      )
      // 重复保存清除重新解析的地址，资源拥有者和稳定编号保持不变。
      const repeated = serializeSceneDefinitionToFourPackages(restored)
      expect(JSON.parse(repeated.dependenciesJson)).toEqual(dependencies)
      expect(repeated.twoDJson).not.toContain('/new/')
      expect(collectScenePackageResourceReferences(twoD)).toEqual([
        { resourceKey: 'button-normal', assetId: 'button-normal', kind: 'image' },
        { resourceKey: 'button-pressed', assetId: 'button-pressed', kind: 'image' },
      ])
    },
  )

  it('同图复用只登记一个依赖，外部背景保留地址并清除陈旧编号', () => {
    const config = new Config()
    config.option.images.normal = {
      sourceType: 'resource-market',
      value: '/shared.png',
      resourceKey: 'shared-image',
      fit: 'fill',
    }
    config.option.images.pressed = { ...config.option.images.normal }
    const payload = serializeSceneDefinitionToFourPackages(createButtonScene('local3d', config))
    expect(JSON.parse(payload.dependenciesJson).resources).toHaveLength(1)
    expect(JSON.parse(payload.twoDJson).components[0].resourceRefKeys).toEqual(['shared-image'])
    config.option.images.pressed = {
      sourceType: 'external',
      value: '/external.png',
      resourceKey: 'stale-image',
      fit: 'contain',
    }
    const next = serializeSceneDefinitionToFourPackages(createButtonScene('local3d', config))
    expect(JSON.parse(next.twoDJson).components[0].renderConfig.images.pressed).toEqual({
      sourceType: 'external',
      value: '/external.png',
      fit: 'contain',
    })
    expect(next.dependenciesJson).not.toContain('stale-image')
  })

  it('空背景可保存，已选市场资源缺失地址时提示异常', () => {
    const config = new Config()
    expect(validateEditorSceneAssets(createButtonScene('local3d', config)).issues).toHaveLength(0)
    config.option.images.pressed = {
      sourceType: 'resource-market',
      value: '',
      resourceKey: 'missing-image',
      fit: 'fill',
    }
    expect(validateEditorSceneAssets(createButtonScene('local3d', config)).issues).toHaveLength(1)
  })
})
