/** 将显示矩形中的鼠标点还原为舞台逻辑坐标，无需依赖引擎向量。 */
export const getStagePointerCoordinate = (clientX: number, clientY: number, container: HTMLElement) => {
  const rect = container.getBoundingClientRect()
  const ratioX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
  const ratioY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0
  return { x: ratioX * (container.clientWidth || rect.width || 1),
    y: ratioY * (container.clientHeight || rect.height || 1), ratioX, ratioY }
}
