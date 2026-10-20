import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * 首次迁移的来源快照工具。
 * 只读取相邻来源仓库；只允许向当前项目的前端目录复制文件。
 * 不复制三维渲染实现、依赖缓存、环境凭据和构建产物，也不覆盖已有 Unity 传输层。
 * 后续改造已在目标文件中展开，因此重复运行必须显式指定 --refresh，防止覆盖人工适配。
 */
const destination = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = path.resolve(destination, '../jtyf-web-three')
const manifestPath = path.join(destination, 'docs/migration/08-前端迁移来源基线.json')
const roots = ['src/assets', 'src/auth', 'src/components', 'src/config', 'src/enums',
  'src/integrations', 'src/layout', 'src/packages', 'src/servers', 'src/settings', 'src/stores',
  'src/types', 'src/views', 'src/scene-platform/core', 'src/scene-platform/commands',
  'src/scene-platform/store', 'src/scene-platform/persistence', 'src/scene-platform/effects',
  'src/scene-platform/editor/panels', 'src/utils']
const runtimeFiles = ['sceneRuntime.ts', 'runtimeTypes.ts', 'runtimeCapabilities.ts',
  'baseSceneRuntime.ts', 'runtimeBridge.ts', 'runtimeObjectComponentIndex.ts',
  'sceneObjectAdapter.ts', 'assetLoader.ts', 'coordinateTransformService.ts',
  'firstPersonPreview.ts', 'memory/memorySceneRuntime.ts']
const excluded = /(?:^|\/)(?:__tests__|historyModules)(?:\/|$)|\/preview\/RenderScene\.ts$|\/utils\/coordinateUtils\.ts$|\/effects\/threeMap\/threeMapGeometry\.ts$|\/types\/(?:three-utils|three-css3d|gaussian-splats-3d)\.d\.ts$/
const renderTools = new Set(['conditionRuntime.ts', 'interactionActionExecutors.ts',
  'interactionActionSequence.ts', 'widgetModules.ts', 'sceneRuntimeBridge.ts',
  'sceneObjectTargetResolver.ts', 'scenePreviewRemoteHelpers.ts', 'scenePreviewDatasetHelpers.ts'])
const files = []
const walk = async (relative) => {
  for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`
    if (excluded.test(name)) continue
    if (name.startsWith('src/utils/renderScene/') && !entry.isDirectory() && !renderTools.has(entry.name)) continue
    if (entry.isDirectory()) {
      if (name.startsWith('src/utils/renderScene/')) continue
      await walk(name)
    } else files.push(name)
  }
}
try {
  await readFile(manifestPath)
  if (!process.argv.includes('--refresh')) throw new Error('来源基线已存在，拒绝覆盖已经适配的前端文件')
} catch (error) { if (error.code !== 'ENOENT') throw error }
for (const root of roots) await walk(root)
files.push(...runtimeFiles.map((file) => `src/scene-platform/runtime/${file}`),
  'src/scene-platform/index.ts', 'src/scene-platform/editor/viewportHost.ts',
  'src/App.vue', 'src/main.ts', 'src/router/index.ts', 'src/request.ts',
  'env.d.ts', 'vue.d.ts', 'tsconfig.base.json', 'tsconfig.app.json',
  'server/mediaMiddleware.ts', 'server/mediaGateway.ts', 'server/mediaGatewayServer.ts',
  'server/media.env.example')
const hashes = []
for (const relative of [...new Set(files)].sort()) {
  const target = path.resolve(destination, relative)
  if (!target.startsWith(`${destination}${path.sep}`)) throw new Error('迁移路径越界')
  await mkdir(path.dirname(target), { recursive: true })
  await cp(path.join(source, relative), target)
  hashes.push({ path: relative, sha256: createHash('sha256').update(await readFile(target)).digest('hex') })
}
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const preserved = []
const preserve = async (relative) => {
  for (const entry of await readdir(path.join(destination, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`
    if (entry.isDirectory()) await preserve(name)
    else preserved.push({ path: name, sha256: createHash('sha256').update(await readFile(path.join(destination, name))).digest('hex') })
  }
}
await preserve('src/unity-runtime')
await writeFile(manifestPath, `${JSON.stringify({ date: '2026-10-20', source,
  sourceBranch: git(source, ['branch', '--show-current']), sourceCommit: git(source, ['rev-parse', 'HEAD']),
  sourceStatus: git(source, ['status', '--short']), files: hashes, preservedUnityRuntime: preserved }, null, 2)}\n`, 'utf8')
console.log(`已复制 ${hashes.length} 个来源文件，记录 ${preserved.length} 个 Unity 保全文件。`)
