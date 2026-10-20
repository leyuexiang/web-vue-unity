export enum RESOURCE_TAB_ENUM {
  /** 场景模板资源，必须排在模型资源之前，便于在编辑器中快速复用场景。 */
  Template = 'template',
  System = 'system',
  Custom = 'custom',
  Component = 'component',
  Icon = 'icon',
  Chart = 'chart',
  Decorate = 'decorate',
}

export enum SCENE_PANEL_ENUM {
  Resource = 'resource',
  MyResource = 'myResource',
  Data = 'data',
  Structure = 'structure',
}
