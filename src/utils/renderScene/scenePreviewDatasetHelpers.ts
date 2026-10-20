import { fetchDataSourceFieldDetail } from '@/servers/manual/dataMiddleware/api/dataSource'
import type { Dataset } from '@/types/threeScene'
import type { ComponentDataConfig } from '@/utils/dataConfig'

export type DatasetFieldDetailContent = Awaited<ReturnType<typeof fetchDataSourceFieldDetail>>['content']

/**
 * 判断当前数据配置是否命中了指定数据集。
 *
 * 这里兼容两种历史匹配口径：
 * - 直接按 `datasetName`
 * - 按 `dataSourceId`
 */
export const matchesPreviewDatasetDataConfig = (
  dataConfig: ComponentDataConfig,
  dataset: Dataset,
) => {
  const datasetProperty = (
    dataConfig.request.config as { datasetProperty?: { datasetName?: string; dataSourceId?: string } | null }
  ).datasetProperty

  if (!datasetProperty) return false
  if (datasetProperty.datasetName && datasetProperty.datasetName === dataset.name) return true

  if (datasetProperty.dataSourceId) {
    return dataset.dataSourceList.some((item) => item.dataSourceId === datasetProperty.dataSourceId)
  }

  return false
}

/**
 * 拉取单个数据源的完整字段详情。
 *
 * 接口本身需要先拿一次 `recordsTotal`，再按总量补第二次请求；
 * 这里封装后，预览类不需要再重复关心分页探测细节。
 */
const fetchSingleDataSourceFieldDetailContent = async (
  dataSource: Dataset['dataSourceList'][number],
  token: string | null,
) => {
  const firstParams = {
    tablename: dataSource.tableName,
    datasourceId: dataSource.dataSourceId,
    pageNo: 1,
    pageSize: 1,
  }
  const firstResult = await fetchDataSourceFieldDetail(firstParams, {
    headers: { authorization: token },
  })

  if (!firstResult?.content?.recordsTotal || firstResult.content.recordsTotal <= 0) {
    return null
  }

  const secondParams = {
    tablename: dataSource.tableName,
    datasourceId: dataSource.dataSourceId,
    pageNo: 1,
    pageSize: firstResult.content.recordsTotal,
  }
  const secondResult = await fetchDataSourceFieldDetail(secondParams, {
    headers: { authorization: token },
  })

  return secondResult.content
}

/**
 * 拉取数据集下所有数据源的完整字段详情列表。
 *
 * 预览态后续会决定这些结果是用于首次创建打点组，还是仅用于轮询刷新属性；
 * 这里不掺杂任何场景副作用，只负责拿到完整内容。
 */
export const fetchDatasetFieldDetailContents = async (
  dataset: Dataset,
  token: string | null,
) => {
  const contents: DatasetFieldDetailContent[] = []

  for (const dataSource of dataset.dataSourceList) {
    const content = await fetchSingleDataSourceFieldDetailContent(dataSource, token)
    if (content) {
      contents.push(content)
    }
  }

  return contents
}
