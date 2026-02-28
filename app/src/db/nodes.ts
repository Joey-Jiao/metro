import { db } from './index'
import type { TreeNode } from '../types/model'

export async function getNodesByTree(treeId: string): Promise<TreeNode[]> {
  return db.nodes.where('treeId').equals(treeId).toArray()
}

export async function addNode(
  treeId: string,
  parentId: string,
  role: TreeNode['role'],
  content: string,
): Promise<TreeNode> {
  const now = Date.now()
  const node: TreeNode = {
    id: crypto.randomUUID(),
    treeId,
    parentId,
    childIds: [],
    role,
    content,
    summary: null,
    status: 'idle',
    collapsed: false,
    position: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.nodes], async () => {
    await db.nodes.add(node)
    const parent = await db.nodes.get(parentId)
    if (parent) {
      await db.nodes.update(parentId, {
        childIds: [...parent.childIds, node.id],
        updatedAt: now,
      })
    }
  })
  return node
}

export async function updateNode(id: string, changes: Partial<Pick<TreeNode, 'content' | 'summary' | 'status' | 'collapsed' | 'position'>>): Promise<void> {
  await db.nodes.update(id, { ...changes, updatedAt: Date.now() })
}

export async function deleteSubtree(nodeId: string): Promise<string[]> {
  const node = await db.nodes.get(nodeId)
  if (!node) return []

  const idsToDelete: string[] = []
  const queue = [nodeId]
  while (queue.length > 0) {
    const currentId = queue.pop()!
    idsToDelete.push(currentId)
    const current = await db.nodes.get(currentId)
    if (current) {
      queue.push(...current.childIds)
    }
  }

  await db.transaction('rw', [db.nodes], async () => {
    await db.nodes.bulkDelete(idsToDelete)
    if (node.parentId) {
      const parent = await db.nodes.get(node.parentId)
      if (parent) {
        await db.nodes.update(node.parentId, {
          childIds: parent.childIds.filter(cid => cid !== nodeId),
          updatedAt: Date.now(),
        })
      }
    }
  })
  return idsToDelete
}
