import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'

/**
 * 按应用和测试的真实类型依赖闭包审计迁移边界。
 * --prune 仅删除来源清单内、哈希未改变且没有被应用或测试引用的代码；资源和用户原有文件不删除。
 * 类型导入同样计入保留集合，避免为精简目录而删除仍被接口依赖的文件。
 */
const root = process.cwd()
const baselinePath = path.resolve('docs/migration/08-前端迁移来源基线.json')
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const included = new Set()
for (const config of ['tsconfig.app.json', 'tsconfig.test.json']) {
  const output = execFileSync(process.execPath, ['node_modules/vue-tsc/bin/vue-tsc.js', '-p', config, '--listFilesOnly'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  for (const line of output.split(/\r?\n/)) included.add(path.resolve(line.trim()).toLowerCase())
}
const unused = []
// 类型依赖同样检查；正式应用和测试均不得间接拉回浏览器三维引擎。
const engineImports = []
const engineImport = /(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)['"](?:three(?:\/|['"])|cesium(?:\/|['"])|@cesium\/)/
for (const absolute of included) {
  if (!absolute.startsWith(`${root.toLowerCase()}${path.sep}src${path.sep}`) || !/\.(?:ts|vue)$/.test(absolute)) continue
  if (engineImport.test(await readFile(absolute, 'utf8'))) engineImports.push(path.relative(root, absolute))
}
if (engineImports.length) throw new Error(`二维依赖闭包包含浏览器三维引擎：${engineImports.join('、')}`)
for (const file of baseline.files) {
  if (!/\.(?:ts|vue)$/.test(file.path) || !file.path.startsWith('src/') || file.path.endsWith('.d.ts')) continue
  const absolute = path.resolve(file.path)
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error('审计路径越界')
  if (included.has(absolute.toLowerCase())) continue
  let contents
  try { contents = await readFile(absolute) } catch (error) { if (error.code === 'ENOENT') continue; throw error }
  if (createHash('sha256').update(contents).digest('hex') !== file.sha256) continue
  unused.push(file.path)
  if (process.argv.includes('--prune')) await unlink(absolute)
}
for (const file of baseline.preservedUnityRuntime) {
  const actual = createHash('sha256').update(await readFile(file.path)).digest('hex')
  if (actual !== file.sha256) throw new Error(`Unity 保全文件发生变化：${file.path}`)
}
if (process.argv.includes('--prune')) {
  baseline.excludedUnreachableCode = [...new Set([...(baseline.excludedUnreachableCode ?? []), ...unused])]
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
}
console.log(JSON.stringify({ preservedUnityFiles: baseline.preservedUnityRuntime.length, engineImportCount: engineImports.length, unreachableCodeCount: unused.length, unreachableCode: unused, pruned: process.argv.includes('--prune') }))
