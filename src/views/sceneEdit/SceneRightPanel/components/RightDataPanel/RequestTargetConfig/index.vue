<template>
  <RequestConfigSectionCard
    title="当前元素配置"
    description="配置当前元素的请求参数"
    :icon="targetConfigIcon"
    :expanded="expanded"
    @update:expanded="emit('update:expanded', $event)"
  >
    <div class="rtc-address-row">
      <span class="rtc-row-label">请求地址</span>
      <div class="rtc-address-controls">
        <ScenePropertySelect
          :model-value="config.requestHttpType"
          class="rtc-method-select"
          @update:model-value="updateField('requestHttpType', $event as string)"
        >
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="PATCH" value="PATCH" />
          <el-option label="DELETE" value="DELETE" />
        </ScenePropertySelect>
        <!--
          复用现有提示浮层，悬停约 400 毫秒后分别展示固定地址、参数占位及实际发送结果示例。
          原生容器作为触发节点，保证输入区和前置地址均能触发提示，不依赖共享输入组件的事件透传。
        -->
        <el-tooltip
          placement="top"
          :show-after="400"
          popper-style="max-width: 360px; line-height: 20px"
        >
          <template #content>
            <div>填写接口路径，无需重复填写前置地址。</div>
            <div><strong>常规地址：编号固定，直接填写。</strong></div>
            <div>示例：<code>dim3d/model/info/12001</code></div>
            <div><strong>可变参数地址：用占位符代替编号。</strong></div>
            <div>示例：<code>dim3d/model/info/${params.id}</code></div>
            <div>在查询参数（Params）中添加字段 id，初始值填写 12001。</div>
            <div>此时实际路径为：<code>dim3d/model/info/12001</code></div>
            <div>
              通过“传参并刷新数据”将 id 改为 12002 后，实际路径变为
              <code>dim3d/model/info/12002</code>。
            </div>
            <div>占位符字段名须与参数表一致；已用于地址的参数不会重复追加，其余参数照常发送。</div>
          </template>
          <div class="rtc-url-input">
            <ScenePropertyInput
              :model-value="config.requestUrl"
              placeholder="请输入地址(去除前置URL)"
              @update:model-value="updateField('requestUrl', $event as string)"
            >
              <template v-if="globalConfig.requestOriginUrl" #prefix>
                <span class="rtc-url-prefix">{{ globalConfig.requestOriginUrl }}</span>
              </template>
            </ScenePropertyInput>
          </div>
        </el-tooltip>
        <ScenePropertyNumberInput
          :model-value="config.requestInterval"
          :min="0"
          :controls="false"
          class="rtc-interval-number"
          placeholder="0"
          @update:model-value="updateInterval($event)"
        />
        <ScenePropertySelect
          :model-value="config.requestIntervalUnit || 'second'"
          class="rtc-interval-unit"
          @update:model-value="updateField('requestIntervalUnit', $event as string)"
        >
          <el-option label="秒" value="second" />
          <el-option label="分" value="minute" />
          <el-option label="时" value="hour" />
          <el-option label="天" value="day" />
        </ScenePropertySelect>
        <div class="rtc-auth-control">
          <span>携带本系统登录凭证</span>
          <ScenePropertySwitch
            :model-value="config.useAuth !== false"
            :disabled="isEmbeddedMode"
            :title="isEmbeddedMode ? '嵌入模式由宿主登录态自动注入' : undefined"
            aria-label="携带本系统登录凭证"
            @update:model-value="updateAuth($event as boolean)"
          />
        </div>
      </div>
    </div>

    <!-- 请求地址与查询参数共用字段名；交互更新参数后，每次发送都会重新替换占位符。 -->
    <p class="rtc-path-hint">
      地址可用 <code>${params.id}</code> 引用查询参数中的 id；已用于地址的参数不再重复发送。
    </p>

    <div class="rtc-mode-row">
      <span class="rtc-row-label">选择方式</span>
      <!-- 请求方式属于互斥枚举，使用共享单选组保证鼠标与键盘都只会保留一个选中项。 -->
      <ScenePropertyRadioGroup
        :model-value="requestContentType"
        class="rtc-mode-options"
        aria-label="请求方式"
        @update:model-value="updateField('requestContentType', $event as string)"
      >
        <el-radio-button value="default">普通请求</el-radio-button>
        <el-radio-button value="sql">SQL请求</el-radio-button>
      </ScenePropertyRadioGroup>
    </div>

    <div v-show="requestContentType === 'default'" class="rtc-request-table">
      <el-tabs v-model="activeLineTab" class="rtc-line-tabs">
        <el-tab-pane label="Params" name="Params">
          <KeyValueEditor
            :model-value="config.requestParams?.Params || {}"
            @update:model-value="updateParams('Params', $event)"
          />
        </el-tab-pane>
        <el-tab-pane label="Header" name="Header">
          <KeyValueEditor
            :model-value="config.requestParams?.Header || {}"
            @update:model-value="updateParams('Header', $event)"
          />
        </el-tab-pane>
        <el-tab-pane label="Body" name="Body">
          <div class="rtc-body-type">
            <ScenePropertyRadioGroup
              :model-value="config.requestParamsBodyType"
              class="rtc-body-radio-group"
              aria-label="请求正文类型"
              @update:model-value="updateField('requestParamsBodyType', $event as string)"
            >
              <el-radio value="none">none</el-radio>
              <el-radio value="form-data">form-data</el-radio>
              <el-radio value="x-www-form-urlencoded">x-www-form-urlencoded</el-radio>
              <el-radio value="json">JSON</el-radio>
              <el-radio value="xml">XML</el-radio>
            </ScenePropertyRadioGroup>
          </div>
          <div class="rtc-body-content">
            <div v-if="config.requestParamsBodyType === 'none'" class="rtc-hint-card">
              该接口没有 Body 体
            </div>
            <KeyValueEditor
              v-else-if="
                config.requestParamsBodyType === 'form-data' ||
                config.requestParamsBodyType === 'x-www-form-urlencoded'
              "
              :model-value="config.requestParams?.Body?.[config.requestParamsBodyType] || {}"
              @update:model-value="updateBodyField(config.requestParamsBodyType, $event)"
            />
            <ScenePropertyInput
              v-else-if="config.requestParamsBodyType === 'json'"
              :model-value="config.requestParams?.Body?.json || ''"
              type="textarea"
              :rows="8"
              placeholder='{"key": "value"}'
              class="rtc-code-input"
              @update:model-value="updateBodyField('json', $event as string)"
            />
            <ScenePropertyInput
              v-else-if="config.requestParamsBodyType === 'xml'"
              :model-value="config.requestParams?.Body?.xml || ''"
              type="textarea"
              :rows="8"
              placeholder="<xml>...</xml>"
              class="rtc-code-input"
              @update:model-value="updateBodyField('xml', $event as string)"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div v-show="requestContentType === 'sql'" class="rtc-sql-content">
      <span v-if="config.requestHttpType === 'GET'" class="rtc-hint-warning">
        SQL 类型不支持 GET 请求，请使用其它方式
      </span>
      <template v-else>
        <el-tag type="warning" effect="plain" size="small">
          需要后台提供专门处理 SQL 的接口
        </el-tag>
        <div class="rtc-sql-row">
          <span class="rtc-row-label">键名</span>
          <el-tag type="primary" effect="plain" size="small">sql</el-tag>
        </div>
        <div class="rtc-sql-row">
          <span class="rtc-row-label">键值</span>
          <ScenePropertyInput
            :model-value="config.requestSQLContent?.sql || ''"
            type="textarea"
            :rows="6"
            placeholder="SELECT * FROM table"
            class="rtc-code-input"
            @update:model-value="updateSqlContent($event as string)"
          />
        </div>
      </template>
    </div>
  </RequestConfigSectionCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AjaxRequestConfig, RequestGlobalConfig } from '@/types/data-config'
import targetConfigIcon from '@/assets/icons/request-config-target.svg'
import KeyValueEditor from '../KeyValueEditor/index.vue'
import RequestConfigSectionCard from '../RequestConfigSectionCard/index.vue'
import ScenePropertySwitch from '../../PropertyControls/ScenePropertySwitch/index.vue'
import { isEmbeddedMode as isEmbeddedRuntime } from '@/auth/runtime'

const props = defineProps<{
  config: AjaxRequestConfig
  /** 场景级全局配置仅用于组合前置地址，不与当前元素配置互相覆盖。 */
  globalConfig: RequestGlobalConfig
  expanded: boolean
}>()

const emit = defineEmits<{
  'update:config': [config: AjaxRequestConfig]
  'update:expanded': [value: boolean]
}>()

const activeLineTab = ref('Params')
const requestContentType = computed(() => props.config.requestContentType || 'default')
const isEmbeddedMode = computed(() => isEmbeddedRuntime())

function updateField(field: string, value: unknown) {
  const next = { ...props.config }
  ;(next as Record<string, unknown>)[field] = value
  emit('update:config', next)
}

function updateInterval(value: number | null | undefined) {
  /** 空值表示继承全局、0 表示只初始化一次，二者不能在输入层被合并。 */
  updateField('requestInterval', value ?? null)
}

function updateAuth(value: boolean) {
  /**
   * 关闭后不补充本系统登录令牌；开启时仅补充缺失的系统鉴权头，不覆盖用户已配置的 Header。
   */
  updateField('useAuth', value)
}

function updateParams(section: 'Params' | 'Header', value: Record<string, string>) {
  const next = { ...props.config }
  if (!next.requestParams) return
  next.requestParams = { ...next.requestParams, [section]: value }
  emit('update:config', next)
}

function updateBodyField(format: string, value: string | Record<string, string>) {
  const next = { ...props.config }
  if (!next.requestParams) return
  next.requestParams = {
    ...next.requestParams,
    Body: { ...next.requestParams.Body, [format]: value },
  }
  emit('update:config', next)
}

function updateSqlContent(sql: string) {
  emit('update:config', { ...props.config, requestSQLContent: { sql } })
}
</script>

<style scoped lang="scss">
.rtc-address-row,
.rtc-mode-row,
.rtc-sql-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-width: 0;
}
.rtc-address-row {
  margin-bottom: 24px;
}

/** 用一行说明连接地址占位与参数表，不增加新配置字段，窄弹窗内允许自然换行。 */
.rtc-path-hint {
  margin: -12px 0 24px;
  font-size: 12px;
  line-height: 20px;
  color: rgb(255 255 255 / 60%);
  overflow-wrap: anywhere;
}
.rtc-mode-row {
  margin-bottom: 24px;
}
.rtc-row-label {
  font-size: 14px;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
  white-space: nowrap;
}
.rtc-address-controls {
  display: grid;
  grid-template-columns: 80px minmax(160px, 1fr) 60px 60px max-content;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.rtc-method-select {
  width: 80px;
}

/** 提示触发容器保持原输入框的网格收缩能力，避免长接口地址撑宽窄弹窗。 */
.rtc-url-input {
  min-width: 0;
}
.rtc-interval-number,
.rtc-interval-unit {
  width: 60px;
}
.rtc-url-prefix {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: rgb(255 255 255 / 60%);
  white-space: nowrap;
}
.rtc-auth-control {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: rgb(255 255 255 / 80%);
  white-space: nowrap;
}
.rtc-mode-options {
  display: grid;
  grid-template-columns: repeat(2, 96px);
  gap: 8px;
  width: 200px;
}
.rtc-mode-options :deep(.el-radio-button) {
  width: 96px;
}
.rtc-mode-options :deep(.el-radio-button.is-active .el-radio-button__inner) {
  /** 选中态与按钮悬浮态保持一致，使单选结果在鼠标移开后仍清晰可见。 */
  color: #ffffff !important;
  background: rgb(90 178 165 / 18%) !important;
  border-color: #5ab2a5 !important;
}
.rtc-request-table {
  min-width: 0;
  overflow: hidden;
  background: #1d2a35;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 2px;
}
.rtc-line-tabs {
  :deep(.el-tabs__header) {
    height: 39px;
    padding: 0 12px;
    margin: 0;
    background: #131c26;
    border-bottom: 1px solid rgb(255 255 255 / 5%);
  }
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
  :deep(.el-tabs__item) {
    height: 39px;
    padding: 0 8px;
    font-size: 13px;
    color: rgb(255 255 255 / 60%);
  }
  :deep(.el-tabs__item.is-active),
  :deep(.el-tabs__item:hover) {
    color: #5ab2a5;
  }
  :deep(.el-tabs__active-bar) {
    background: #5ab2a5;
  }
  :deep(.el-tabs__content) {
    min-width: 0;
  }
}
.rtc-body-type,
.rtc-body-content,
.rtc-sql-content {
  padding: 12px;
}
.rtc-body-type {
  display: flex;
  align-items: center;
  min-height: 56px;
  border-bottom: 1px solid rgb(255 255 255 / 5%);
}
.rtc-body-radio-group {
  flex-wrap: wrap;
  gap: 8px 24px;
  width: auto;
}
.rtc-body-content {
  min-height: 66px;
}
.rtc-hint-card {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 20px;
  color: rgb(255 255 255 / 60%);
  background: #18222b;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 2px;
}
.rtc-hint-warning {
  font-size: 13px;
  color: #e16e6e;
}
.rtc-sql-content,
.rtc-sql-row {
  gap: 12px;
}
.rtc-sql-row {
  margin-top: 12px;
}
.rtc-code-input :deep(textarea) {
  font-family: monospace;
  font-size: 13px;
}

/** 低于设计宽度时改为分行布局，保持公共接口与动态请求弹窗一致的响应式行为。 */
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 构建后为浏览器标准容器查询。 */
@#{'container'} scene-property-dialog (width <= 700px) {
  .rtc-address-row,
  .rtc-mode-row,
  .rtc-sql-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .rtc-address-controls {
    grid-template-columns: 80px minmax(0, 1fr) 60px 60px;
  }
  .rtc-auth-control {
    grid-column: 1 / -1;
  }
}

/* stylelint-disable-next-line scss/at-rule-no-unknown -- 与上方相同，构建后为浏览器标准容器查询。 */
@#{'container'} scene-property-dialog (width <= 520px) {
  .rtc-address-controls {
    grid-template-columns: 72px minmax(0, 1fr);
  }
  .rtc-interval-number,
  .rtc-interval-unit {
    width: 100%;
  }
  .rtc-mode-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }
  .rtc-mode-options :deep(.el-radio-button) {
    width: 100%;
  }
}
</style>
