/** 协议资源清理后重置媒体元素；调用方须保证同一实例只执行一次。 */
export const resetVideoElement = (video: HTMLVideoElement) => {
  video.pause()
  video.removeAttribute('src')
  video.srcObject = null
  video.load()
}
