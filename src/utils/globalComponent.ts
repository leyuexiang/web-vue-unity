import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import type { App } from 'vue';

const elementIcon = {
  install(app: App): void {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component);
    }
  },
};

export default elementIcon;
