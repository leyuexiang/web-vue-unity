export type EditorObjectIdSource = {
  id?: string | null
} | null | undefined

const uniqueValidIds = (items: readonly EditorObjectIdSource[]) => {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const id = item?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

/**
 * 对比旧编辑器对象列表，找出已经被旧链路删除、需要同步删除到 scene-platform 的对象 id。
 */
export function getRemovedEditorObjectIds(
  previousItems: readonly EditorObjectIdSource[],
  nextItems: readonly EditorObjectIdSource[],
): string[] {
  const nextIds = new Set(uniqueValidIds(nextItems))
  return uniqueValidIds(previousItems).filter((id) => !nextIds.has(id))
}
