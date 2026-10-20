import { createServer } from 'node:http'
import { createMediaMiddleware } from './mediaMiddleware.ts'

// 正式进程无开发绕过开关，缺失鉴权配置时拒绝启动，避免被误部署为公开拉流代理。
if (!process.env.MEDIA_AUTH_CHECK_URL) throw new Error('请配置 MEDIA_AUTH_CHECK_URL')
const middleware = createMediaMiddleware({ env: process.env })
const server = createServer({ requestTimeout: 10000, headersTimeout: 10000 }, (req, res) => {
  middleware(req, res, () => { res.writeHead(404); res.end() })
})
server.listen(Number(process.env.MEDIA_PORT || 5181), process.env.MEDIA_HOST || '127.0.0.1', () => {
  console.log('媒体接入服务已启动')
})
// 先停止接受新请求，现有管理请求有超时上限；该进程不承载视频数据连接。
process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
