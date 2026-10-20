<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ScenePropertyDialog
    v-model="dialogVisible"
    class="scene-edit-dialog--rules"
    title="规则配置"
    :width="804"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    align-center
    @close="handleClose"
  >
    <!--
      Figma 节点 2111:3245 / 2111:3126 将条件关系和条件列表纵向排列。
      正文不设置固定高度：零行、两行以及后续更多行均按内容自然增长，超过弹窗上限后
      只由条件列表内部滚动，条件关系、标题与底栏始终停留在可视区域。
    -->
    <div class="scene-edit-rules__content">
      <section class="scene-edit-rules__relation" aria-labelledby="scene-edit-rules-relation-title">
        <h3 id="scene-edit-rules-relation-title" class="scene-edit-rules__section-title">
          条件关系
        </h3>
        <ScenePropertyRadioGroup v-model="ruleType" class="scene-edit-rules__relation-options">
          <!--
          单选值统一使用当前 value 接口，显示文字改由默认插槽提供；这样既保留共享单选组的
          双向绑定行为，也避免旧 label 兼任选值时产生的组件库废弃警告。
        -->
          <el-radio-button :value="CONDITION_RULE_TYPE_ENUM.All">满足所有条件</el-radio-button>
          <el-radio-button :value="CONDITION_RULE_TYPE_ENUM.One">满足任一条件</el-radio-button>
        </ScenePropertyRadioGroup>
      </section>

      <section class="scene-edit-rules__list" aria-labelledby="scene-edit-rules-list-title">
        <div class="scene-edit-rules__toolbar">
          <h3 id="scene-edit-rules-list-title" class="scene-edit-rules__section-title">条件列表</h3>
          <ScenePropertyButton
            text
            :icon="Plus"
            class="scene-edit-rules__add"
            @click="handleAddCondition"
          >
            添加条件
          </ScenePropertyButton>
        </div>

        <!--
          条件数量较多时只滚动这个表格区域，条件关系列和操作区保持固定；该外壳也负责
          裁掉表格的横向溢出，避免共享表格内部再生成一条无业务意义的横向滚动条。
        -->
        <div class="scene-edit-rules__table-scroll">
          <ScenePropertyTable :data="tableData" row-key="id" class="scene-edit-rules__table">
          <el-table-column label="来源类型" :width="296">
            <template #default="scope">
              <el-space class="scene-edit-rules__operand">
                <ScenePropertySelect
                  v-model="scope.row.sourceObjectType"
                  placeholder="请选择"
                  style="width: 120px"
                  popper-class="scene-edit-popper"
                  teleported
                >
                  <el-option
                    v-for="item in availableObjectTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ScenePropertySelect>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.FixedValue">
                  <ScenePropertySelect
                    v-model="scope.row.sourceFixedValueType"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                    @change="
                      (value: string | number | boolean | undefined) =>
                        handleFixedValueTypeChange(
                          'source',
                          asConditionItem(scope.row),
                          value as FIXED_VALUE_TYPE_ENUM,
                        )
                    "
                  >
                    <el-option
                      v-for="item in fixedValueTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ScenePropertySelect>
                  <ScenePropertyInput
                    v-if="scope.row.sourceFixedValueType === FIXED_VALUE_TYPE_ENUM.String"
                    v-model="scope.row.sourceUrlParamsName"
                    placeholder="请输入"
                    style="width: 100px"
                  />
                  <ScenePropertyNumberInput
                    v-if="scope.row.sourceFixedValueType === FIXED_VALUE_TYPE_ENUM.Number"
                    v-model="scope.row.sourceFixedValue"
                    placeholder="请输入"
                    style="width: 120px"
                    :controls="false"
                  />
                  <ScenePropertySwitch
                    v-if="scope.row.sourceFixedValueType === FIXED_VALUE_TYPE_ENUM.Boolean"
                    v-model="scope.row.sourceFixedValue"
                  />
                  <div v-if="scope.row.sourceFixedValueType === FIXED_VALUE_TYPE_ENUM.JSON">
                    <ScenePropertyButton
                      type="text"
                      icon="EditPen"
                      @click="handleAddJson('source', asConditionItem(scope.row))"
                      >点击编辑 JSON</ScenePropertyButton
                    >
                  </div>
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.ModelValue">
                  <ScenePropertySelect
                    v-model="scope.row.sourceModelValue"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="item in modelValueOptions"
                      :key="item.onlyUuid"
                      :label="item.name"
                      :value="item.onlyUuid ?? ''"
                    />
                  </ScenePropertySelect>
                  <ScenePropertySelect
                    v-model="scope.row.sourceModelValueType"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="item in modelValueTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ScenePropertySelect>
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.UrlParamValue">
                  <ScenePropertyInput
                    v-model="scope.row.sourceUrlParamsName"
                    placeholder="参数名称"
                  />
                  <ScenePropertyInput
                    v-model="scope.row.sourceUrlParamsValue"
                    placeholder="默认值（可选）"
                  />
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.DomValue">
                  <ScenePropertyInput
                    v-model="scope.row.sourceDomSelector"
                    style="max-width: 600px"
                    placeholder="css选择器"
                    class="input-with-select"
                  >
                    <template #append>
                      <ScenePropertySelect
                        v-model="scope.row.sourceDomSelectorType"
                        placeholder="请选择"
                        style="width: 115px"
                        popper-class="scene-edit-popper"
                        teleported
                      >
                        <el-option
                          v-for="item in domSelectorTypeOptions"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ScenePropertySelect>
                    </template>
                  </ScenePropertyInput>
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.DatasetValue">
                  <div
                    v-if="scope.row.sourceDatasetProperty"
                    class="scene-edit-rules__dataset-binding"
                    @click="handleSetDataset('source', asConditionItem(scope.row))"
                  >
                    {{ generateBindPropertyText(scope.row.sourceDatasetProperty) }}
                  </div>
                  <ScenePropertyButton
                    type="primary"
                    link
                    v-else
                    class="cursor-pointer"
                    @click="handleSetDataset('source', asConditionItem(scope.row))"
                  >
                    设置</ScenePropertyButton
                  >
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.ComponentDataValue">
                  <ScenePropertySelect
                    v-model="scope.row.sourceComponentDataField"
                    placeholder="请选择当前组件数据字段"
                    style="width: 180px"
                    :disabled="componentDataFieldOptions.length === 0"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="field in componentDataFieldOptions"
                      :key="field"
                      :label="field"
                      :value="field"
                    />
                  </ScenePropertySelect>
                </template>
                <template v-if="scope.row.sourceObjectType === OBJECT_TYPE_ENUM.WidgetRuntimeValue">
                  <ScenePropertySelect
                    v-model="scope.row.sourceWidgetRuntimeField"
                    placeholder="请选择当前部件值字段"
                    style="width: 180px"
                    :disabled="widgetRuntimeFieldOptionsForCurrentWidget.length === 0"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="field in widgetRuntimeFieldOptionsForCurrentWidget"
                      :key="field.value"
                      :label="field.label"
                      :value="field.value"
                    />
                  </ScenePropertySelect>
                </template>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column label="运算符" :width="72" align="left">
            <template #default="scope">
              <ScenePropertySelect
                v-model="scope.row.judgmentType"
                placeholder="请选择"
                style="width: 100%"
                popper-class="scene-edit-popper"
                teleported
              >
                <el-option
                  v-for="item in judgmentTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ScenePropertySelect>
            </template>
          </el-table-column>
          <el-table-column label="目标类型" :width="296">
            <template #default="scope">
              <el-space class="scene-edit-rules__operand">
                <ScenePropertySelect
                  v-model="scope.row.targetObjectType"
                  placeholder="请选择"
                  style="width: 120px"
                  popper-class="scene-edit-popper"
                  teleported
                >
                  <el-option
                    v-for="item in availableObjectTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ScenePropertySelect>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.FixedValue">
                  <ScenePropertySelect
                    v-model="scope.row.targetFixedValueType"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                    @change="
                      (value: string | number | boolean | undefined) =>
                        handleFixedValueTypeChange(
                          'target',
                          asConditionItem(scope.row),
                          value as FIXED_VALUE_TYPE_ENUM,
                        )
                    "
                  >
                    <el-option
                      v-for="item in fixedValueTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ScenePropertySelect>
                  <ScenePropertyInput
                    v-if="scope.row.targetFixedValueType === FIXED_VALUE_TYPE_ENUM.String"
                    v-model="scope.row.targetUrlParamsName"
                    placeholder="请输入"
                    style="width: 100px"
                  />
                  <ScenePropertyNumberInput
                    v-if="scope.row.targetFixedValueType === FIXED_VALUE_TYPE_ENUM.Number"
                    v-model="scope.row.targetFixedValue"
                    placeholder="请输入"
                    style="width: 120px"
                    :controls="false"
                  />
                  <ScenePropertySwitch
                    v-if="scope.row.targetFixedValueType === FIXED_VALUE_TYPE_ENUM.Boolean"
                    v-model="scope.row.targetFixedValue"
                  />
                  <div v-if="scope.row.targetFixedValueType === FIXED_VALUE_TYPE_ENUM.JSON">
                    <ScenePropertyButton
                      type="text"
                      icon="EditPen"
                      @click="handleAddJson('target', asConditionItem(scope.row))"
                      >点击编辑 JSON</ScenePropertyButton
                    >
                  </div>
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.ModelValue">
                  <ScenePropertySelect
                    v-model="scope.row.targetModelValue"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="item in modelValueOptions"
                      :key="item.onlyUuid"
                      :label="item.name"
                      :value="item.onlyUuid ?? ''"
                    />
                  </ScenePropertySelect>
                  <ScenePropertySelect
                    v-model="scope.row.targetModelValueType"
                    placeholder="请选择"
                    style="width: 100px"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="item in modelValueTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ScenePropertySelect>
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.UrlParamValue">
                  <ScenePropertyInput
                    v-model="scope.row.targetUrlParamsName"
                    placeholder="参数名称"
                  />
                  <ScenePropertyInput
                    v-model="scope.row.targetUrlParamsValue"
                    placeholder="默认值（可选）"
                  />
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.DomValue">
                  <ScenePropertyInput
                    v-model="scope.row.targetDomSelector"
                    style="max-width: 600px"
                    placeholder="css选择器"
                    class="input-with-select"
                  >
                    <template #append>
                      <ScenePropertySelect
                        v-model="scope.row.targetDomSelectorType"
                        placeholder="请选择"
                        style="width: 115px"
                        popper-class="scene-edit-popper"
                        teleported
                      >
                        <el-option
                          v-for="item in domSelectorTypeOptions"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ScenePropertySelect>
                    </template>
                  </ScenePropertyInput>
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.DatasetValue">
                  <div
                    v-if="scope.row.targetDatasetProperty"
                    class="scene-edit-rules__dataset-binding"
                    @click="handleSetDataset('target', asConditionItem(scope.row))"
                  >
                    {{ generateBindPropertyText(scope.row.targetDatasetProperty) }}
                  </div>
                  <ScenePropertyButton
                    type="primary"
                    link
                    v-else
                    class="cursor-pointer"
                    @click="handleSetDataset('target', asConditionItem(scope.row))"
                  >
                    设置</ScenePropertyButton
                  >
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.ComponentDataValue">
                  <ScenePropertySelect
                    v-model="scope.row.targetComponentDataField"
                    placeholder="请选择当前组件数据字段"
                    style="width: 180px"
                    :disabled="componentDataFieldOptions.length === 0"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="field in componentDataFieldOptions"
                      :key="field"
                      :label="field"
                      :value="field"
                    />
                  </ScenePropertySelect>
                </template>
                <template v-if="scope.row.targetObjectType === OBJECT_TYPE_ENUM.WidgetRuntimeValue">
                  <ScenePropertySelect
                    v-model="scope.row.targetWidgetRuntimeField"
                    placeholder="请选择当前部件值字段"
                    style="width: 180px"
                    :disabled="widgetRuntimeFieldOptionsForCurrentWidget.length === 0"
                    popper-class="scene-edit-popper"
                    teleported
                  >
                    <el-option
                      v-for="field in widgetRuntimeFieldOptionsForCurrentWidget"
                      :key="field.value"
                      :label="field.label"
                      :value="field.value"
                    />
                  </ScenePropertySelect>
                </template>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column label="状态" :width="50" align="center">
            <template #default="scope">
              <el-tooltip v-if="scope.row.status" content="规则有效" placement="top">
                <el-icon class="scene-edit-rules__status is-valid" aria-label="规则有效">
                  <CircleCheck />
                </el-icon>
              </el-tooltip>
              <el-tooltip v-else content="请完善条件内容" placement="top">
                <el-icon class="scene-edit-rules__status is-invalid" aria-label="规则未完善">
                  <Warning />
                </el-icon>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="操作" :width="50" align="center">
            <template #default="scope">
              <el-tooltip content="删除条件" placement="top">
                <ScenePropertyButton
                  text
                  :icon="Delete"
                  class="scene-edit-rules__delete"
                  aria-label="删除条件"
                  @click="handleRemoveCondition(scope.row.id)"
                />
              </el-tooltip>
            </template>
          </el-table-column>
          </ScenePropertyTable>
        </div>
      </section>
    </div>
    <template #footer>
      <div class="scene-edit-rules__footer-actions">
        <ScenePropertyButton @click="handleClose">取消</ScenePropertyButton>
        <ScenePropertyButton type="primary" @click="handleConfirm">确定</ScenePropertyButton>
      </div>
    </template>
    <!-- 编辑JSON弹窗 -->
    <AddJsonDialog ref="addJsonDialogRef" @confirm="handleJsonConfirm" />
    <!-- 设置数据集弹窗 -->
    <SetDatasetDialog ref="setDatasetDialogRef" @onConfirm="handleSetDatasetConfirm" />
  </ScenePropertyDialog>
</template>

<script setup lang="ts">
import { CircleCheck, Delete, Plus, Warning } from '@element-plus/icons-vue'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'
import AddJsonDialog from '../AddJsonDialog/index.vue'
import SetDatasetDialog from '../../RightDataPanel/SetDatasetDialog/index.vue'
import ScenePropertySwitch from '../../PropertyControls/ScenePropertySwitch/index.vue'
import ScenePropertyTable from '../../PropertyControls/ScenePropertyTable/index.vue'
import {
  CONDITION_RULE_TYPE_ENUM,
  FIXED_VALUE_TYPE_ENUM,
  OBJECT_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import type { ConditionItem } from '@/types/threeScene'
import {
  fixedValueTypeOptions,
  judgmentTypeOptions,
  modelValueTypeOptions,
  domSelectorTypeOptions,
} from '../config'
import { generateBindPropertyText } from '../../RightDataPanel/utils'
interface Props {
  targetKind?: 'auto' | 'widget' | 'sceneObject'
}

const props = withDefaults(defineProps<Props>(), {
  targetKind: 'auto',
})

const emit = defineEmits<{
  confirm: [
    data: { conditionList: ConditionItem[]; conditionRuleType: CONDITION_RULE_TYPE_ENUM | null },
  ]
}>()
import { useAddRulesDialog } from './useAddRulesDialog'

const asConditionItem = (row: unknown) => row as ConditionItem

const {
  dialogVisible,
  ruleType,
  tableData,
  modelValueOptions,
  availableObjectTypeOptions,
  componentDataFieldOptions,
  widgetRuntimeFieldOptionsForCurrentWidget,
  addJsonDialogRef,
  setDatasetDialogRef,
  showDialog,
  handleClose,
  handleAddCondition,
  handleRemoveCondition,
  handleFixedValueTypeChange,
  handleAddJson,
  handleJsonConfirm,
  handleSetDataset,
  handleSetDatasetConfirm,
  handleConfirm,
} = useAddRulesDialog(emit, {
  targetKind: props.targetKind,
})

defineExpose({
  showDialog,
})
</script>

<style scoped lang="scss">
/**
 * 规则配置弹窗对应 Figma 节点 2111:3245（空数据 804×324）和 2111:3126
 * （两行数据 804×395）。弹窗只由行数自然增高，总高度封顶 800px；达到上限后仅条件
 * 表格滚动，条件关系、标题和底栏不参与滚动。Figma 外框没有额外描边，去掉共享主题的 1px 边框后，
 * 804px 设计宽度可完整分配为左右各 20px 留白和 764px 正文。选择器带上路由根与业务类，
 * 确保可以覆盖旧主题的渐变和 rules 弹窗 overflow: visible 兼容规则，同时不影响其他弹窗。
 */
:global(
  body.scene-edit-route-open .el-overlay.el-modal-dialog .scene-edit-dialog--rules.scene-edit-dialog
) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: min(800px, calc(100vh - 32px)) !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: #1d2a35 !important;
  border: 0 !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__header) {
  box-sizing: border-box;
  flex: 0 0 55px;
  height: 55px;
  padding: 20px 20px 12px !important;
  margin: 0 !important;
  background: #1d2a35 !important;
  border-bottom: 1px solid rgb(255 255 255 / 5%);
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__title) {
  font-size: 16px;
  font-weight: 500;
  line-height: 23px;
  color: #ffffff;
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__headerbtn) {
  top: 19px;
  right: 20px;
  width: 16px;
  height: 16px;
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__close) {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: rgb(255 255 255 / 60%);
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__body) {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0 !important;
  max-height: none !important;

  /*
   * 上方 12px、下方 11px是设计节点的实际正文留白。外框取消 2px 描边后，再减少这里
   * 1px，可让空数据和任意数据行场景同时回到 Figma 的统一高度模型，而非按行数写死高度。
   */
  padding: 12px 20px 11px !important;
  overflow: hidden !important;
  background: #1d2a35 !important;
}
:global(body.scene-edit-route-open .scene-edit-dialog--rules .el-dialog__footer) {
  box-sizing: border-box;
  flex: 0 0 64px;
  height: 64px;
  padding: 12px 20px 20px !important;
  background: #1d2a35 !important;
  border-top: 1px solid rgb(255 255 255 / 5%) !important;
}
.scene-edit-rules__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
  min-height: 0;
}
.scene-edit-rules__relation,
.scene-edit-rules__list {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.scene-edit-rules__relation {
  flex: 0 0 auto;
  gap: 8px;
}
.scene-edit-rules__list {
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}
.scene-edit-rules__section-title {
  height: 20px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
}

/**
 * 条件关系复用共享单选组行为，但按 Figma 呈现为带圆形标识的独立 34px 轻量选项。
 * 旧编辑器主题对弹窗内单选按钮使用了 !important 蓝色渐变，因此这里必须带弹窗业务类并
 * 显式清除背景图片和阴影；覆盖范围只限规则弹窗，避免改变其他共享单选组的按钮形态。
 */
.scene-edit-rules__relation-options {
  flex-wrap: nowrap !important;
  gap: 12px;
  width: max-content;
  max-width: 100%;
}
.scene-edit-rules__relation-options :deep(.el-radio-button) {
  flex: 0 0 132px !important;
  width: 132px;
}
:global(
  body.scene-edit-route-open
    .scene-edit-dialog--rules
    .scene-edit-rules__relation-options
    .el-radio-button__inner
) {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  width: 132px;
  height: 34px;
  min-height: 34px;
  padding: 3px 10px;
  font-size: 14px;
  font-weight: 400;
  line-height: 26px;
  color: rgb(255 255 255 / 60%) !important;
  background: transparent !important;
  background-image: none !important;
  border: 1px solid rgb(255 255 255 / 14%) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
}
:global(
  body.scene-edit-route-open
    .scene-edit-dialog--rules
    .scene-edit-rules__relation-options
    .el-radio-button__inner::before
) {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  content: '';
  background: transparent;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 50%;
}
:global(
  body.scene-edit-route-open
    .scene-edit-dialog--rules
    .scene-edit-rules__relation-options
    .el-radio-button.is-active
    .el-radio-button__inner
) {
  color: rgb(255 255 255 / 80%) !important;
  background: rgb(90 178 165 / 10%) !important;
  background-image: none !important;
  border-color: rgb(90 178 165 / 50%) !important;
  box-shadow: none !important;
}
:global(
  body.scene-edit-route-open
    .scene-edit-dialog--rules
    .scene-edit-rules__relation-options
    .el-radio-button.is-active
    .el-radio-button__inner::before
) {
  background: #5ab2a5;
  border: 3px solid #5ab2a5;
  box-shadow: inset 0 0 0 2px #1d2a35;
}
:global(
  body.scene-edit-route-open
    .scene-edit-dialog--rules
    .scene-edit-rules__relation-options
    .el-radio-button:not(.is-active):hover
    .el-radio-button__inner
) {
  color: rgb(255 255 255 / 80%) !important;
  background: rgb(90 178 165 / 6%) !important;
  background-image: none !important;
  border-color: rgb(90 178 165 / 35%) !important;
  box-shadow: none !important;
}
.scene-edit-rules__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 20px;
}
.scene-edit-rules__add.scene-edit-property-button {
  height: 20px;
  min-height: 20px;
  padding: 0 !important;
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 19px;
  color: #32af9f !important;
  background: transparent !important;
  border: 0 !important;
}
.scene-edit-rules__add :deep(.el-icon) {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  font-size: 14px;
}

/**
 * 数据行的来源和目标各由“类型 + 补充字段”组成。第一项弹性吸收剩余宽度，后续项固定
 * 80px，与 Figma 的 114 / 80 / 80 基线一致；字段类型减少时不会留下空占位。
 */
.scene-edit-rules__operand {
  display: flex;
  gap: 4px !important;
  width: 100%;
  min-width: 0;
}
.scene-edit-rules__operand :deep(.el-space__item) {
  flex: 0 0 80px;
  width: 80px;
  min-width: 0;
  margin: 0 !important;
}
.scene-edit-rules__operand :deep(.el-space__item:first-child) {
  flex: 1 1 0;
  width: auto;
}
.scene-edit-rules__operand :deep(.scene-edit-property-select),
.scene-edit-rules__operand :deep(.scene-edit-property-input),
.scene-edit-rules__operand :deep(.scene-edit-property-number-input) {
  width: 100% !important;
  min-width: 0;
}

/**
 * 最大高度触发后，仅表格外壳接管纵向滚动；正文和条件列表均保持 overflow: hidden，
 * 防止右侧出现贯穿条件关系的滚动条。横向始终裁切，804px 设计宽度下各列总宽度已经
 * 与正文可用宽度一致，不需要向用户暴露 Element Plus 自动生成的横向滚动条。
 */
.scene-edit-rules__table-scroll {
  min-width: 0;
  min-height: 0;
  max-height: min(544px, calc(100vh - 288px));
  overflow: hidden auto;
  overscroll-behavior: contain;
  scrollbar-color: rgb(255 255 255 / 18%) transparent;
  scrollbar-width: thin;
}
.scene-edit-rules__table-scroll :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}
.scene-edit-rules__table-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}
.scene-edit-rules__table :deep(.el-table__inner-wrapper) {
  background: #232d39;
}
.scene-edit-rules__table :deep(.el-table__header-wrapper th.el-table__cell) {
  height: 31px;
  padding: 6px;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: rgb(255 255 255 / 60%);
  background: #131c26;
  border-bottom-color: rgb(255 255 255 / 8%);
}
.scene-edit-rules__table :deep(.el-table__body-wrapper td.el-table__cell) {
  height: 53px;
  padding: 10px 6px;
  color: rgb(255 255 255 / 80%);
  background: #232d39;
  border-bottom-color: rgb(255 255 255 / 5%);
}
.scene-edit-rules__table :deep(th.el-table__cell:first-child),
.scene-edit-rules__table :deep(td.el-table__cell:first-child) {
  padding-left: 12px;
}
.scene-edit-rules__table :deep(th.el-table__cell:last-child),
.scene-edit-rules__table :deep(td.el-table__cell:last-child) {
  padding-right: 12px;
}
.scene-edit-rules__table :deep(.cell) {
  padding: 0;
  line-height: 18px;
}
.scene-edit-rules__table :deep(.el-table__empty-block) {
  min-height: 35px;
  background: #232d39;
}
.scene-edit-rules__table :deep(.el-table__empty-text) {
  font-size: 12px;
  line-height: 18px;
  color: rgb(255 255 255 / 60%);
}
.scene-edit-rules__status {
  width: 12px;
  height: 12px;
  font-size: 12px;
}
.scene-edit-rules__status.is-valid {
  color: #53c797;
}
.scene-edit-rules__status.is-invalid {
  color: #e16e6e;
}
.scene-edit-rules__delete.scene-edit-property-button {
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  padding: 0 !important;
  color: rgb(255 255 255 / 60%) !important;
  background: transparent !important;
  border: 0 !important;
}
.scene-edit-rules__delete :deep(.el-icon) {
  width: 12px;
  height: 12px;
  font-size: 12px;
}
.scene-edit-rules__delete:hover,
.scene-edit-rules__delete:focus-visible {
  color: #e16e6e !important;
}
.scene-edit-rules__dataset-binding {
  max-width: 100%;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 18px;
  color: #5ab2a5;
  white-space: nowrap;
  cursor: pointer;
  background: rgb(90 178 165 / 10%);
  border: 1px solid rgb(90 178 165 / 50%);
  border-radius: 2px;
}
.scene-edit-rules__footer-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  width: 100%;
}
.scene-edit-rules__footer-actions :deep(.scene-edit-property-button) {
  height: 32px;
  min-height: 32px;
  padding: 2px 12px;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  border-radius: 2px !important;
}
.scene-edit-rules__footer-actions :deep(.scene-edit-property-button:not(.el-button--primary)) {
  color: rgb(255 255 255 / 80%);
  background: transparent !important;
  border-color: rgb(255 255 255 / 40%) !important;
}
.scene-edit-rules__footer-actions :deep(.scene-edit-property-button.el-button--primary) {
  background: #48998e !important;
  border-color: #48998e !important;
}

</style>
