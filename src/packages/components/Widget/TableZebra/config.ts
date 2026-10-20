import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { TablePlusOption } from '../shared/tableTypes'

export const VTableZebraInfo = {
  name: '斑马纹表格',
  keyName: 'VTableZebra',
  packageName: 'Widget',
  icon: new URL('../assets/images/tables-basic.png', import.meta.url).href,
}

const createDefaultSource = () => [
  { key: 0, deviceId: '1', deviceName: '200', protocol: 'MQTT', level: '一级告警' },
  { key: 1, deviceId: '2', deviceName: '湿度传感器', protocol: 'MQTT', level: '二级告警' },
  { key: 2, deviceId: '3', deviceName: '物联网设备', protocol: 'MQTT', level: '一级告警' },
  {
    key: 3,
    deviceId: '4',
    deviceName: '物联网设备/智能家居/智慧城市',
    protocol: 'MQTT',
    level: '三级告警',
  },
]

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 600, h: 260, zIndex: -1 }
  public info = cloneDeep(VTableZebraInfo)
  public option: TablePlusOption = {
    variant: 'zebra',
    dataset: {
      dimensions: [
        { title: '设备 ID', key: 'deviceId' },
        { title: '设备名称', key: 'deviceName' },
        { title: '数据协议', key: 'protocol' },
        { title: '级别', key: 'level' },
      ],
      source: createDefaultSource(),
    },
    align: 'center',
    rowHeight: 32,
    colWidth: 90,
    swiper: false,
    waitTime: 2,
    carousel: 'single',
    style: {
      colHeaders: true,
      bordered: false,
      hLine: false,
      vLine: false,
      stripe: true,
      stripeColor: '#407FFF1F',
      background: '#10131A',
      headerBackground: '#303746',
      textColor: '#FFFFFF',
      headerTextColor: '#FFFFFF',
      borderColor: '#407FFF66',
      fontSize: 14,
    },
    cellTextColors: {
      level: {
        一级告警: '#FF5D3CFF',
        二级告警: '#E6A82EFF',
        三级告警: '#58CC84FF',
      },
    },
    label: '斑马纹表格',
  }
}
