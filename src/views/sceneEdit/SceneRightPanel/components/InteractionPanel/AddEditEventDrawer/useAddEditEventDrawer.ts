import { cloneDeep } from 'lodash-es'
import {
  getWidgetDataConfigById,
  getSceneObjectDataConfigByUuid,
  normalizeDataConfig,
  getPublicRequests,
} from '@/utils/dataConfig'
import { getEditorSceneObjectDataConfig } from '@/integrations/scene/editorSceneDataConfigAdapter'
import { isEditorThreeDimensionalComponentContent } from '@/integrations/scene/editorSceneObjectTree'
import {
  buildParameterSourceOptions,
  buildWidgetTargetPropertyOptions,
  getParameterSourceValue,
  setParameterSourceValue,
} from '@/utils/dataConfig/interactionParameterSources'
import { buildParameterTargetOptions } from '@/utils/dataConfig/interactionRequestParameters'
import {
  buildParameterComponentOptions,
  getParameterComponentValue,
  getParameterSourceType as resolveParameterSourceType,
  setParameterSourceType,
  setParameterSourceComponent,
  type ParameterSourceType,
} from './parameterSource'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { FormInstance, FormItemRule } from 'element-plus'
import { ElMessage } from 'element-plus'
import type {
  ActionItem,
  ConditionItem,
  InteractionEvent,
  SceneAllContentsItem,
} from '@/types/threeScene'
import {
  ACTION_TYPE_ENUM,
  CONDITION_RULE_TYPE_ENUM,
  INTERACTIVE_EVENT_ENUM,
  SCENE_PANEL_ENUM,
  VIEW_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import {
  getInteractiveEventConfig,
  getSceneAllContents,
  getStatusListConfig,
  updateInteractiveEventConfig,
  updateStatusListConfig,
} from '@/utils/renderScene/sceneModules'
import { useSceneStore, useSceneWidgetStore } from '@/stores/sceneEditStore'
import { createUuid } from '@/utils/uuid'
import { rules } from '../config'
import AddRulesDialog from '../AddRulesDialog/index.vue'
import { appLogger } from '@/utils/logger'
import {
  getWidgetInteractiveEventList,
  getSelectedWidgetEventTarget,
  getWidgetStatusList,
  getWidgetTargetOptions,
  setWidgetInteractiveEventList,
  setWidgetStatusList,
} from '@/integrations/scene/widgetPanels'
import { collectWidgetGroupWidgetIds } from '@/utils/widgetLayer'
import { getActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import { getEditorSceneObjectTargetCandidates } from '@/integrations/scene/editorSceneObjectTargetCandidates'
import { resolveEditorSceneObjectIdFromLegacyEngineId } from '@/integrations/scene/editorSceneRuntimeObjectIdResolver'
import {
  getEditorSceneObjectInteractiveEventList,
  getEditorSceneObjectStatusList,
  hasEditorSceneObjectInteractiveEventMetadata,
  hasEditorSceneObjectStatusListMetadata,
  setEditorSceneObjectInteractiveEventList,
  setEditorSceneObjectStatusList,
} from '@/integrations/scene/editorSceneInteractionConfigAdapter'
import {
  buildSceneObjectTargetValueAliasMap,
  getSceneObjectTargetOptionValue,
  normalizeSceneObjectTargetValue,
  type SceneObjectTargetValueAliasMap,
} from '@/utils/renderScene/sceneObjectTargetResolver'

interface Props {
  panelType: SCENE_PANEL_ENUM.Status | SCENE_PANEL_ENUM.Interaction
  /**
   * 保存目标来源。
   * widget 只写二维部件配置，sceneObject 只写三维对象配置，auto 保留旧兼容策略。
   */
  targetKind: 'auto' | 'widget' | 'sceneObject'
}

/**
 * 条件组页签的最小表单数据。
 * 这里单独声明轻量结构，避免在组合式函数内部散落匿名对象类型。
 */
interface ConditionGroupItem {
  id: string
  conditionGroupName: string
  conditionBlokList: {
    id: string
    conditionList: ConditionItem[]
    actionList: ActionItem[]
    conditionRuleType: CONDITION_RULE_TYPE_ENUM | null
  }[]
}

/**
 * 交互事件抽屉的状态与行为编排。
 *
 * 目标是把“表单状态构造、条件组/动作增删改、保存回写、规则弹窗联动”
 * 从超长 SFC 中抽离出来，让视图文件只保留模板渲染和对外暴露入口。
 */
export const useAddEditEventDrawer = (props: Props) => {
  const store = useSceneStore()
  const widgetStore = useSceneWidgetStore()
  const formRef = useTemplateRef<FormInstance>('formRef')
  const addRuleDialogRef = useTemplateRef<InstanceType<typeof AddRulesDialog>>('addRuleDialogRef')

  const drawerVisible = ref(false)
  /** 抽屉标题由新增/编辑模式和面板类型共同决定，避免视图层写死状态文案。 */
  const drawerMode = ref<'add' | 'edit'>('add')
  const currentEditingBlock = ref<{ groupIndex: number; blockIndex: number } | null>(null)

  /**
   * 状态面板与交互面板共用一个抽屉。
   * 这里按面板类型切换校验规则，避免在模板里散落多套判断。
   */
  const formRules = computed(() => {
    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      return {
        statusName: [{ required: true, message: '请输入状态名称', trigger: 'blur' }],
      }
    }
    return rules
  })

  const createAction = (): ActionItem => ({
    // 动作、条件组和事件都属于编辑器运行时结构，统一复用工具层 UUID 出口。
    id: createUuid(),
    actionType: ACTION_TYPE_ENUM.HighlightModel,
    // 默认向模型传参，切换类别时保留两类目标各自已填写的映射。
    parameterTargetKind: 'model',
    actionTargetUuid: '',
    actionTargetWidgetIds: [],
    actionTargetWidgetGroupIds: [],
    observationTargetUuid: '',
    jumpLink: '',
    highlightColor: '#ff0000',
    modelVisibility: false,
    modelParameterMappings: [{ sourceField: '', targetProperty: '' }],
    widgetVisibility: false,
    widgetParameterMappings: [{ sourceField: '', targetProperty: '' }],
    widgetPropertyAssignments: [{ targetProperty: '', value: '' }],
    widgetTargetProperty: '',
    widgetValueSourceField: '',
    highlightStatus: true,
    transitionTime: 0,
    smoothFactor: 0,
    newWindow: false,
    sceneUrl: '',
    viewType: VIEW_TYPE_ENUM.Front,
  })

  const createConditionBlock = () => ({
    id: createUuid(),
    conditionList: [] as ConditionItem[],
    actionList: [createAction()],
    conditionRuleType: null as CONDITION_RULE_TYPE_ENUM | null,
  })

  const createConditionGroup = (index = 1): ConditionGroupItem => ({
    id: createUuid(),
    conditionGroupName: `条件组${index}`,
    conditionBlokList: [createConditionBlock()],
  })

  /**
   * 兼容并标准化动作里的三维目标字段。
   *
   * 旧场景里可能缺少部件动作字段，回显前先补齐默认值，避免切到新动作类型时
   * 表单读到 undefined。
   *
   * 刷新重开后，已保存事件可能带着旧运行时 `onlyUuid` 或当前 `uuid`。
   * 这里使用一次性别名表把两类历史值改写成当前选项值（option value），
   * 让组件库（Element Plus）能正常显示模型名称，同时保存时继续写入稳定的
   * SceneObject.id。
   */
  const normalizeActionItem = (
    action: Partial<ActionItem>,
    sceneObjectTargetAliasMap: SceneObjectTargetValueAliasMap,
    fallbackSceneObjectTargetValue: string | null,
  ): ActionItem => {
    const legacyMapping =
      typeof action?.widgetValueSourceField === 'string' &&
      typeof action?.widgetTargetProperty === 'string' &&
      (action.widgetValueSourceField.trim() || action.widgetTargetProperty.trim())
        ? [
            {
              sourceField: action.widgetValueSourceField.trim(),
              targetProperty: action.widgetTargetProperty.trim(),
            },
          ]
        : []
    const widgetParameterMappings = Array.isArray(action?.widgetParameterMappings)
      ? action.widgetParameterMappings
          .map((mapping) => ({
            sourceRequestId: mapping.sourceRequestId,
            sourceField: typeof mapping?.sourceField === 'string' ? mapping.sourceField : '',
            targetProperty:
              typeof mapping?.targetProperty === 'string' ? mapping.targetProperty : '',
          }))
          .filter((mapping) => mapping.sourceField || mapping.targetProperty)
      : legacyMapping
    const modelParameterMappings = Array.isArray(action?.modelParameterMappings)
      ? action.modelParameterMappings
          .map((mapping) => ({
            sourceRequestId: mapping.sourceRequestId,
            sourceField: typeof mapping?.sourceField === 'string' ? mapping.sourceField : '',
            targetProperty:
              typeof mapping?.targetProperty === 'string' ? mapping.targetProperty : '',
          }))
          .filter((mapping) => mapping.sourceField || mapping.targetProperty)
      : []
    const widgetPropertyAssignments = Array.isArray(action?.widgetPropertyAssignments)
      ? action.widgetPropertyAssignments.map((assignment) => ({
          targetProperty:
            typeof assignment?.targetProperty === 'string' ? assignment.targetProperty : '',
          value: typeof assignment?.value === 'string' ? assignment.value : '',
        }))
      : []
    const actionTargetWidgetIds = Array.isArray(action?.actionTargetWidgetIds)
      ? action.actionTargetWidgetIds
      : []
    const actionTargetWidgetGroupIds = Array.isArray(action?.actionTargetWidgetGroupIds)
      ? action.actionTargetWidgetGroupIds.filter(
          (groupId): groupId is string => typeof groupId === 'string' && Boolean(groupId),
        )
      : []
    const legacyGroupIds =
      action.actionType === ACTION_TYPE_ENUM.WidgetVisibility &&
      actionTargetWidgetGroupIds.length === 0 &&
      actionTargetWidgetIds.length > 0
        ? widgetStore.widgetLayerTree
            .filter((node) => node.type === 'group')
            .filter((group) => {
              const groupWidgetIds = collectWidgetGroupWidgetIds(
                widgetStore.widgetLayerTree,
                group.id,
              )
              return (
                groupWidgetIds.length === actionTargetWidgetIds.length &&
                groupWidgetIds.every((widgetId) => actionTargetWidgetIds.includes(widgetId))
              )
            })
            .map((group) => group.id)
        : []
    const normalized = {
      ...createAction(),
      ...action,
      actionTargetWidgetIds:
        action.actionType === ACTION_TYPE_ENUM.WidgetVisibility &&
        (actionTargetWidgetGroupIds.length || legacyGroupIds.length)
          ? []
          : Array.isArray(action?.actionTargetWidgetIds)
            ? // 历史传参多选回显为首个目标，避免单选界面隐藏其它仍会执行的目标。
              action.actionType === ACTION_TYPE_ENUM.PassParameters ||
              action.actionType === ACTION_TYPE_ENUM.SetWidgetProperty ||
              action.actionType === ACTION_TYPE_ENUM.WidgetVisibilityWithValue
              ? action.actionTargetWidgetIds.slice(0, 1)
              : action.actionTargetWidgetIds
            : [],
      actionTargetWidgetGroupIds:
        action.actionType === ACTION_TYPE_ENUM.WidgetVisibility
          ? actionTargetWidgetGroupIds.length
            ? actionTargetWidgetGroupIds
            : legacyGroupIds
          : [],
      widgetVisibility:
        typeof action?.widgetVisibility === 'boolean' ? action.widgetVisibility : false,
      widgetParameterMappings: widgetParameterMappings.length
        ? widgetParameterMappings
        : [{ sourceField: '', targetProperty: '' }],
      modelParameterMappings: modelParameterMappings.length
        ? modelParameterMappings
        : [{ sourceField: '', targetProperty: '' }],
      widgetPropertyAssignments: widgetPropertyAssignments.length
        ? widgetPropertyAssignments
        : action?.actionType === ACTION_TYPE_ENUM.SetWidgetProperty
          ? [{ targetProperty: '', value: '' }]
          : [],
      widgetTargetProperty:
        typeof action?.widgetTargetProperty === 'string' ? action.widgetTargetProperty : '',
      widgetValueSourceField:
        typeof action?.widgetValueSourceField === 'string' ? action.widgetValueSourceField : '',
    }

    return {
      ...normalized,
      // 历史复合动作回显为统一传参动作，并保留原目标与映射。
      actionType:
        action.actionType === ACTION_TYPE_ENUM.ModelVisibilityWithValue ||
        action.actionType === ACTION_TYPE_ENUM.WidgetVisibilityWithValue
          ? ACTION_TYPE_ENUM.PassParameters
          : normalized.actionType,
      parameterTargetKind:
        action.actionType === ACTION_TYPE_ENUM.WidgetVisibilityWithValue
          ? 'widget'
          : normalized.parameterTargetKind,
      actionTargetUuid: normalizeSceneObjectTargetValue(
        normalized.actionTargetUuid,
        sceneObjectTargetAliasMap,
        fallbackSceneObjectTargetValue,
      ),
      observationTargetUuid: normalizeSceneObjectTargetValue(
        normalized.observationTargetUuid,
        sceneObjectTargetAliasMap,
        fallbackSceneObjectTargetValue,
      ),
    }
  }

  const createDefaultEvent = (): InteractionEvent => {
    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      return {
        id: createUuid(),
        statusName: '状态名称1',
        isOpen: true,
        conditionGroupList: [createConditionGroup()],
      }
    }
    return {
      id: createUuid(),
      eventName: '事件',
      isOpen: true,
      eventType: INTERACTIVE_EVENT_ENUM.Click,
      conditionGroupList: [createConditionGroup()],
    }
  }

  const formData = ref<InteractionEvent>(createDefaultEvent())
  const currentCondition = ref<string>(formData.value.conditionGroupList?.[0]?.id ?? '')

  const actionTargetOptions = ref<SceneAllContentsItem[]>([])
  /** 按结构树现有分类一次性拆分候选，避免每条动作重复扫描场景。 */
  const parameterTargetOptions = computed(() => {
    const models: SceneAllContentsItem[] = []
    const components: SceneAllContentsItem[] = []
    for (const item of actionTargetOptions.value) {
      ;(isEditorThreeDimensionalComponentContent(item) ? components : models).push(item)
    }
    return { models, components }
  })
  /** 来源可逐动作配置；缓存按动作编号隔离，避免一个动作换来源污染其它动作。 */
  const parameterSourceOptions = ref<
    Record<string, ReturnType<typeof buildParameterSourceOptions>>
  >({})
  /** 来源类型复用目标的分类规则；候选集中按类型索引，不混合展示模型和组件。 */
  const parameterComponentOptions = computed(() =>
    buildParameterComponentOptions(widgetTargetOptions.value, actionTargetOptions.value),
  )
  const getParameterSourceType = (action: ActionItem) =>
    resolveParameterSourceType(action, parameterComponentOptions.value.typeByValue)
  const getParameterComponentOptions = (action: ActionItem) =>
    parameterComponentOptions.value.byType[getParameterSourceType(action)]

  /** 类型切换必须先重新选择对象，字段候选随之清空，接收目标及其参数保留。 */
  const handleParameterSourceTypeChange = (action: ActionItem, type: ParameterSourceType) => {
    setParameterSourceType(action, type)
    refreshParameterSourceOptions(action)
  }

  /** 换来源只清空来源请求与字段，目标参数继续保留，避免产生跨组件的同名字段误绑定。 */
  const handleParameterSourceChange = (action: ActionItem, value: string) => {
    setParameterSourceComponent(action, value, parameterComponentOptions.value.typeByValue)
    refreshParameterSourceOptions(action)
  }
  /** 每条动作缓存自己的目标请求参数，目标切换或展开时刷新，不在渲染期遍历请求。 */
  const parameterRequestOptions = ref<
    Record<string, ReturnType<typeof buildParameterTargetOptions>>
  >({})
  /** 每条自定义赋值动作缓存其目标组件的数据映射字段，避免在模板渲染时反复读取配置。 */
  const widgetPropertyOptions = ref<
    Record<string, ReturnType<typeof buildWidgetTargetPropertyOptions>>
  >({})

  const refreshParameterRequestOptions = (action: ActionItem, visible = true) => {
    if (!visible || action.actionType !== ACTION_TYPE_ENUM.PassParameters) return
    const targetId = action.actionTargetUuid
    const widget =
      action.parameterTargetKind === 'widget'
        ? useSceneWidgetStore().getWidgetById(action.actionTargetWidgetIds?.[0] || '')
        : null
    const config =
      action.parameterTargetKind === 'widget'
        ? normalizeDataConfig(widget?.component.dataConfig)
        : getEditorSceneObjectDataConfig({
            store: getScenePlatformStore(),
            objectId: resolveSceneObjectId(targetId),
            legacyDataConfig: getSceneObjectDataConfigByUuid(targetId),
          })
    // 公共接口只读取场景配置，候选标明会刷新全部绑定组件，事件仍只保存字段引用。
    const requestOptions = buildParameterTargetOptions(config, getPublicRequests())
    const fieldOptions =
      action.parameterTargetKind === 'widget'
        ? buildWidgetTargetPropertyOptions(
            getWidgetDataConfigById(action.actionTargetWidgetIds?.[0]),
          )
        : []
    const seen = new Set(requestOptions.map((item) => item.value))
    parameterRequestOptions.value[action.id] = [
      ...requestOptions,
      ...fieldOptions.filter((item) => !seen.has(item.value)),
    ]
  }

  /** 更换接收对象后旧参数编号不再有效，保留来源并清空目标参数。 */
  const handleParameterTargetChange = (action: ActionItem) => {
    if (action.actionType !== ACTION_TYPE_ENUM.PassParameters) return
    for (const mapping of action.modelParameterMappings || []) mapping.targetProperty = ''
    for (const mapping of action.widgetParameterMappings || []) mapping.targetProperty = ''
    refreshParameterRequestOptions(action)
  }
  /**
   * 按动作目标组件刷新可写字段。
   * 复用数据面板的配置读取适配器，确保尚未显式保存的自动映射与已保存的手动字段都能进入候选。
   */
  const refreshWidgetPropertyOptions = (action: ActionItem, visible = true) => {
    if (!visible || action.actionType !== ACTION_TYPE_ENUM.SetWidgetProperty) return
    const targetWidgetId = action.actionTargetWidgetIds?.[0]
    widgetPropertyOptions.value[action.id] = buildWidgetTargetPropertyOptions(
      getWidgetDataConfigById(targetWidgetId),
    )
  }

  /** 更换目标组件后旧映射路径可能失效，清空路径并保留用户录入的内容。 */
  const handleWidgetPropertyTargetChange = (action: ActionItem) => {
    if (action.actionType !== ACTION_TYPE_ENUM.SetWidgetProperty) return
    for (const assignment of action.widgetPropertyAssignments || []) {
      assignment.targetProperty = ''
    }
    refreshWidgetPropertyOptions(action)
  }
  /** 部件显隐动作允许选择真实部件或视觉分组，分组目标不展开为成员部件。 */
  const getWidgetTargetRules = (action: ActionItem): FormItemRule[] => [
    {
      validator: (_rule, _value, callback) => {
        const hasTarget = Boolean(
          action.actionTargetWidgetIds?.length || action.actionTargetWidgetGroupIds?.length,
        )
        callback(hasTarget ? undefined : new Error('请选择部件'))
      },
      trigger: 'change',
    },
  ]
  const widgetTargetOptions = computed(() => getWidgetTargetOptions())
  const getScenePlatformStore = () => getActiveSceneViewportHost()?.getStore() ?? null

  /**
   * 在打开动作编辑抽屉前刷新目标候选。
   *
   * 候选以统一场景仓库为主，未映射旧对象才由 renderScene 快照补齐；既避免交互面板
   * 直接把 Three 场景遍历当作数据源，也避免输入动作参数时重复进行全场景查询。
   */
  const refreshActionTargetOptions = () => {
    actionTargetOptions.value = getEditorSceneObjectTargetCandidates({
      store: getScenePlatformStore(),
      legacyContents: getSceneAllContents(),
    })
  }

  /**
   * 指定来源时只读取该对象；默认当前组件沿用原选中优先级。
   * 下拉展开时读取最新配置，不在每次输入或渲染时扫描请求，也不复用其它动作的候选。
   */
  const refreshParameterSourceOptions = (action: ActionItem, visible = true) => {
    if (!visible) return
    const source = action.parameterSource
    // 已选择具体类型但尚未选对象时不能回退到当前组件，否则会误展示原组件字段。
    if (source && !source.id) {
      parameterSourceOptions.value[action.id] = []
      return
    }
    const widget = getSelectedWidgetEventTarget()
    const useWidget = source
      ? source.kind === 'widget'
      : props.targetKind === 'widget' || (props.targetKind === 'auto' && widget !== null)
    const widgetId = source?.id || widget?.id
    const objectTargetId = source?.id || store.currentTransformMaterialUuid
    const objectId = useWidget ? null : resolveSceneObjectId(objectTargetId)
    const config = useWidget
      ? normalizeDataConfig(widgetStore.getWidgetById(widgetId)?.component.dataConfig) ||
        getWidgetDataConfigById(widgetId)
      : getEditorSceneObjectDataConfig({
          store: getScenePlatformStore(),
          objectId,
          legacyDataConfig: getSceneObjectDataConfigByUuid(objectTargetId),
        })
    parameterSourceOptions.value[action.id] = buildParameterSourceOptions(config)
  }

  /** 已迁移对象使用稳定 SceneObject.id；未建立映射时返回 null 并保留旧对象兜底。 */
  const resolveSceneObjectId = (legacyObjectId: string | null | undefined) => {
    const host = getActiveSceneViewportHost()
    const scenePlatformStore = host?.getStore() ?? null
    if (!legacyObjectId || !scenePlatformStore) return null
    if (scenePlatformStore.getObject(legacyObjectId)) return legacyObjectId
    return resolveEditorSceneObjectIdFromLegacyEngineId(host?.getRuntime(), legacyObjectId)
  }

  const setFormState = (event: InteractionEvent) => {
    // 每次打开重建动作候选，关闭前的已删除动作不继续占用缓存。
    parameterSourceOptions.value = {}
    parameterRequestOptions.value = {}
    widgetPropertyOptions.value = {}
    const sceneObjectTargetAliasMap = buildSceneObjectTargetValueAliasMap(actionTargetOptions.value)
    /**
     * 兼容上一阶段已经保存的坏数据：动作目标是刷新前的 onlyUuid，但当前对象已无法
     * 通过该 onlyUuid 反查。抽屉编辑的是当前选中模型的事件，因此这里把无法匹配的
     * 三维目标回迁为当前模型 id；用户确认保存后，配置会固化为稳定 SceneObject.id。
     */
    const fallbackSceneObjectTargetValue =
      props.targetKind === 'widget'
        ? null
        : (resolveSceneObjectId(store.currentTransformMaterialUuid) ??
          store.currentTransformMaterialUuid)

    if (!event.conditionGroupList?.length) {
      event.conditionGroupList = [createConditionGroup()]
    }
    event.conditionGroupList.forEach((group) => {
      group.conditionBlokList?.forEach((block) => {
        block.actionList = (block.actionList || []).map((action) =>
          normalizeActionItem(action, sceneObjectTargetAliasMap, fallbackSceneObjectTargetValue),
        )
        block.actionList.forEach((action) => {
          if (action.actionType === ACTION_TYPE_ENUM.PassParameters)
            refreshParameterSourceOptions(action)
          refreshParameterRequestOptions(action)
          refreshWidgetPropertyOptions(action)
        })
      })
    })
    formData.value = event
    currentCondition.value = event.conditionGroupList[0].id
    nextTick(() => formRef.value?.clearValidate())
  }

  const showAddDrawer = () => {
    drawerMode.value = 'add'
    refreshActionTargetOptions()
    const nextEvent = createDefaultEvent()

    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      const writeTarget = resolveWriteTarget()
      const currentList = writeTarget
        ? writeTarget.kind === 'widget'
          ? getWidgetStatusList(writeTarget.id)
          : getSceneObjectEventList(writeTarget.uuid)
        : []

      /**
       * Figma 状态默认名称使用“状态名称N”。仅在打开新增抽屉时扫描一次当前列表，
       * 取已存在序号的最大值加一；删除中间项后不复用旧序号，避免名称碰撞和渲染期重复查询。
       */
      const nextStatusIndex = currentList.reduce((maxIndex, item) => {
        const matched = /^状态名称(\d+)$/.exec(String(item.statusName ?? '').trim())
        return matched ? Math.max(maxIndex, Number(matched[1])) : maxIndex
      }, 0)
      nextEvent.statusName = `状态名称${nextStatusIndex + 1}`
    }

    setFormState(nextEvent)
    drawerVisible.value = true
  }

  const showEditDrawer = (event: InteractionEvent) => {
    drawerMode.value = 'edit'
    refreshActionTargetOptions()
    setFormState(cloneDeep(event))
    drawerVisible.value = true
  }

  const handleClose = () => {
    drawerVisible.value = false
  }

  /**
   * 当前抽屉的保存目标。
   * 二维模式强制写部件，三维模式强制写场景对象，auto 仅作为旧入口兼容。
   */
  const resolveWriteTarget = () => {
    const currentUuid = store.currentTransformMaterialUuid
    const currentWidgetTarget = getSelectedWidgetEventTarget()

    if (props.targetKind === 'widget') {
      return currentWidgetTarget
        ? {
            kind: 'widget' as const,
            id: currentWidgetTarget.id,
            childId: currentWidgetTarget.childId,
          }
        : null
    }
    if (props.targetKind === 'sceneObject') {
      return currentUuid ? { kind: 'sceneObject' as const, uuid: currentUuid } : null
    }
    if (currentUuid) return { kind: 'sceneObject' as const, uuid: currentUuid }
    if (currentWidgetTarget) {
      return {
        kind: 'widget' as const,
        id: currentWidgetTarget.id,
        childId: currentWidgetTarget.childId,
      }
    }
    return null
  }

  /**
   * 读取三维对象事件配置时优先使用 SceneStore 元数据。
   *
   * 抽屉保存时需要基于当前最新列表做 upsert；这里把读取策略集中起来，
   * 避免状态页签和交互页签各自重复处理旧 userData 兜底。
   */
  const getSceneObjectEventList = (uuid: string) => {
    const scenePlatformStore = getScenePlatformStore()
    const sceneObjectId = resolveSceneObjectId(uuid)

    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      const legacyEventList = !hasEditorSceneObjectStatusListMetadata(
        scenePlatformStore,
        sceneObjectId,
      )
        ? getStatusListConfig(uuid)
        : []
      return getEditorSceneObjectStatusList({
        store: scenePlatformStore,
        objectId: sceneObjectId ?? uuid,
        legacyEventList,
      })
    }

    const legacyEventList = !hasEditorSceneObjectInteractiveEventMetadata(
      scenePlatformStore,
      sceneObjectId,
    )
      ? getInteractiveEventConfig(uuid)
      : []
    return getEditorSceneObjectInteractiveEventList({
      store: scenePlatformStore,
      objectId: sceneObjectId ?? uuid,
      legacyEventList,
    })
  }

  /**
   * 已迁移对象只写 SceneObject.metadata，并由 RuntimeBridge 统一镜像旧 userData。
   * 未建立映射的存量对象才保留旧模块回退，避免页面同时维护两份可变配置。
   */
  const setSceneObjectEventList = (uuid: string, nextList: InteractionEvent[]) => {
    const scenePlatformStore = getScenePlatformStore()
    const sceneObjectId = resolveSceneObjectId(uuid)

    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      if (!sceneObjectId) updateStatusListConfig(uuid, nextList)
      setEditorSceneObjectStatusList({
        store: scenePlatformStore,
        objectId: sceneObjectId ?? uuid,
        eventList: nextList,
      })
      return
    }

    if (!sceneObjectId) updateInteractiveEventConfig(uuid, nextList)
    setEditorSceneObjectInteractiveEventList({
      store: scenePlatformStore,
      objectId: sceneObjectId ?? uuid,
      eventList: nextList,
    })
  }

  /**
   * 把当前抽屉中的交互事件或状态写回显式目标。
   * 二维部件写入 component.statusList / component.interactiveEvent；
   * 三维对象写入 SceneObject.metadata，并同步旧 userData 链路作为运行时兜底。
   */
  const upsertInteractiveEvent = (event: InteractionEvent) => {
    const writeTarget = resolveWriteTarget()

    if (!writeTarget) {
      // 没有模型或部件选中时无法确定写回目标，只记录警告并保持抽屉数据不变。
      appLogger.warn('AddEditEventDrawer', '当前未选中模型或部件，无法保存')
      return
    }

    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      const currentList =
        writeTarget.kind === 'widget'
          ? getWidgetStatusList(writeTarget.id)
          : getSceneObjectEventList(writeTarget.uuid)
      const nextList = [...currentList]
      const targetIndex = nextList.findIndex((item) => item.id === event.id)
      if (targetIndex > -1) {
        nextList[targetIndex] = event
      } else {
        nextList.push(event)
      }
      if (writeTarget.kind === 'widget') {
        setWidgetStatusList(writeTarget.id, nextList)
      } else {
        setSceneObjectEventList(writeTarget.uuid, nextList)
      }
      return
    }

    const currentList =
      writeTarget.kind === 'widget'
        ? getWidgetInteractiveEventList(writeTarget.id, writeTarget.childId)
        : getSceneObjectEventList(writeTarget.uuid)
    const nextList = [...currentList]
    const targetIndex = nextList.findIndex((item) => item.id === event.id)
    if (targetIndex > -1) {
      nextList[targetIndex] = event
    } else {
      nextList.push(event)
    }
    if (writeTarget.kind === 'widget') {
      setWidgetInteractiveEventList(writeTarget.id, nextList, writeTarget.childId)
    } else {
      setSceneObjectEventList(writeTarget.uuid, nextList)
    }
  }

  const handleConfirm = () => {
    // 所有动作共用一次来源组件索引，避免逐动作重复扫描完整场景候选。
    const validSourceTypes = parameterComponentOptions.value.typeByValue
    // 请求或参数可能在动作编辑期间被删除，提交前重新校验编码值归属。
    // 每个动作建立一次集合，多个映射校验无需重复扫描目标请求。
    for (const group of formData.value.conditionGroupList || []) {
      for (const block of group.conditionBlokList || []) {
        for (const action of block.actionList || []) {
          if (action.actionType === ACTION_TYPE_ENUM.PassParameters) {
            // 来源组件、请求或映射可能在抽屉打开后被删除，提交时再校验一次最新候选。
            if (
              action.parameterSource &&
              validSourceTypes.get(getParameterComponentValue(action)) !==
                getParameterSourceType(action)
            ) {
              ElMessage.warning('来源组件已变更，请重新选择')
              return
            }
            refreshParameterSourceOptions(action)
            refreshParameterRequestOptions(action)
            const validTargets = new Set(
              (parameterRequestOptions.value[action.id] || []).map((item) => item.value),
            )
            const mappings =
              action.parameterTargetKind === 'widget'
                ? action.widgetParameterMappings
                : action.modelParameterMappings
            const sourceOptions = parameterSourceOptions.value[action.id] || []
            const validSourceValues = new Set(sourceOptions.map((item) => item.value))
            const validSourceFields = new Set(
              sourceOptions.map((item) => (JSON.parse(item.value) as [string, string])[1]),
            )
            if (
              mappings?.some(
                (mapping) =>
                  mapping.sourceField &&
                  !validSourceValues.has(getParameterSourceValue(mapping)) &&
                  (mapping.sourceRequestId || !validSourceFields.has(mapping.sourceField)),
              )
            ) {
              ElMessage.warning('来源映射字段已变更，请重新选择')
              return
            }
            if (
              mappings?.some(
                (mapping) => mapping.targetProperty && !validTargets.has(mapping.targetProperty),
              )
            ) {
              ElMessage.warning('目标请求参数已变更，请重新选择')
              return
            }
          }
          if (action.actionType === ACTION_TYPE_ENUM.SetWidgetProperty) {
            refreshWidgetPropertyOptions(action)
            const validProperties = new Set(
              (widgetPropertyOptions.value[action.id] || []).map((item) => item.value),
            )
            if (
              action.widgetPropertyAssignments?.some(
                ({ targetProperty }) => targetProperty && !validProperties.has(targetProperty),
              )
            ) {
              ElMessage.warning('目标组件映射字段已变更，请重新选择')
              return
            }
          }
        }
      }
    }
    formRef.value?.validate().then(() => {
      const event = cloneDeep(formData.value)
      // 单目标动作只保存界面可见的首个目标，避免旧多选配置在隐藏目标上继续执行。
      for (const group of event.conditionGroupList || []) {
        for (const block of group.conditionBlokList || []) {
          for (const action of block.actionList || []) {
            if (
              action.actionType === ACTION_TYPE_ENUM.PassParameters ||
              action.actionType === ACTION_TYPE_ENUM.SetWidgetProperty
            ) {
              action.actionTargetWidgetIds = action.actionTargetWidgetIds?.slice(0, 1) || []
            }
          }
        }
      }
      upsertInteractiveEvent(event)
      handleClose()
    })
  }

  const addConditionGroup = () => {
    if (!formData.value.conditionGroupList) {
      formData.value.conditionGroupList = []
    }
    const group = createConditionGroup(formData.value.conditionGroupList.length + 1)
    formData.value.conditionGroupList.push(group)
    currentCondition.value = group.id
  }

  const deleteConditionGroup = (id: string) => {
    const list = formData.value.conditionGroupList
    if (!list?.length) return
    const removeIndex = list.findIndex((item) => item.id === id)
    if (removeIndex === -1) return
    list.splice(removeIndex, 1)
    if (!list.length) {
      currentCondition.value = ''
      return
    }
    const next = list[removeIndex] ?? list[removeIndex - 1]
    currentCondition.value = next?.id ?? ''
  }

  const getConditionGroup = (groupIndex: number) => formData.value.conditionGroupList?.[groupIndex]

  const addConditionBlock = (groupIndex: number) => {
    const group = getConditionGroup(groupIndex)
    if (!group) return
    if (!group.conditionBlokList) {
      group.conditionBlokList = []
    }
    group.conditionBlokList.push(createConditionBlock())
  }

  const deleteConditionBlock = (groupIndex: number, blockIndex: number) => {
    getConditionGroup(groupIndex)?.conditionBlokList?.splice(blockIndex, 1)
  }

  const moveConditionBlock = (groupIndex: number, blockIndex: number, offset: number) => {
    const group = getConditionGroup(groupIndex)
    if (!group?.conditionBlokList) return
    const targetIndex = blockIndex + offset
    if (targetIndex < 0 || targetIndex >= group.conditionBlokList.length) return
    const [block] = group.conditionBlokList.splice(blockIndex, 1)
    group.conditionBlokList.splice(targetIndex, 0, block)
  }

  const getConditionBlock = (groupIndex: number, blockIndex: number) =>
    getConditionGroup(groupIndex)?.conditionBlokList?.[blockIndex]

  const addAction = (groupIndex: number, blockIndex: number) => {
    const block = getConditionBlock(groupIndex, blockIndex)
    if (!block) return
    if (!block.actionList) {
      block.actionList = []
    }
    block.actionList.push(createAction())
  }

  /** 为参数化动作追加一行来源字段到目标属性的映射。 */
  const addWidgetParameterMapping = (action: ActionItem) => {
    if (!Array.isArray(action.widgetParameterMappings)) {
      action.widgetParameterMappings = []
    }
    action.widgetParameterMappings.push({ sourceField: '', targetProperty: '' })
  }

  /** 为自定义赋值动作追加一行“目标映射字段 → 固定文本”配置。 */
  const addWidgetPropertyAssignment = (action: ActionItem) => {
    if (!Array.isArray(action.widgetPropertyAssignments)) {
      action.widgetPropertyAssignments = []
    }
    action.widgetPropertyAssignments.push({ targetProperty: '', value: '' })
  }

  /** 删除自定义赋值行时保留一个空白入口，方便用户继续配置。 */
  const removeWidgetPropertyAssignment = (action: ActionItem, assignmentIndex: number) => {
    if (!Array.isArray(action.widgetPropertyAssignments)) return
    if (action.widgetPropertyAssignments.length <= 1) {
      action.widgetPropertyAssignments[0] = { targetProperty: '', value: '' }
      return
    }
    action.widgetPropertyAssignments.splice(assignmentIndex, 1)
  }

  /** 为参数化模型动作追加一行来源字段到目标属性的映射。 */
  const addModelParameterMapping = (action: ActionItem) => {
    if (!Array.isArray(action.modelParameterMappings)) {
      action.modelParameterMappings = []
    }
    action.modelParameterMappings.push({ sourceField: '', targetProperty: '' })
  }

  /** 删除模型参数映射行，至少保留一行以便用户继续录入。 */
  const removeModelParameterMapping = (action: ActionItem, mappingIndex: number) => {
    if (!Array.isArray(action.modelParameterMappings)) return
    if (action.modelParameterMappings.length <= 1) {
      action.modelParameterMappings[0] = { sourceField: '', targetProperty: '' }
      return
    }
    action.modelParameterMappings.splice(mappingIndex, 1)
  }

  /** 删除参数映射行，至少保留一行以便用户继续录入。 */
  const removeWidgetParameterMapping = (action: ActionItem, mappingIndex: number) => {
    if (!Array.isArray(action.widgetParameterMappings)) return
    if (action.widgetParameterMappings.length <= 1) {
      action.widgetParameterMappings[0] = { sourceField: '', targetProperty: '' }
      return
    }
    action.widgetParameterMappings.splice(mappingIndex, 1)
  }

  const deleteAction = (groupIndex: number, blockIndex: number, actionIndex: number) => {
    const block = getConditionBlock(groupIndex, blockIndex)
    if (!block?.actionList) return
    block.actionList.splice(actionIndex, 1)
  }

  const moveAction = (
    groupIndex: number,
    blockIndex: number,
    actionIndex: number,
    offset: number,
  ) => {
    const block = getConditionBlock(groupIndex, blockIndex)
    if (!block?.actionList) return
    const targetIndex = actionIndex + offset
    if (targetIndex < 0 || targetIndex >= block.actionList.length) return
    const [action] = block.actionList.splice(actionIndex, 1)
    block.actionList.splice(targetIndex, 0, action)
  }

  const addConditionDialog = (groupIndex: number, blockIndex: number) => {
    const block = getConditionBlock(groupIndex, blockIndex)
    if (!block) return

    currentEditingBlock.value = { groupIndex, blockIndex }
    addRuleDialogRef.value?.showDialog({
      conditionList: block.conditionList,
      conditionRuleType: block.conditionRuleType,
    })
  }

  const handleRulesConfirm = (data: {
    conditionList: ConditionItem[]
    conditionRuleType: CONDITION_RULE_TYPE_ENUM | null
  }) => {
    if (!currentEditingBlock.value) return

    const { groupIndex, blockIndex } = currentEditingBlock.value
    const block = getConditionBlock(groupIndex, blockIndex)
    if (!block) return

    block.conditionList = data.conditionList
    block.conditionRuleType = data.conditionRuleType
    currentEditingBlock.value = null
  }

  return {
    formRef,
    addRuleDialogRef,
    drawerVisible,
    drawerMode,
    formData,
    formRules,
    currentCondition,
    actionTargetOptions,
    widgetTargetOptions,
    getWidgetTargetRules,
    parameterTargetOptions,
    getParameterComponentOptions,
    getParameterSourceType,
    handleParameterSourceTypeChange,
    getParameterComponentValue,
    handleParameterSourceChange,
    parameterSourceOptions,
    parameterRequestOptions,
    widgetPropertyOptions,
    refreshParameterRequestOptions,
    refreshWidgetPropertyOptions,
    handleParameterTargetChange,
    handleWidgetPropertyTargetChange,
    refreshParameterSourceOptions,
    getParameterSourceValue,
    setParameterSourceValue,
    getSceneObjectTargetOptionValue,
    showAddDrawer,
    showEditDrawer,
    handleClose,
    handleConfirm,
    addConditionGroup,
    deleteConditionGroup,
    addConditionBlock,
    deleteConditionBlock,
    moveConditionBlock,
    addAction,
    addWidgetParameterMapping,
    removeWidgetParameterMapping,
    addWidgetPropertyAssignment,
    removeWidgetPropertyAssignment,
    addModelParameterMapping,
    removeModelParameterMapping,
    deleteAction,
    moveAction,
    addConditionDialog,
    handleRulesConfirm,
  }
}
