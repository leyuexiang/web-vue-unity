<template>
  <ScenePropertyDrawer
    v-model="drawerVisible"
    :title="drawerTitle"
    :size="520"
    :show-close="false"
    class="scene-edit-status-drawer"
    @close="handleClose"
  >
    <!--
      Figma 节点 2112:3867 定义了状态/事件共用的规则抽屉外壳。
      这里只统一视觉结构，状态名称与事件名称/类型仍由同一份表单数据分支渲染；
      条件数组、排序、删除及保存继续由 useAddEditEventDrawer 维护，避免复制状态源。
    -->
    <template #header>
      <div class="scene-edit-status-drawer__header">
        <span class="scene-edit-status-drawer__title">{{ drawerTitle }}</span>
        <ScenePropertyButton
          text
          class="scene-edit-status-drawer__close scene-edit-property-button--bare-icon"
          aria-label="关闭"
          @click="handleClose"
        >
          <el-icon><Close /></el-icon>
        </ScenePropertyButton>
      </div>
    </template>

    <el-scrollbar class="scene-edit-status-drawer__scrollbar">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        class="scene-edit-status-drawer__form"
      >
        <el-form-item
          v-if="panelType === SCENE_PANEL_ENUM.Status"
          label="状态名称"
          prop="statusName"
          class="scene-edit-status-drawer__name-field"
        >
          <ScenePropertyInput v-model="formData.statusName" />
        </el-form-item>
        <template v-else>
          <el-form-item
            label="事件名称"
            prop="eventName"
            class="scene-edit-status-drawer__name-field"
          >
            <ScenePropertyInput v-model="formData.eventName" />
          </el-form-item>
          <el-form-item
            label="事件类型"
            prop="eventType"
            class="scene-edit-status-drawer__name-field"
          >
            <ScenePropertySelect v-model="formData.eventType" placeholder="请选择事件类型">
              <el-option
                v-for="item in eventTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ScenePropertySelect>
          </el-form-item>
        </template>
        <section class="scene-edit-status-drawer__condition-groups">
          <p class="scene-edit-status-drawer__section-title">条件组</p>
          <div class="scene-edit-status-drawer__condition-tabs">
            <!--
              条件组使用抽屉内的轻量页签，而不是 Element Plus 的卡片页签。
              原组件会让页签标题和内容共用一条弹性布局链，新增按钮会随内容高度下沉；
              这里仅改渲染结构，仍直接读写 currentCondition 和 conditionGroupList，保留原有业务行为。
            -->
            <div class="scene-edit-status-drawer__tab-bar" role="tablist" aria-label="条件组">
              <button
                v-for="item in formData.conditionGroupList"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="currentCondition === item.id"
                :class="[
                  'scene-edit-status-drawer__tab',
                  { 'is-active': currentCondition === item.id },
                ]"
                @click="currentCondition = item.id"
              >
                <span class="scene-edit-status-drawer__tab-label">{{
                  item.conditionGroupName
                }}</span>
                <el-icon
                  class="scene-edit-status-drawer__tab-close"
                  aria-label="删除条件组"
                  @click.stop="deleteConditionGroup(item.id)"
                >
                  <Close />
                </el-icon>
              </button>
              <!-- 新增条件组保持与页签同一行，避免被当前条件内容推到下方。 -->
              <ScenePropertyButton
                text
                class="scene-edit-status-drawer__add-group"
                @click="addConditionGroup"
              >
                <el-icon><Plus /></el-icon><span>添加条件组</span>
              </ScenePropertyButton>
            </div>
          </div>
          <div
            v-for="(item, groupIndex) in formData.conditionGroupList"
            :key="item.id"
            v-show="currentCondition === item.id"
            class="scene-edit-status-drawer__condition-content"
            role="tabpanel"
          >
            <div class="scene-edit-status-drawer__condition-block-list">
              <el-card
                v-for="(conditionBlok, blockIndex) in item.conditionBlokList"
                :key="conditionBlok.id"
                class="scene-edit-status-drawer__condition-block"
              >
                <template #header>
                  <div class="flex justify-between scene-edit-condition-block__header">
                    <div class="flex gap-3 items-center">
                      <span class="font-bold">条件块 {{ blockIndex + 1 }}：</span>
                      <span
                        class="text-[#3b82f6] cursor-pointer"
                        @click="addConditionDialog(groupIndex, blockIndex)"
                      >
                        {{
                          conditionBlok.conditionRuleType
                            ? rulesTypeMap[conditionBlok.conditionRuleType]
                            : '无任何条件'
                        }}</span
                      >
                    </div>
                    <div class="scene-edit-status-drawer__block-actions">
                      <ScenePropertyButton
                        text
                        class="scene-edit-status-drawer__icon-button scene-edit-property-button--bare-icon"
                        :disabled="blockIndex === 0"
                        :aria-label="blockIndex === 0 ? '已到达顶部' : '上移'"
                        @click="moveConditionBlock(groupIndex, blockIndex, -1)"
                      >
                        <el-icon><Top /></el-icon>
                      </ScenePropertyButton>
                      <ScenePropertyButton
                        text
                        class="scene-edit-status-drawer__icon-button scene-edit-property-button--bare-icon"
                        :disabled="blockIndex === (item.conditionBlokList?.length ?? 0) - 1"
                        :aria-label="
                          blockIndex === (item.conditionBlokList?.length ?? 0) - 1
                            ? '已到达底部'
                            : '下移'
                        "
                        @click="moveConditionBlock(groupIndex, blockIndex, 1)"
                      >
                        <el-icon><Bottom /></el-icon>
                      </ScenePropertyButton>
                      <ScenePropertyButton
                        text
                        class="scene-edit-status-drawer__icon-button scene-edit-property-button--bare-icon"
                        aria-label="删除条件块"
                        @click="deleteConditionBlock(groupIndex, blockIndex)"
                      >
                        <el-icon><Delete /></el-icon>
                      </ScenePropertyButton>
                    </div>
                  </div>
                </template>
                <!--
                  动作顺序变化使用 Vue 过渡组的 FLIP（首尾位置差）动画：数据仍立即交换，
                  只让卡片从旧位置平滑移动到新位置，避免新增定时器或延迟命令提交。
                -->
                <TransitionGroup
                  name="scene-action-list"
                  tag="div"
                  class="scene-edit-status-drawer__action-list"
                >
                  <div
                    v-for="(action, actionIndex) in conditionBlok.actionList"
                    :key="action.id"
                    class="scene-edit-status-drawer__condition-action"
                  >
                    <div class="pb-2 flex justify-between scene-edit-condition-action__header">
                      <span class="font-bold text-[14px]">动作 {{ actionIndex + 1 }}</span>
                      <!--
                        Element Plus 的 el-dropdown 不透传 offset 属性，默认仍会使用 12px。
                        因此通过 Popper 定位器配置覆盖同名 offset，使按钮底部到菜单顶部
                        稳定保持 Figma 规定的 7px，并避免用绝对定位破坏边界翻转能力。
                      -->
                      <el-dropdown
                        trigger="click"
                        placement="bottom-end"
                        :popper-options="actionMenuPopperOptions"
                        :show-arrow="false"
                        popper-class="scene-edit-popper scene-edit-status-drawer__action-menu"
                      >
                        <ScenePropertyButton
                          text
                          class="scene-edit-status-drawer__more scene-edit-property-button--bare-icon"
                          aria-label="更多操作"
                        >
                          <span class="scene-edit-status-drawer__more-icon" aria-hidden="true" />
                        </ScenePropertyButton>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item
                              :disabled="actionIndex === 0"
                              @click="moveAction(groupIndex, blockIndex, actionIndex, -1)"
                            >
                              <el-icon><Top /></el-icon><span>上移</span>
                            </el-dropdown-item>
                            <el-dropdown-item
                              :disabled="
                                actionIndex === (conditionBlok.actionList?.length ?? 0) - 1
                              "
                              @click="moveAction(groupIndex, blockIndex, actionIndex, 1)"
                            >
                              <el-icon><Bottom /></el-icon><span>下移</span>
                            </el-dropdown-item>
                            <el-dropdown-item
                              @click="deleteAction(groupIndex, blockIndex, actionIndex)"
                            >
                              <el-icon><Delete /></el-icon><span>删除</span>
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                    <el-form-item
                      label="动作类型"
                      :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'actionType')"
                      :rules="actionFieldRules.actionType"
                      label-width="90px"
                    >
                      <ScenePropertySelect placeholder="请选择动作类型" v-model="action.actionType">
                        <el-option
                          v-for="item in actionTypeOptions"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ScenePropertySelect>
                    </el-form-item>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.HighlightModel">
                      <el-form-item
                        label="模型"
                        :prop="
                          getActionProp(groupIndex, blockIndex, actionIndex, 'actionTargetUuid')
                        "
                        :rules="actionFieldRules.actionTargetUuid"
                        label-width="90px"
                      >
                        <ScenePropertySelect
                          placeholder="请选择动作目标"
                          v-model="action.actionTargetUuid"
                        >
                          <el-option
                            v-for="item in actionTargetOptions"
                            :key="item.uuid"
                            :label="item.name"
                            :value="getSceneObjectTargetOptionValue(item)"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <el-form-item
                        label="高亮颜色"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'highlightColor')"
                        :rules="actionFieldRules.actionTargetUuid"
                        label-width="90px"
                      >
                        <!--
                        高亮颜色的取色面板必须挂载到 body。
                        交互事件抽屉本身有独立的定位和滚动层级，如果颜色弹层留在抽屉内部，
                        外层 popper 会被右侧交互面板遮挡，导致色板和确认按钮无法正常点击。
                        这里复用任务事件颜色选择器的高层级弹层样式，保持两个业务入口的取色体验一致。
                      -->
                        <ScenePropertyColorPicker
                          :predefine="colorPickerOptions"
                          v-model="action.highlightColor"
                          label="高亮颜色"
                          variant="swatch"
                          popper-class="scene-edit-popper scene-edit-task-color-popper"
                          teleported
                          append-to="body"
                        />
                      </el-form-item>
                      <el-form-item
                        label="高亮状态"
                        :prop="
                          getActionProp(groupIndex, blockIndex, actionIndex, 'highlightStatus')
                        "
                        label-width="90px"
                      >
                        <ScenePropertySwitch v-model="action.highlightStatus" />
                      </el-form-item>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.JumpLink">
                      <el-form-item
                        label="跳转链接"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'jumpLink')"
                        :rules="actionFieldRules.jumpLink"
                        label-width="90px"
                      >
                        <ScenePropertyInput
                          v-model.trim="action.jumpLink"
                          placeholder="请输入跳转链接"
                        />
                      </el-form-item>
                      <el-form-item
                        label="新窗口打开"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'newWindow')"
                        label-width="90px"
                      >
                        <ScenePropertySwitch v-model="action.newWindow" />
                      </el-form-item>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.MoveCamera">
                      <el-form-item
                        label="观察目标"
                        :prop="
                          getActionProp(
                            groupIndex,
                            blockIndex,
                            actionIndex,
                            'observationTargetUuid',
                          )
                        "
                        :rules="actionFieldRules.observationTargetUuid"
                        label-width="90px"
                      >
                        <ScenePropertySelect
                          placeholder="请选择观察目标"
                          v-model="action.observationTargetUuid"
                        >
                          <el-option
                            v-for="item in actionTargetOptions"
                            :key="item.uuid"
                            :label="item.name"
                            :value="getSceneObjectTargetOptionValue(item)"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <el-form-item
                        label="过渡时间"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'transitionTime')"
                        label-width="90px"
                      >
                        <ScenePropertySlider
                          v-model="action.transitionTime"
                          :min="0"
                          :max="5"
                          :step="1"
                          :marks="transitionTimeMarks"
                        />
                      </el-form-item>
                      <el-form-item
                        label="平滑程度"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'smoothFactor')"
                        label-width="90px"
                      >
                        <ScenePropertySlider
                          v-model="action.smoothFactor"
                          :min="0"
                          :max="2"
                          :step="1"
                          :marks="smoothFactorMarks"
                        />
                      </el-form-item>
                    </template>
                    <!-- 来源先选择类型，再从同类对象中选择组件；默认当前组件不需要指定对象。 -->
                    <el-form-item
                      v-if="action.actionType === ACTION_TYPE_ENUM.PassParameters"
                      label="来源类型"
                      label-width="90px"
                    >
                      <ScenePropertySelect
                        :model-value="getParameterSourceType(action)"
                        @change="handleParameterSourceTypeChange(action, $event)"
                      >
                        <el-option label="当前组件" value="current" />
                        <el-option label="模型" value="model" />
                        <el-option label="二维组件" value="widget" />
                        <el-option label="三维组件" value="three-dimensional-component" />
                      </ScenePropertySelect>
                    </el-form-item>
                    <el-form-item
                      v-if="
                        action.actionType === ACTION_TYPE_ENUM.PassParameters &&
                        getParameterSourceType(action) !== 'current'
                      "
                      label="来源组件"
                      label-width="90px"
                    >
                      <ScenePropertySelect
                        :model-value="getParameterComponentValue(action)"
                        placeholder="请选择来源对象"
                        no-data-text="该来源类型暂无可选对象"
                        filterable
                        @change="handleParameterSourceChange(action, $event)"
                      >
                        <el-option
                          v-for="item in getParameterComponentOptions(action)"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ScenePropertySelect>
                    </el-form-item>
                    <!-- 传参统一选择目标类别，复用原模型和部件参数映射表单。 -->
                    <el-form-item
                      v-if="action.actionType === ACTION_TYPE_ENUM.PassParameters"
                      label="目标类型"
                      label-width="90px"
                    >
                      <ScenePropertySelect
                        v-model="action.parameterTargetKind"
                        @change="handleParameterTargetKindChange(action)"
                      >
                        <el-option label="模型" value="model" />
                        <el-option label="二维组件" value="widget" />
                        <el-option label="三维组件" value="three-dimensional-component" />
                      </ScenePropertySelect>
                    </el-form-item>
                    <template
                      v-if="
                        action.actionType === ACTION_TYPE_ENUM.ModelVisibility ||
                        (action.actionType === ACTION_TYPE_ENUM.PassParameters &&
                          action.parameterTargetKind !== 'widget')
                      "
                    >
                      <el-form-item
                        :label="
                          action.parameterTargetKind === 'three-dimensional-component' &&
                          action.actionType === ACTION_TYPE_ENUM.PassParameters
                            ? '三维组件'
                            : '模型'
                        "
                        :prop="
                          getActionProp(groupIndex, blockIndex, actionIndex, 'actionTargetUuid')
                        "
                        :rules="actionFieldRules.actionTargetUuid"
                        label-width="90px"
                      >
                        <ScenePropertySelect
                          placeholder="请选择动作目标"
                          v-model="action.actionTargetUuid"
                          @change="handleParameterTargetChange(action)"
                        >
                          <el-option
                            v-for="item in action.actionType === ACTION_TYPE_ENUM.PassParameters
                              ? action.parameterTargetKind === 'three-dimensional-component'
                                ? parameterTargetOptions.components
                                : parameterTargetOptions.models
                              : actionTargetOptions"
                            :key="item.uuid"
                            :label="item.name"
                            :value="getSceneObjectTargetOptionValue(item)"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <el-form-item
                        label="模型可见性"
                        v-if="action.actionType === ACTION_TYPE_ENUM.ModelVisibility"
                        :prop="
                          getActionProp(groupIndex, blockIndex, actionIndex, 'modelVisibility')
                        "
                        label-width="90px"
                      >
                        <ScenePropertySwitch v-model="action.modelVisibility" />
                      </el-form-item>
                      <template v-if="action.actionType === ACTION_TYPE_ENUM.PassParameters">
                        <div class="scene-edit-status-drawer__parameter-mappings">
                          <div class="scene-edit-status-drawer__parameter-mappings-title">
                            <span>参数映射</span>
                            <span class="scene-edit-status-drawer__parameter-mappings-hint">
                              <!-- 公共接口沿用同一映射控件，具体选项注明影响全部绑定组件。 -->
                              来源字段 → 目标请求参数
                            </span>
                          </div>
                          <div
                            v-for="(mapping, mappingIndex) in action.modelParameterMappings"
                            :key="`${action.id}-model-mapping-${mappingIndex}`"
                            class="scene-edit-status-drawer__parameter-mapping-row"
                          >
                            <el-form-item
                              label="来源"
                              :prop="
                                getModelParameterProp(
                                  groupIndex,
                                  blockIndex,
                                  actionIndex,
                                  mappingIndex,
                                  'sourceField',
                                )
                              "
                              :rules="actionFieldRules.widgetValueSourceField"
                              label-width="42px"
                            >
                              <!-- 来源仅来自自身数据面板的映射，按请求编号精确读取。 -->
                              <ScenePropertySelect
                                :model-value="getParameterSourceValue(mapping)"
                                placeholder="请选择映射字段"
                                filterable
                                @change="setParameterSourceValue(mapping, $event)"
                                @visible-change="refreshParameterSourceOptions(action, $event)"
                              >
                                <el-option
                                  v-for="item in parameterSourceOptions[action.id] || []"
                                  :key="item.value"
                                  :label="item.label"
                                  :value="item.value"
                                />
                              </ScenePropertySelect>
                            </el-form-item>
                            <span class="scene-edit-status-drawer__parameter-mapping-arrow">→</span>
                            <el-form-item
                              label="参数"
                              :prop="
                                getModelParameterProp(
                                  groupIndex,
                                  blockIndex,
                                  actionIndex,
                                  mappingIndex,
                                  'targetProperty',
                                )
                              "
                              :rules="actionFieldRules.widgetTargetProperty"
                              label-width="42px"
                            >
                              <!-- 目标值包含请求编号和参数位置，同名参数不会互相覆盖。 -->
                              <ScenePropertySelect
                                v-model="mapping.targetProperty"
                                placeholder="请选择请求参数"
                                no-data-text="目标暂无已配置的动态或公共接口参数"
                                filterable
                                @visible-change="refreshParameterRequestOptions(action, $event)"
                              >
                                <el-option
                                  v-for="item in parameterRequestOptions[action.id] || []"
                                  :key="item.value"
                                  :label="item.label"
                                  :value="item.value"
                                />
                              </ScenePropertySelect>
                            </el-form-item>
                            <ScenePropertyButton
                              text
                              :class="[
                                'scene-edit-status-drawer__parameter-mapping-delete',
                                'scene-edit-property-button--bare-icon',
                              ]"
                              aria-label="删除模型参数映射"
                              @click="removeModelParameterMapping(action, mappingIndex)"
                            >
                              <el-icon><Delete /></el-icon>
                            </ScenePropertyButton>
                          </div>
                          <ScenePropertyButton
                            text
                            class="scene-edit-status-drawer__add-parameter-mapping"
                            @click="addModelParameterMapping(action)"
                          >
                            <el-icon><Plus /></el-icon><span>添加参数</span>
                          </ScenePropertyButton>
                        </div>
                      </template>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.WidgetVisibility">
                      <el-form-item
                        label="部件"
                        :prop="
                          getActionProp(
                            groupIndex,
                            blockIndex,
                            actionIndex,
                            'actionTargetWidgetIds',
                          )
                        "
                        :rules="getWidgetTargetRules(action)"
                        label-width="90px"
                      >
                        <WidgetTargetTreeSelect
                          v-model="action.actionTargetWidgetIds"
                          :group-model-value="action.actionTargetWidgetGroupIds"
                          :options="widgetTargetOptions"
                          @update:group-model-value="action.actionTargetWidgetGroupIds = $event"
                        />
                      </el-form-item>
                      <el-form-item
                        label="部件可见性"
                        :prop="
                          getActionProp(groupIndex, blockIndex, actionIndex, 'widgetVisibility')
                        "
                        label-width="90px"
                      >
                        <ScenePropertySwitch v-model="action.widgetVisibility" />
                      </el-form-item>
                    </template>
                    <template
                      v-if="
                        action.actionType === ACTION_TYPE_ENUM.PassParameters &&
                        action.parameterTargetKind === 'widget'
                      "
                    >
                      <el-form-item
                        label="二维组件"
                        :prop="
                          getActionProp(
                            groupIndex,
                            blockIndex,
                            actionIndex,
                            'actionTargetWidgetIds',
                          )
                        "
                        :rules="actionFieldRules.actionTargetWidgetIds"
                        label-width="90px"
                      >
                        <!-- 单元素数组兼容执行协议；多条更新放入具名函数，避免格式化移除模板分隔符。 -->
                        <ScenePropertySelect
                          :model-value="action.actionTargetWidgetIds?.[0]"
                          placeholder="请选择二维组件"
                          filterable
                          @change="handleParameterWidgetTargetSelect(action, $event)"
                        >
                          <el-option
                            v-for="item in widgetTargetOptions"
                            :key="item.id"
                            :label="`${item.name}（${item.kindLabel}）`"
                            :value="item.id"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <div class="scene-edit-status-drawer__parameter-mappings">
                        <div class="scene-edit-status-drawer__parameter-mappings-title">
                          <span>参数映射</span>
                          <span class="scene-edit-status-drawer__parameter-mappings-hint">
                            来源字段 → 目标字段或请求参数
                          </span>
                        </div>
                        <div
                          v-for="(mapping, mappingIndex) in action.widgetParameterMappings"
                          :key="`${action.id}-mapping-${mappingIndex}`"
                          class="scene-edit-status-drawer__parameter-mapping-row"
                        >
                          <el-form-item
                            label="来源"
                            :prop="
                              getWidgetParameterProp(
                                groupIndex,
                                blockIndex,
                                actionIndex,
                                mappingIndex,
                                'sourceField',
                              )
                            "
                            :rules="actionFieldRules.widgetValueSourceField"
                            label-width="42px"
                          >
                            <!-- 二维组件和三维目标均按本动作所选来源展示字段。 -->
                            <ScenePropertySelect
                              :model-value="getParameterSourceValue(mapping)"
                              placeholder="请选择映射字段"
                              filterable
                              @change="setParameterSourceValue(mapping, $event)"
                              @visible-change="refreshParameterSourceOptions(action, $event)"
                            >
                              <el-option
                                v-for="item in parameterSourceOptions[action.id] || []"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                              />
                            </ScenePropertySelect>
                          </el-form-item>
                          <span class="scene-edit-status-drawer__parameter-mapping-arrow">→</span>
                          <el-form-item
                            label="参数"
                            :prop="
                              getWidgetParameterProp(
                                groupIndex,
                                blockIndex,
                                actionIndex,
                                mappingIndex,
                                'targetProperty',
                              )
                            "
                            :rules="actionFieldRules.widgetTargetProperty"
                            label-width="42px"
                          >
                            <ScenePropertySelect
                              v-model="mapping.targetProperty"
                              placeholder="请选择请求参数"
                              no-data-text="目标暂无已配置的动态或公共接口参数"
                              filterable
                              @visible-change="refreshParameterRequestOptions(action, $event)"
                            >
                              <el-option
                                v-for="item in parameterRequestOptions[action.id] || []"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                              />
                            </ScenePropertySelect>
                          </el-form-item>
                          <ScenePropertyButton
                            text
                            :class="[
                              'scene-edit-status-drawer__parameter-mapping-delete',
                              'scene-edit-property-button--bare-icon',
                            ]"
                            aria-label="删除参数映射"
                            @click="removeWidgetParameterMapping(action, mappingIndex)"
                          >
                            <el-icon><Delete /></el-icon>
                          </ScenePropertyButton>
                        </div>
                        <ScenePropertyButton
                          text
                          class="scene-edit-status-drawer__add-parameter-mapping"
                          @click="addWidgetParameterMapping(action)"
                        >
                          <el-icon><Plus /></el-icon><span>添加参数</span>
                        </ScenePropertyButton>
                      </div>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.SetWidgetProperty">
                      <el-form-item
                        label="二维组件"
                        :prop="
                          getActionProp(
                            groupIndex,
                            blockIndex,
                            actionIndex,
                            'actionTargetWidgetIds',
                          )
                        "
                        :rules="actionFieldRules.actionTargetWidgetIds"
                        label-width="90px"
                      >
                        <ScenePropertySelect
                          :model-value="action.actionTargetWidgetIds?.[0]"
                          placeholder="请选择二维组件"
                          filterable
                          @change="handleWidgetPropertyTargetSelect(action, $event)"
                        >
                          <el-option
                            v-for="item in widgetTargetOptions"
                            :key="item.id"
                            :label="`${item.name}（${item.kindLabel}）`"
                            :value="item.id"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <div class="scene-edit-status-drawer__parameter-mappings">
                        <div class="scene-edit-status-drawer__parameter-mappings-title">
                          <span>映射赋值</span>
                          <span class="scene-edit-status-drawer__parameter-mappings-hint">
                            目标映射字段 → 自定义内容
                          </span>
                        </div>
                        <div
                          v-for="(assignment, assignmentIndex) in action.widgetPropertyAssignments"
                          :key="`${action.id}-property-assignment-${assignmentIndex}`"
                          class="scene-edit-status-drawer__parameter-mapping-row"
                        >
                          <el-form-item
                            label="字段"
                            :prop="
                              getWidgetPropertyAssignmentProp(
                                groupIndex,
                                blockIndex,
                                actionIndex,
                                assignmentIndex,
                              )
                            "
                            :rules="actionFieldRules.widgetMappedProperty"
                            label-width="42px"
                          >
                            <ScenePropertySelect
                              v-model="assignment.targetProperty"
                              placeholder="请选择组件映射字段"
                              no-data-text="目标组件暂无已配置的映射字段"
                              filterable
                              @visible-change="refreshWidgetPropertyOptions(action, $event)"
                            >
                              <el-option
                                v-for="item in widgetPropertyOptions[action.id] || []"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                              />
                            </ScenePropertySelect>
                          </el-form-item>
                          <span class="scene-edit-status-drawer__parameter-mapping-arrow">→</span>
                          <el-form-item label="内容" label-width="42px">
                            <ScenePropertyInput
                              v-model="assignment.value"
                              placeholder="请输入自定义内容"
                            />
                          </el-form-item>
                          <ScenePropertyButton
                            text
                            :class="[
                              'scene-edit-status-drawer__parameter-mapping-delete',
                              'scene-edit-property-button--bare-icon',
                            ]"
                            aria-label="删除映射赋值"
                            @click="removeWidgetPropertyAssignment(action, assignmentIndex)"
                          >
                            <el-icon><Delete /></el-icon>
                          </ScenePropertyButton>
                        </div>
                        <ScenePropertyButton
                          text
                          class="scene-edit-status-drawer__add-parameter-mapping"
                          @click="addWidgetPropertyAssignment(action)"
                        >
                          <el-icon><Plus /></el-icon><span>添加赋值</span>
                        </ScenePropertyButton>
                      </div>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.SwitchView">
                      <el-form-item
                        label="视图"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'viewType')"
                        label-width="90px"
                      >
                        <ScenePropertySelect v-model="action.viewType" placeholder="请选择视图">
                          <el-option
                            v-for="item in viewTypeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ScenePropertySelect>
                      </el-form-item>
                      <el-form-item
                        label="过渡时间"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'transitionTime')"
                        label-width="90px"
                      >
                        <ScenePropertySlider
                          v-model="action.transitionTime"
                          :min="0"
                          :max="5"
                          :step="1"
                          :marks="transitionTimeMarks"
                        />
                      </el-form-item>
                    </template>
                    <template v-if="action.actionType === ACTION_TYPE_ENUM.SwitchScene">
                      <el-form-item
                        label="场景"
                        :prop="getActionProp(groupIndex, blockIndex, actionIndex, 'sceneUrl')"
                        :rules="actionFieldRules.sceneUrl"
                        label-width="90px"
                      >
                        <ScenePropertyInput
                          v-model.trim="action.sceneUrl"
                          placeholder="请输入场景URL"
                        />
                      </el-form-item>
                    </template>
                    <!--
                    新 Figma 语义将每个动作定义为独立卡片，只有最后一张卡片包含新增入口：
                    上方表单结束后先绘制 1px 分隔线，再从分隔线下方 8px 处开始显示按钮内容。
                    该判断只改变新增入口的视觉归属，不改变 addAction 向当前条件块末尾追加动作的逻辑。
                  -->
                    <ScenePropertyButton
                      v-if="actionIndex === (conditionBlok.actionList?.length ?? 0) - 1"
                      text
                      class="scene-edit-status-drawer__add-action"
                      @click="addAction(groupIndex, blockIndex)"
                    >
                      <el-icon><Plus /></el-icon>
                      <span>添加动作</span>
                    </ScenePropertyButton>
                  </div>
                </TransitionGroup>
              </el-card>
            </div>
            <!-- 添加条件块同样使用共享按钮，不复制独立的悬浮和可访问性实现。 -->
            <ScenePropertyButton
              text
              class="scene-edit-status-drawer__add-condition-block"
              @click="addConditionBlock(groupIndex)"
            >
              <el-icon><Plus /></el-icon>
              <span>添加条件块</span>
            </ScenePropertyButton>
          </div>
        </section>
      </el-form>
    </el-scrollbar>
    <template #footer>
      <div class="scene-edit-status-drawer__footer-actions">
        <ScenePropertyButton @click="handleClose">取消</ScenePropertyButton>
        <ScenePropertyButton type="primary" @click="handleConfirm">确定</ScenePropertyButton>
      </div>
    </template>
    <AddRulesDialog
      ref="addRuleDialogRef"
      :target-kind="props.targetKind"
      @confirm="handleRulesConfirm"
    />
  </ScenePropertyDrawer>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Bottom, Close, Delete, Plus, Top } from '@element-plus/icons-vue'
import { PREDEFINE_COLORS } from '@/config/constant'
import { ACTION_TYPE_ENUM, SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'
import {
  eventTypeOptions,
  actionTypeOptions,
  actionFieldRules,
  transitionTimeMarks,
  smoothFactorMarks,
  viewTypeOptions,
  rulesTypeMap,
} from '../config'
import ScenePropertyDrawer from '@/components/ScenePropertyDrawer/index.vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import AddRulesDialog from '../AddRulesDialog/index.vue'
import {
  getActionProp,
  getModelParameterProp,
  getWidgetParameterProp,
  getWidgetPropertyAssignmentProp,
} from '../utils'
import { useAddEditEventDrawer } from './useAddEditEventDrawer'
import type { ActionItem } from '@/types/threeScene'
import type { CommandBus } from '@/scene-platform'
import ScenePropertyColorPicker from '../../PropertyControls/ScenePropertyColorPicker/index.vue'
import ScenePropertySlider from '../../PropertyControls/ScenePropertySlider/index.vue'
import ScenePropertySwitch from '../../PropertyControls/ScenePropertySwitch/index.vue'
import WidgetTargetTreeSelect from './WidgetTargetTreeSelect.vue'
const colorPickerOptions = PREDEFINE_COLORS

/**
 * 动作菜单使用 Popper 原生定位器覆盖组件库默认的 12px 偏移。
 * 配置对象只创建一次，所有动作复用同一引用，避免列表渲染时重复分配定位参数。
 */
const actionMenuPopperOptions = {
  modifiers: [
    {
      name: 'offset',
      options: { offset: [0, 7] },
    },
  ],
}

interface Props {
  panelType?: SCENE_PANEL_ENUM.Status | SCENE_PANEL_ENUM.Interaction
  targetKind?: 'auto' | 'widget' | 'sceneObject'
  /** 三维事件与状态配置走当前编辑会话的命令历史。 */
  commandBus?: Pick<CommandBus, 'execute'> | null
}

const props = withDefaults(defineProps<Props>(), {
  panelType: SCENE_PANEL_ENUM.Interaction,
  targetKind: 'auto',
})

const {
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
  /**
   * 状态页签和事件页签会复用同一个抽屉组件实例，父级只更新 `panelType`。
   * 必须把 Vue 的响应式 props 直接交给组合函数；若在这里解构或新建普通对象，
   * 组合函数会永久保留首次挂载时的页签类型，导致事件被写入 statusList，
   * 同时后续动作编辑也会从错误列表重新读取，看起来像“点击确定没有更新”。
   */
} = useAddEditEventDrawer(props)

/** 切换传参目标类别时，清空旧目标并重新加载对应类别的候选参数。 */
const handleParameterTargetKindChange = (action: ActionItem) => {
  action.actionTargetUuid = ''
  handleParameterTargetChange(action)
}

/** 二维传参目标保持单选，并在同一次变更中清空不再属于新目标的请求参数。 */
const handleParameterWidgetTargetSelect = (action: ActionItem, widgetId: string) => {
  action.actionTargetWidgetIds = widgetId ? [widgetId] : []
  handleParameterTargetChange(action)
}

/** 单选目标组件后清空旧字段路径，并重载该组件当前配置的映射字段。 */
const handleWidgetPropertyTargetSelect = (action: ActionItem, widgetId: string) => {
  action.actionTargetWidgetIds = widgetId ? [widgetId] : []
  action.actionTargetWidgetGroupIds = []
  handleWidgetPropertyTargetChange(action)
}

/** 状态和事件共用 Figma 规则抽屉，仅标题与顶部字段按面板类型区分。 */
const drawerTitle = computed(
  () =>
    `${drawerMode.value === 'add' ? '新增' : '编辑'}${
      props.panelType === SCENE_PANEL_ENUM.Status ? '状态' : '事件'
    }`,
)

defineExpose({
  showAddDrawer,
  showEditDrawer,
})
</script>

<style scoped lang="scss">
/**
 * 状态和事件编辑抽屉共同对应 Figma 节点 2112:3867。
 * 这些规则限定在 scene-edit-status-drawer，避免覆盖其它共享抽屉；
 * 颜色、输入框和开关继续复用 PropertyControls 的全局基线，保证不同属性入口状态一致。
 */
:global(
  .el-overlay.is-drawer .scene-edit-status-drawer.scene-edit-property-drawer.scene-edit-drawer
) {
  /*
   * 额外保留共享抽屉类用于提升选择器权重，但不依赖 body 上的路由状态类。
   * 这样可稳定覆盖 theme.scss 后加载的通用 top:52px/right:24px 规则，
   * 同时保证组件预览、热更新和正式路由环境都使用同一套贴顶几何。
   */
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100vh !important;
  max-height: 100vh !important;
  background: #1d2a35 !important;
  border: 0 !important;
  border-radius: 4px !important;
  box-shadow: 0 8px 24px rgb(0 0 0 / 32%) !important;
}
:global(
  .el-overlay.is-drawer
    .scene-edit-status-drawer.scene-edit-property-drawer.scene-edit-drawer
    .el-drawer__header
) {
  box-sizing: border-box;
  height: 55px;
  min-height: 55px;
  padding: 20px 20px 11px !important;
  margin: 0;
  color: #ffffff;
  background: #1d2a35 !important;
  border-bottom: 1px solid rgb(255 255 255 / 5%) !important;
}
:global(
  .el-overlay.is-drawer
    .scene-edit-status-drawer.scene-edit-property-drawer.scene-edit-drawer
    .el-drawer__body
) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 !important;
  overflow: hidden !important;
  background: #1d2a35 !important;
}
.scene-edit-status-drawer__scrollbar :deep(.el-scrollbar__view) {
  /* 滚动内容的盒模型与内边距集中维护，避免重复选择器导致提交检查失败。 */
  box-sizing: border-box;
  padding: 12px 20px 20px;
}
:global(
  .el-overlay.is-drawer
    .scene-edit-status-drawer.scene-edit-property-drawer.scene-edit-drawer
    .el-drawer__footer
) {
  box-sizing: border-box;
  flex: 0 0 65px;
  height: 65px;
  min-height: 65px;
  padding: 12px 20px 20px;
  margin: 0;
  background: #1d2a35 !important;
  border-top: 1px solid rgb(255 255 255 / 5%) !important;
}
.scene-edit-status-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.scene-edit-status-drawer__title {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #ffffff;
}
.scene-edit-status-drawer__close {
  width: 16px;
  min-width: 16px;
  height: 16px;
  min-height: 16px;
  color: rgb(255 255 255 / 60%);
}
.scene-edit-status-drawer__close :deep(.el-icon) {
  width: 16px;
  height: 16px;
  font-size: 16px;
}
.scene-edit-status-drawer__scrollbar {
  width: 100%;
  height: 100%;
}
.scene-edit-status-drawer__scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.scene-edit-status-drawer__form {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 480px;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  margin: 0 auto;
}

/*
 * Figma 的名称字段是整行 480px；名称字段本身为纵向布局，不能把 480px 写入 flex-basis，
 * 否则该数值会被解释为内容高度并在两个字段之间制造大面积空白。
 * 这里仅约束横向宽度，纵向高度由 20px 标签、4px 间距和 32px 控件自然决定。
 */
.scene-edit-status-drawer__name-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  margin: 0;
}
.scene-edit-status-drawer__name-field :deep(.el-form-item__label) {
  justify-content: flex-start;
  width: auto !important;
  height: 20px;
  padding: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
}
.scene-edit-status-drawer__name-field :deep(.el-form-item__label::before) {
  margin-right: 2px;
  color: #e16e6e;
}
.scene-edit-status-drawer__name-field :deep(.el-form-item__content) {
  display: block;
  flex: 0 0 auto;
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  min-height: 32px;
  margin-left: 0 !important;
}
.scene-edit-status-drawer__name-field :deep(.scene-edit-property-input) {
  width: 100%;
}

/*
 * ScenePropertyInput 为兼容输入前后插槽把内部 el-input 改成块级容器；其 inline-flex 包装层
 * 在抽屉纵向表单中会按文字固有宽度收缩。这里让包装层继承名称字段的 480px 可用宽度，
 * 只修正状态/事件抽屉，不改变共享输入在紧凑属性行中的弹性行为。
 */
.scene-edit-status-drawer__name-field
  :deep(.scene-edit-property-input__control > .el-input__wrapper) {
  width: 100%;
}
.scene-edit-status-drawer__name-field :deep(.scene-edit-property-select) {
  /* 纵向表单中使用块级弹性盒，消除 inline-flex 为文字基线预留的约 2px 底部空间。 */
  display: flex;
  width: 100%;
}
.scene-edit-status-drawer__condition-groups {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 480px;
  min-width: 0;
  max-width: 100%;
}
.scene-edit-status-drawer__section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
}
.scene-edit-status-drawer__condition-tabs {
  position: relative;
  display: block;
  width: 100%;
  min-height: 34px;
  margin-top: 8px;
}

/* 页签栏固定 34px 高，并让“添加条件组”与当前页签共享同一水平基线。 */
.scene-edit-status-drawer__tab-bar {
  display: flex;
  align-items: stretch;
  min-width: 0;
  height: 34px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}
.scene-edit-status-drawer__tab {
  box-sizing: border-box;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 6px 12px !important;
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
  cursor: pointer;
  background: #1a2630;
  border: 1px solid rgb(255 255 255 / 10%);
  border-bottom: 0;
  border-radius: 4px 4px 0 0 !important;
}
.scene-edit-status-drawer__tab.is-active {
  color: rgb(255 255 255 / 80%);
  border-bottom: 2px solid #5ab2a5;
}
.scene-edit-status-drawer__tab-close {
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  margin-left: 8px;
  font-size: 10px;
  color: rgb(255 255 255 / 60%);
}
.scene-edit-status-drawer__tab:hover,
.scene-edit-status-drawer__tab:focus-visible {
  color: #5ab2a5;
  outline: none;
}
.scene-edit-status-drawer__tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scene-edit-status-drawer__condition-content {
  width: 100%;
  min-width: 0;
  padding-top: 0;
  margin-top: 14px;
}
.scene-edit-status-drawer__condition-block-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 0 !important;
}
.scene-edit-status-drawer__condition-block {
  margin: 0 !important;
  background: #1b2630 !important;
  border: 1px solid rgb(255 255 255 / 8%) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
}
.scene-edit-status-drawer__condition-block :deep(.el-card__header) {
  padding: 16px !important;
  padding-bottom: 0 !important;
  border-bottom: 0 !important;
}
.scene-edit-status-drawer__condition-block :deep(.el-card__body) {
  /**
   * Element Plus 默认给卡片正文设置 flex-grow: 1，会把单动作条件块从设计值 338px
   * 拉高约 14px。这里关闭正文拉伸并由动作卡片内容自然计算高度；同时在正文层统一
   * 管理多动作 12px 间距，单动作与多动作结构均无需写死条件块总高度。
   */
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 16px !important;
  overflow: visible;
}
.scene-edit-status-drawer__condition-block .scene-edit-condition-block__header > div:first-child {
  gap: 0 !important;
}
.scene-edit-status-drawer__condition-block .scene-edit-condition-block__header {
  display: flex;
  align-items: center;
  min-height: 20px;
}
.scene-edit-status-drawer__condition-block .scene-edit-condition-block__header .font-bold {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(255 255 255 / 80%) !important;
}
.scene-edit-status-drawer__condition-block [class~='text-[#3b82f6]'] {
  margin-left: 0;
  font-size: 13px;
  line-height: 19px;
  color: #5ab2a5 !important;
}
.scene-edit-status-drawer__block-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}
.scene-edit-status-drawer__icon-button {
  width: 16px;
  min-width: 16px;
  height: 16px;
  min-height: 16px;
  color: rgb(255 255 255 / 60%);
}
.scene-edit-status-drawer__icon-button :deep(.el-icon) {
  width: 16px;
  height: 16px;
  font-size: 16px;
}
.scene-edit-status-drawer__icon-button.is-disabled {
  color: rgb(255 255 255 / 24%);
}
.scene-edit-status-drawer__condition-action {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;

  /*
   * 条件块边框由 Element Plus 计入正文内容宽度，正文的 100% 实际会少两个边框像素。
   * Figma 动作卡片必须保持 448px 且左边与条件标题的 17px 基线一致，因此只补回宽度，
   * 不再使用旧的 translateX(-1px)，避免卡片左边越过标题基线。
   */
  width: calc(100% + 2px);
  padding: 12px !important;
  margin: 0 !important;
  background: #1d2a35;
  border: 1px solid rgb(255 255 255 / 8%) !important;
  border-radius: 2px;
}

/* 列表自身提供定位上下文和固定间距，保证离场卡片不会相对整个抽屉漂移。 */
.scene-edit-status-drawer__action-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/*
 * 动作卡片重排动画：TransitionGroup 会根据稳定的 action.id 计算每张卡片
 * 的首尾位置差，并通过 transform 平滑补间。数组顺序仍由上移/下移逻辑
 * 立即提交，因此不会引入定时器，也不会改变表单校验、撤销重做或数据保存时机。
 */
.scene-action-list-move {
  transition: transform 180ms ease;
}
.scene-action-list-enter-active,
.scene-action-list-leave-active {
  transition:
    opacity 160ms ease,
    transform 180ms ease;
}
.scene-action-list-enter-from,
.scene-action-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* 删除卡片时脱离文档流，避免离场元素把其它卡片的移动动画顶住。 */
.scene-action-list-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
.scene-edit-status-drawer__condition-action:last-of-type {
  margin-bottom: 0 !important;
}
.scene-edit-status-drawer__condition-action .scene-edit-condition-action__header {
  box-sizing: border-box;
  min-height: 19px;
  padding-bottom: 12px !important;
}
.scene-edit-status-drawer__condition-action [class~='text-[14px]'] {
  font-size: 13px !important;
  font-weight: 500;
  line-height: 19px;
  color: rgb(255 255 255 / 80%) !important;
}
.scene-edit-status-drawer__condition-action :deep(.el-form-item) {
  display: grid;
  grid-template-columns: 65px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  min-height: 32px;
  margin: 0 0 16px;
}
.scene-edit-status-drawer__condition-action :deep(.el-form-item:last-of-type) {
  margin-bottom: 0;
}
.scene-edit-status-drawer__condition-action :deep(.el-form-item__label) {
  justify-content: flex-start;
  width: auto !important;
  height: 32px;
  padding: 0;
  font-size: 12px;
  line-height: 32px;
  color: rgb(255 255 255 / 60%);
}
.scene-edit-status-drawer__condition-action :deep(.el-form-item__label::before) {
  margin-right: 2px;
  color: #e16e6e;
}
.scene-edit-status-drawer__condition-action :deep(.el-form-item__content) {
  display: flex;
  min-width: 0;
  min-height: 32px;
  margin-left: 0 !important;
}
.scene-edit-status-drawer__parameter-mappings {
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  margin: 0 0 16px;
  background: rgb(13 23 31 / 34%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 2px;
}
.scene-edit-status-drawer__parameter-mappings-title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 20px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
}
.scene-edit-status-drawer__parameter-mappings-hint {
  font-size: 11px;
  color: rgb(255 255 255 / 42%);
}
.scene-edit-status-drawer__parameter-mapping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr) 20px;
  gap: 4px;
  align-items: start;
  min-width: 0;
}
.scene-edit-status-drawer__parameter-mapping-row
  + .scene-edit-status-drawer__parameter-mapping-row {
  margin-top: 8px;
}
.scene-edit-status-drawer__parameter-mapping-row :deep(.el-form-item) {
  display: flex;
  gap: 3px;
  align-items: center;
  min-width: 0;
  min-height: 32px;
  margin: 0;
}
.scene-edit-status-drawer__parameter-mapping-row :deep(.el-form-item__label) {
  flex: 0 0 auto;
  height: 32px;
  padding: 0;
  font-size: 11px;
  line-height: 32px;
  color: rgb(255 255 255 / 48%);
}
.scene-edit-status-drawer__parameter-mapping-row :deep(.el-form-item__content) {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  margin-left: 0 !important;
}
.scene-edit-status-drawer__parameter-mapping-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 15px;
  line-height: 32px;
  color: #5ab2a5;
}
.scene-edit-status-drawer__parameter-mapping-delete {
  width: 20px;
  min-width: 20px;
  height: 32px;
  min-height: 32px;
  padding: 0 !important;
  color: rgb(255 255 255 / 48%);
}
.scene-edit-status-drawer__parameter-mapping-delete:hover,
.scene-edit-status-drawer__parameter-mapping-delete:focus-visible {
  color: #e16e6e !important;
  outline: none;
}
.scene-edit-status-drawer__add-parameter-mapping {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 24px !important;
  min-height: 24px !important;
  padding: 2px 0 !important;
  margin-top: 8px;
  font-size: 12px !important;
  line-height: 20px;
  color: #32af9f !important;
  background: transparent !important;
  border: 0 !important;
}
.scene-edit-status-drawer__add-parameter-mapping:hover,
.scene-edit-status-drawer__add-parameter-mapping:focus-visible {
  color: #5ab2a5 !important;
  outline: none;
}
.scene-edit-status-drawer__add-parameter-mapping :deep(.el-icon) {
  width: 14px;
  height: 14px;
  font-size: 14px;
}
.scene-edit-status-drawer__condition-action :deep(.scene-edit-property-select) {
  width: 100%;
  min-width: 0;
}
.scene-edit-status-drawer__condition-action :deep(.scene-edit-property-color-picker) {
  width: 52px;
}
.scene-edit-status-drawer__condition-action
  :deep(.scene-edit-property-color-picker--swatch .el-color-picker) {
  width: 52px;
  height: 32px;
}
.scene-edit-status-drawer__condition-action :deep(.scene-edit-property-color-picker--swatch) {
  height: 32px;
  min-height: 32px;
}
.scene-edit-status-drawer__condition-action
  :deep(.scene-edit-property-color-picker--swatch .el-color-picker__trigger) {
  display: flex;
  align-items: center;
  width: 52px;
  padding: 3px 8px;
}
.scene-edit-status-drawer__condition-action
  :deep(.scene-edit-property-color-picker--swatch .el-color-picker__color) {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
}
.scene-edit-status-drawer__condition-action
  :deep(.scene-edit-property-color-picker--swatch .el-color-picker__trigger::after) {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-left: 4px;
  content: '';
  border-right: 1px solid rgb(255 255 255 / 40%);
  border-bottom: 1px solid rgb(255 255 255 / 40%);
  transform: rotate(45deg) translateY(-2px);
}
.scene-edit-status-drawer__more {
  box-sizing: border-box;
  width: 16px;
  min-width: 16px;
  height: 16px;
  min-height: 16px;
  padding: 0 !important;
  color: rgb(255 255 255 / 60%);
  background: transparent !important;
  border: 0 !important;
  border-radius: 2px !important;
}
.scene-edit-status-drawer__more :deep(.el-icon) {
  width: 16px;
  height: 16px;
  font-size: 16px;
}
.scene-edit-status-drawer__more-icon {
  display: block;
  width: 16px;
  height: 16px;
  background-color: currentcolor;
  mask-image: url('@/assets/icons/scene-action-more.svg');
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: 16px 16px;
}

/*
 * Figma 将悬浮态和菜单展开态设计为同一视觉反馈。
 * Element Plus 会把 aria-expanded 写到真实按钮上，因此无需增加响应式状态或监听器，
 * 可避免每个动作卡片重复维护菜单开关状态。
 */
.scene-edit-status-drawer__more:hover,
.scene-edit-status-drawer__more:focus-visible,
.scene-edit-status-drawer__more[aria-expanded='true'] {
  color: #5ab2a5 !important;
  outline: none;
  background: #2d4152 !important;
}
.scene-edit-status-drawer__add-action,
.scene-edit-status-drawer__add-condition-block,
.scene-edit-status-drawer__add-group {
  box-sizing: border-box;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 13px !important;
  line-height: 19px;
  color: #32af9f !important;
}
.scene-edit-status-drawer__add-action {
  position: relative;
  align-items: flex-start;
  width: 100%;
  height: 27px !important;
  min-height: 27px !important;
  padding: 8px 0 0 !important;
  margin-top: 12px !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
}
.scene-edit-status-drawer__add-action::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  content: '';
  background: rgb(255 255 255 / 8%);
}
.scene-edit-status-drawer__add-condition-block {
  width: 100%;
  height: 33px !important;
  min-height: 33px !important;
  padding: 6px 12px !important;
  margin-top: 14px !important;
  background: #1d2a35 !important;
  border: 1px dashed rgb(255 255 255 / 20%) !important;
  border-radius: 2px !important;
}
.scene-edit-status-drawer__add-group {
  flex: 0 0 auto;
  height: 34px;
  min-height: 34px;
  padding: 6px 12px !important;
  margin-left: 8px;
  background: #1a2630 !important;
  border: 1px dashed rgb(255 255 255 / 10%) !important;
  border-radius: 4px 4px 0 0 !important;
}
.scene-edit-status-drawer__add-action:hover,
.scene-edit-status-drawer__add-action:focus-visible,
.scene-edit-status-drawer__add-condition-block:hover,
.scene-edit-status-drawer__add-condition-block:focus-visible,
.scene-edit-status-drawer__add-group:hover,
.scene-edit-status-drawer__add-group:focus-visible {
  color: #5ab2a5 !important;
  outline: none;
  background: rgb(90 178 165 / 8%) !important;
  border-color: rgb(90 178 165 / 42%) !important;
}
.scene-edit-status-drawer__add-action :deep(.el-icon),
.scene-edit-status-drawer__add-condition-block :deep(.el-icon),
.scene-edit-status-drawer__add-group :deep(.el-icon) {
  width: 14px;
  height: 14px;
  font-size: 14px;
}
.scene-edit-status-drawer__footer-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  width: 100%;
}
.scene-edit-status-drawer__footer-actions :deep(.scene-edit-property-button) {
  width: 52px;
  min-width: 52px;
  height: 32px;
  min-height: 32px;
  padding: 2px 12px;
  font-size: 14px;
  line-height: 20px;
}

/**
 * 动作更多菜单对应 Figma 节点 2112:4185：68×104px、12px 内边距、三项间隔 12px。
 * 菜单传送到 body 后不会继承当前 SFC 的 scoped 属性，并且 theme.scss 会在其后覆盖
 * 通用浮层背景、圆角和层级。抽屉遮罩固定为 4000，因此菜单使用 4200，只高于抽屉且
 * 低于颜色选择器的 4600；选择器限定到业务菜单类，不影响其它下拉框和全局弹层。
 */
:global(
  body.scene-edit-route-open .scene-edit-status-drawer__action-menu.scene-edit-popper.el-popper
) {
  z-index: 4200 !important;
  box-sizing: border-box;
  width: 68px;
  min-width: 68px;
  max-width: 68px;
  height: 104px;
  padding: 12px !important;
  background: #131c26 !important;
  border: 1px solid rgb(255 255 255 / 14%) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
}
:global(body.scene-edit-route-open .scene-edit-status-drawer__action-menu .el-dropdown-menu) {
  width: 42px;
  padding: 0;
  margin: 0;
  background: transparent;
}
:global(body.scene-edit-route-open .scene-edit-status-drawer__action-menu .el-dropdown-menu__item) {
  box-sizing: border-box;
  display: flex;
  gap: 2px;
  align-items: center;
  width: 42px;
  min-width: 0;
  height: 18px;
  padding: 0;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: rgb(255 255 255 / 60%);
  background: transparent !important;
}
:global(
  body.scene-edit-route-open
    .scene-edit-status-drawer__action-menu
    .el-dropdown-menu__item
    + .el-dropdown-menu__item
) {
  margin-top: 12px;
}
:global(
  body.scene-edit-route-open
    .scene-edit-status-drawer__action-menu
    .el-dropdown-menu__item:not(.is-disabled):hover
),
:global(
  body.scene-edit-route-open
    .scene-edit-status-drawer__action-menu
    .el-dropdown-menu__item:not(.is-disabled):focus-visible
) {
  color: #5ab2a5 !important;
  outline: none;
}
:global(
  body.scene-edit-route-open
    .scene-edit-status-drawer__action-menu
    .el-dropdown-menu__item.is-disabled
) {
  color: rgb(255 255 255 / 24%) !important;
}
:global(
  body.scene-edit-route-open .scene-edit-status-drawer__action-menu .el-dropdown-menu__item .el-icon
) {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  margin: 0 !important;
  font-size: 16px;
  color: currentColor !important;
}
:global(
  body.scene-edit-route-open
    .scene-edit-status-drawer__action-menu.scene-edit-popper.el-popper
    .el-popper__arrow
) {
  display: none !important;
}

/* 条件块标题和操作图标使用 Figma 的 80% 白色/60% 白色视觉层级。 */
:deep(.font-bold) {
  color: rgb(255 255 255 / 80%) !important;
}

/* 移动/删除图标使用属性面板淡色 + 青绿色 hover */
:deep(.el-icon) {
  color: rgb(255 255 255 / 54%) !important;
}
:deep(.el-icon:hover),
:deep(.el-icon:focus-visible) {
  color: #5ab2a5 !important;
}

/* 条件规则文字颜色统一青绿色 */
:deep([class~='text-[#3b82f6]']) {
  color: #5ab2a5 !important;
}

/* 动作标题颜色 */
:deep([class~='text-[14px]']) {
  color: rgb(255 255 255 / 80%) !important;
}

</style>
