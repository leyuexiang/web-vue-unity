import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VIframeInfo = {
  name: '网页嵌入',
  keyName: 'VIframe',
  packageName: 'Widget',
  icon: new URL(`../assets/images/iframe.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 200, zIndex: -1 }
  public info = clone(VIframeInfo)
  public option = {
    value: 'https://example.com',
    borderRadius: 10,
    label: '网页嵌入',
  }
}
