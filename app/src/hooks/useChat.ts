import { createSignal } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'
import { useTree } from '../stores/tree'
import { useSettings } from '../stores/settings'
import { getProvider } from '../llm/registry'
import { streamResponse } from '../services/chat'
import type { TreeNode } from '../types/model'

export interface ChatAPI {
  branchTarget: Accessor<string | null>
  setBranchTarget: Setter<string | null>
  isStreaming: Accessor<boolean>
  linearChain: () => TreeNode[]
  getSiblingInfo(node: TreeNode): { index: number; count: number; siblings: string[] }
  navigateSibling(node: TreeNode, direction: -1 | 1): void
  sendMessage(content: string): Promise<void>
  regenerate(assistantNode: TreeNode): Promise<void>
  branch(assistantNode: TreeNode): void
  canSend: Accessor<boolean>
  placeholder: Accessor<string>
}

export function useChat(): ChatAPI {
  const tree = useTree()
  const settings = useSettings()

  const [branchTarget, setBranchTarget] = createSignal<string | null>(null)
  const [activePath, setActivePath] = createSignal<Record<string, string>>({})

  const isStreaming: Accessor<boolean> = () =>
    Object.values(tree.state.nodes).some(n => n.status === 'streaming')

  function linearChain(): TreeNode[] {
    const root = tree.state.tree?.rootNodeId
    if (!root) return []

    const chain: TreeNode[] = []
    let currentId: string | null = root

    while (currentId) {
      const node: TreeNode | undefined = tree.state.nodes[currentId]
      if (!node) break
      chain.push(node)
      if (node.childIds.length === 0) break
      const preferred: string | undefined = activePath()[node.id]
      currentId = preferred && node.childIds.includes(preferred)
        ? preferred
        : node.childIds[0]
    }

    return chain
  }

  function getSiblingInfo(node: TreeNode): { index: number; count: number; siblings: string[] } {
    if (!node.parentId) return { index: 0, count: 1, siblings: [node.id] }
    const parent = tree.state.nodes[node.parentId]
    if (!parent) return { index: 0, count: 1, siblings: [node.id] }
    const siblings = parent.childIds
    return { index: siblings.indexOf(node.id), count: siblings.length, siblings }
  }

  function navigateSibling(node: TreeNode, direction: -1 | 1) {
    const { index, siblings } = getSiblingInfo(node)
    const next = index + direction
    if (next < 0 || next >= siblings.length) return
    setActivePath(prev => ({ ...prev, [node.parentId!]: siblings[next] }))
  }

  function getActiveProvider() {
    const activeModel = settings.settings.activeModel
    if (!activeModel) return null
    const providerConfig = settings.settings.providers.find(p => p.id === activeModel.providerId)
    if (!providerConfig) return null
    return { provider: getProvider(providerConfig), modelId: activeModel.modelId }
  }

  async function streamAssistantResponse(parentUserNodeId: string) {
    const ctx = getActiveProvider()
    if (!ctx) return

    const assistantNode = await tree.addNode(parentUserNodeId, 'assistant', '')
    tree.setNodeStatus(assistantNode.id, 'streaming')
    tree.setActiveNode(assistantNode.id)

    try {
      await streamResponse(
        ctx.provider,
        ctx.modelId,
        tree.state.nodes,
        parentUserNodeId,
        (chunk) => tree.appendToNode(assistantNode.id, chunk),
      )
      tree.setNodeStatus(assistantNode.id, 'idle')
      await tree.persistNode(assistantNode.id)
    } catch (err) {
      tree.setNodeStatus(assistantNode.id, 'error')
      tree.appendToNode(assistantNode.id, `\n\n[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`)
      await tree.persistNode(assistantNode.id)
    }
  }

  async function sendMessage(content: string) {
    if (!getActiveProvider()) return

    const chain = linearChain()
    const lastNode = chain[chain.length - 1]

    const parentId = branchTarget() ?? lastNode.id
    setBranchTarget(null)

    const userNode = await tree.addNode(parentId, 'user', content)
    await streamAssistantResponse(userNode.id)
  }

  function branch(assistantNode: TreeNode) {
    setBranchTarget(assistantNode.id)
  }

  async function regenerate(assistantNode: TreeNode) {
    const ctx = getActiveProvider()
    if (!ctx || !assistantNode.parentId) return

    for (const childId of [...assistantNode.childIds]) {
      await tree.deleteSubtree(childId)
    }

    tree.updateNodeContent(assistantNode.id, '')
    tree.setNodeStatus(assistantNode.id, 'streaming')
    tree.setActiveNode(assistantNode.id)

    try {
      await streamResponse(
        ctx.provider,
        ctx.modelId,
        tree.state.nodes,
        assistantNode.parentId,
        (chunk) => tree.appendToNode(assistantNode.id, chunk),
      )
      tree.setNodeStatus(assistantNode.id, 'idle')
      await tree.persistNode(assistantNode.id)
    } catch (err) {
      tree.setNodeStatus(assistantNode.id, 'error')
      tree.appendToNode(assistantNode.id, `\n\n[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`)
      await tree.persistNode(assistantNode.id)
    }
  }

  const canSend: Accessor<boolean> = () =>
    !isStreaming() && !!settings.settings.activeModel && !!tree.state.tree

  const placeholder: Accessor<string> = () => {
    if (!tree.state.tree) return 'No conversation selected'
    if (!settings.settings.activeModel) return 'Set up a provider in Settings'
    if (branchTarget()) return 'Ask a different question...'
    return 'Message...'
  }

  return {
    branchTarget,
    setBranchTarget,
    isStreaming,
    linearChain,
    getSiblingInfo,
    navigateSibling,
    sendMessage,
    regenerate,
    branch,
    canSend,
    placeholder,
  }
}
