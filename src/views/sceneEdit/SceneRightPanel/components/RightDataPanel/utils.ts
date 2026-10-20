import type { Dataset, DatasetProperty, SceneDataItemDataSource } from '@/types/threeScene'
import { tokenCache } from '@/utils/utils'
import { fetchDataSourceDetail } from '@/servers/manual/dataMiddleware/api/dataSource'
import { appLogger } from '@/utils/logger'
/**
 * 获取所有数据集列表中的 tableName
 * @param datasetList 数据集列表
 * @returns 所有 dataSourceList 下的 tableName 字符串数组
 */
export const generateCurrentDataset = async (
  datasetList: Dataset[],
  needTableNames: string[],
): Promise<DataMiddlewareApi.MetadataGetColumns2['data']['columns']> => {
  try {
    const tableNames: { dataSourceId: string; tableName: string }[] = []

    // 遍历所有数据集
    datasetList.forEach((dataset) => {
      // 遍历每个数据集的 dataSourceList
      if (dataset.dataSourceList && Array.isArray(dataset.dataSourceList)) {
        dataset.dataSourceList.forEach((dataSource: SceneDataItemDataSource) => {
          // 提取 tableName 并添加到结果数组中
          if (dataSource.tableName && needTableNames.includes(dataSource.tableName)) {
            tableNames.push({
              dataSourceId: dataSource.dataSourceId,
              tableName: dataSource.tableName,
            })
          }
        })
      }
    })

    // 去重逻辑：如果 tableName 和 dataSourceId 都重复，则只保留一个
    const uniqueTableNames = tableNames.filter((item, index, array) => {
      return (
        array.findIndex(
          (other) => other.tableName === item.tableName && other.dataSourceId === item.dataSourceId,
        ) === index
      )
    })

    // 根据 uniqueTableNames 的长度调用 fetchDataSourceDetail 接口
    if (uniqueTableNames.length > 0) {
      const dataSourceDetails: DataMiddlewareApi.MetadataGetColumns2['data']['columns'] = []

      // 并发调用所有接口
      const promises = uniqueTableNames.map(async (item) => {
        try {
          const result = await fetchDataSourceDetail(
            {
              datasourceId: item.dataSourceId,
              tableName: item.tableName,
            },
            { headers: { authorization: await tokenCache() } },
          )
          // 提取 result.data.columns 下的列表内容
          return result?.data?.columns || []
        } catch (error) {
          // 单个数据源详情失败时不阻断其他表并发加载，最终只合并成功结果。
          appLogger.error(
            'RightDataPanel',
            '获取数据源详情失败',
            { dataSourceId: item.dataSourceId, tableName: item.tableName },
            error,
          )
          return null
        }
      })

      // 等待所有接口调用完成
      const results = await Promise.all(promises)

      // 过滤掉失败的结果并合并到列表中
      const validResults = results.filter((result) => result !== null)
      // 展平所有 columns 数组
      const flattenedColumns = validResults.flat()
      dataSourceDetails.push(...flattenedColumns)

      // 根据 id 字段进行去重处理
      const uniqueDataSourceDetails = dataSourceDetails.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id),
      )

      // 根据 needTableNames 过滤数据，只返回匹配的 tablename
      const filteredDataSourceDetails = uniqueDataSourceDetails.filter((item) =>
        needTableNames.includes(item.tablename),
      )

      return filteredDataSourceDetails
    }

    return []
  } catch (error) {
    appLogger.error('RightDataPanel', '获取数据集列表失败', error)
    return []
  }
}

/**
 * 生成当前选中的行文本
 * @param currentRow 当前选中的行
 * @returns 当前选中的行文本
 */
export const generateCurrentRowText = (
  datasetName: string,
  currentRow: DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0],
) => {
  return `
    ${currentRow.fieldname}
   (${datasetName}-${currentRow.dbname}-${currentRow.tablename})
    `
}

/**
 * 生成当前选中的行文本
 * @param currentRow 当前选中的行
 * @returns 当前选中的行文本
 */
export const generateBindPropertyText = (datasetProperty: DatasetProperty) => {
  if(!datasetProperty.dataSourceId) return ''
  return `
    ${datasetProperty.bindProperty}
   (${datasetProperty.datasetName}-${datasetProperty.databaseName}-${datasetProperty.tableName})
    `
}
