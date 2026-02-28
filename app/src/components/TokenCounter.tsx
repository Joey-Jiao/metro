import { Show, createMemo } from 'solid-js'
import { useTree } from '../stores/tree'
import { estimateTokens } from '../llm/context'
import type { TreeNode } from '../types/model'

function findLeaf(nodes: Record<string, TreeNode>, rootId: string): string {
  let id = rootId
  while (true) {
    const node = nodes[id]
    if (!node || node.childIds.length === 0) return id
    id = node.childIds[0]
  }
}

export function TokenCounter() {
  const tree = useTree()

  const stats = createMemo(() => {
    const { nodes, activeNodeId } = tree.state
    const rootId = tree.state.tree?.rootNodeId
    if (!rootId) return null

    const tipId = activeNodeId || findLeaf(nodes, rootId)
    if (!tipId) return null

    const chain: string[] = []
    let cur: string | undefined = tipId
    while (cur) {
      chain.unshift(cur)
      const n: TreeNode | undefined = nodes[cur]
      if (!n?.parentId) break
      cur = n.parentId
    }

    let totalTokens = 0
    let branchTokens = 0
    let branchPointFound = false
    const depth = Math.floor(chain.length / 2)

    for (let i = chain.length - 1; i >= 0; i--) {
      const node = nodes[chain[i]]
      if (!node || !node.content) continue
      const t = estimateTokens(node.content) + 4
      totalTokens += t
      if (!branchPointFound) {
        branchTokens += t
        const parent = node.parentId ? nodes[node.parentId] : null
        if (parent && parent.childIds.length > 1) branchPointFound = true
      }
    }

    return { totalTokens, branchTokens, onBranch: branchPointFound, depth }
  })

  function fmt(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
  }

  return (
    <Show when={stats()}>
      {s => (
        <div class="absolute bottom-20 right-4 z-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-sm">
          <div class="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
            <span>{s().depth} rounds</span>
            <span>~{fmt(s().totalTokens)} tokens</span>
            <Show when={s().onBranch}>
              <span class="border-l border-[var(--color-border)] pl-4">branch ~{fmt(s().branchTokens)}</span>
            </Show>
          </div>
        </div>
      )}
    </Show>
  )
}
