import { createContext, useContext, type ParentProps } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { TreeNode, ConversationTree } from '../types/model'
import * as treesDb from '../db/trees'
import * as nodesDb from '../db/nodes'

interface TreeState {
  tree: ConversationTree | null
  nodes: Record<string, TreeNode>
  activeNodeId: string | null
  selectedNodeIds: string[]
  loading: boolean
}

interface TreeContextValue {
  state: TreeState
  loadTree(treeId: string): Promise<void>
  unloadTree(): void
  createTree(projectId: string, title: string): Promise<ConversationTree>
  addNode(parentId: string, role: TreeNode['role'], content: string): Promise<TreeNode>
  updateNodeContent(nodeId: string, content: string): void
  appendToNode(nodeId: string, chunk: string): void
  setNodeStatus(nodeId: string, status: TreeNode['status']): void
  toggleCollapsed(nodeId: string): void
  updateNodePosition(nodeId: string, position: { x: number; y: number }): void
  deleteSubtree(nodeId: string): Promise<void>
  setActiveNode(nodeId: string | null): void
  setSelectedNodes(nodeIds: string[]): void
  persistNode(nodeId: string): Promise<void>
  getAncestorChain(nodeId: string): TreeNode[]
}

const TreeContext = createContext<TreeContextValue>()

export function TreeProvider(props: ParentProps) {
  const [state, setState] = createStore<TreeState>({
    tree: null,
    nodes: {},
    activeNodeId: null,
    selectedNodeIds: [],
    loading: false,
  })

  let persistTimer: ReturnType<typeof setTimeout> | null = null

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(async () => {
      for (const node of Object.values(state.nodes)) {
        await nodesDb.updateNode(node.id, {
          content: node.content,
          summary: node.summary,
          status: node.status,
          collapsed: node.collapsed,
          position: node.position,
        })
      }
    }, 2000)
  }

  const value: TreeContextValue = {
    get state() { return state },

    async loadTree(treeId) {
      setState('loading', true)
      const [tree, nodes] = await Promise.all([
        treesDb.getTree(treeId),
        nodesDb.getNodesByTree(treeId),
      ])
      if (!tree) {
        setState('loading', false)
        return
      }
      const nodesMap: Record<string, TreeNode> = {}
      for (const n of nodes) {
        nodesMap[n.id] = n
      }
      setState({
        tree,
        nodes: nodesMap,
        activeNodeId: null,
        selectedNodeIds: [],
        loading: false,
      })
    },

    unloadTree() {
      if (persistTimer) clearTimeout(persistTimer)
      setState({
        tree: null,
        nodes: {},
        activeNodeId: null,
        selectedNodeIds: [],
        loading: false,
      })
    },

    async createTree(projectId, title) {
      const { tree, rootNode } = await treesDb.createTree(projectId, title)
      setState({
        tree,
        nodes: { [rootNode.id]: rootNode },
        activeNodeId: null,
        selectedNodeIds: [],
      })
      return tree
    },

    async addNode(parentId, role, content) {
      if (!state.tree) throw new Error('No tree loaded')
      const node = await nodesDb.addNode(state.tree.id, parentId, role, content)
      setState('nodes', node.id, node)
      setState('nodes', parentId, 'childIds', prev => [...prev, node.id])
      return node
    },

    updateNodeContent(nodeId, content) {
      setState('nodes', nodeId, 'content', content)
      setState('nodes', nodeId, 'updatedAt', Date.now())
      schedulePersist()
    },

    appendToNode(nodeId, chunk) {
      setState('nodes', nodeId, 'content', prev => prev + chunk)
      setState('nodes', nodeId, 'updatedAt', Date.now())
    },

    setNodeStatus(nodeId, status) {
      setState('nodes', nodeId, 'status', status)
      setState('nodes', nodeId, 'updatedAt', Date.now())
    },

    toggleCollapsed(nodeId) {
      setState('nodes', nodeId, 'collapsed', prev => !prev)
      schedulePersist()
    },

    updateNodePosition(nodeId, position) {
      setState('nodes', nodeId, 'position', position)
      schedulePersist()
    },

    async deleteSubtree(nodeId) {
      const deletedIds = await nodesDb.deleteSubtree(nodeId)
      setState(produce(s => {
        const node = s.nodes[nodeId]
        if (node?.parentId && s.nodes[node.parentId]) {
          s.nodes[node.parentId].childIds = s.nodes[node.parentId].childIds.filter(id => id !== nodeId)
        }
        for (const id of deletedIds) {
          delete s.nodes[id]
        }
        if (deletedIds.includes(s.activeNodeId!)) {
          s.activeNodeId = null
        }
        s.selectedNodeIds = s.selectedNodeIds.filter(id => !deletedIds.includes(id))
      }))
    },

    setActiveNode(nodeId) {
      setState('activeNodeId', nodeId)
    },

    setSelectedNodes(nodeIds) {
      setState('selectedNodeIds', nodeIds)
    },

    async persistNode(nodeId) {
      const node = state.nodes[nodeId]
      if (!node) return
      await nodesDb.updateNode(nodeId, {
        content: node.content,
        summary: node.summary,
        status: node.status,
        collapsed: node.collapsed,
        position: node.position,
      })
    },

    getAncestorChain(nodeId) {
      const chain: TreeNode[] = []
      let current = state.nodes[nodeId]
      while (current) {
        chain.unshift(current)
        current = current.parentId ? state.nodes[current.parentId] : undefined!
      }
      return chain
    },
  }

  return <TreeContext.Provider value={value}>{props.children}</TreeContext.Provider>
}

export function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext)
  if (!ctx) throw new Error('useTree must be used within TreeProvider')
  return ctx
}
