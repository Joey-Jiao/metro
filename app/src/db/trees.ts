import { db } from './index'
import type { TreeNode, ConversationTree } from '../types/model'

export async function getTree(id: string): Promise<ConversationTree | undefined> {
  return db.trees.get(id)
}

export async function getTreesByProject(projectId: string): Promise<ConversationTree[]> {
  return db.trees.where('projectId').equals(projectId).sortBy('createdAt').then(arr => arr.reverse())
}

export async function createTree(projectId: string, title: string): Promise<{ tree: ConversationTree; rootNode: TreeNode }> {
  const now = Date.now()
  const treeId = crypto.randomUUID()
  const rootNode: TreeNode = {
    id: crypto.randomUUID(),
    treeId,
    parentId: null,
    childIds: [],
    role: 'system',
    content: '',
    summary: null,
    status: 'idle',
    collapsed: false,
    position: null,
    createdAt: now,
    updatedAt: now,
  }
  const tree: ConversationTree = {
    id: treeId,
    projectId,
    title,
    rootNodeId: rootNode.id,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.trees, db.nodes, db.projects], async () => {
    await db.trees.add(tree)
    await db.nodes.add(rootNode)
    const project = await db.projects.get(projectId)
    if (project) {
      await db.projects.update(projectId, {
        treeIds: [...project.treeIds, treeId],
        updatedAt: now,
      })
    }
  })
  return { tree, rootNode }
}

export async function updateTree(id: string, changes: Partial<Pick<ConversationTree, 'title'>>): Promise<void> {
  await db.trees.update(id, { ...changes, updatedAt: Date.now() })
}

export async function moveTree(treeId: string, targetProjectId: string): Promise<void> {
  const t = await db.trees.get(treeId)
  if (!t || t.projectId === targetProjectId) return
  const sourceProjectId = t.projectId
  await db.transaction('rw', [db.trees, db.projects], async () => {
    await db.trees.update(treeId, { projectId: targetProjectId, updatedAt: Date.now() })
    const source = await db.projects.get(sourceProjectId)
    if (source) {
      await db.projects.update(sourceProjectId, {
        treeIds: source.treeIds.filter(id => id !== treeId),
        updatedAt: Date.now(),
      })
    }
    const target = await db.projects.get(targetProjectId)
    if (target) {
      await db.projects.update(targetProjectId, {
        treeIds: [...target.treeIds, treeId],
        updatedAt: Date.now(),
      })
    }
  })
}

export async function deleteTree(id: string): Promise<void> {
  const tree = await db.trees.get(id)
  if (!tree) return
  await db.transaction('rw', [db.trees, db.nodes, db.projects], async () => {
    await db.nodes.where('treeId').equals(id).delete()
    await db.trees.delete(id)
    const project = await db.projects.get(tree.projectId)
    if (project) {
      await db.projects.update(tree.projectId, {
        treeIds: project.treeIds.filter(tid => tid !== id),
        updatedAt: Date.now(),
      })
    }
  })
}
