export {}

declare global {
namespace DataMiddlewareApi {
  interface CommonResponse<T> {
    code: number
    data: T
    msg: string
  }

  interface CommonResponse2<T> {
    code: number
    content: T
    msg: string
  }

  type MetadataGetColumns2 = CommonResponse<{
    url: string
    tableName: string
    databaseName: string
    columns: {
      createtime: string
      datasourceId: null
      dbname: string
      dbtype: string
      fieldname: string
      fieldtype: string
      filedremark: string
      id: number
      sourcename: string
      tablecomment: string
      tableengine: string
      tablename: string
    }[]
  }>

  type JobJdbcDatasourceListThRecord = CommonResponse2<{
    data: { [key: string]: string } []
    fields: string[]
    recordsTotal: number
  }>
}
}
