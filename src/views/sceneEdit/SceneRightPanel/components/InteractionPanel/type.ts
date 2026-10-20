export type FixedValueLocation = 'source' | 'target'

export type DatasetContext = {
  rowId: string
  type: 'source' | 'target'
}

export type JsonContext = {
  rowId: string
  location: FixedValueLocation
}
