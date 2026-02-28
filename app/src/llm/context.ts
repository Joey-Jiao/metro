import type { TreeNode } from '../types/model'
import type { LLMMessage } from './types'

export function buildContextChain(nodes: Record<string, TreeNode>, nodeId: string): LLMMessage[] {
  const chain: TreeNode[] = []
  const visited = new Set<string>()
  let current: TreeNode | undefined = nodes[nodeId]
  while (current) {
    if (visited.has(current.id)) break
    visited.add(current.id)
    chain.unshift(current)
    current = current.parentId ? nodes[current.parentId] : undefined
  }
  return chain
    .filter(n => n.content.length > 0)
    .map(n => ({ role: n.role, content: n.content }))
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export function estimateChainTokens(messages: LLMMessage[]): number {
  let total = 0
  for (const m of messages) {
    total += estimateTokens(m.content) + 4
  }
  return total
}

export function trimContextToFit(messages: LLMMessage[], maxTokens: number): LLMMessage[] {
  let total = estimateChainTokens(messages)
  if (total <= maxTokens) return messages

  const trimmed = [...messages]
  while (trimmed.length > 2 && total > maxTokens) {
    const removed = trimmed.splice(1, 1)[0]
    total -= estimateTokens(removed.content) + 4
  }
  return trimmed
}
