import { Dexie, type EntityTable } from 'dexie'
import type { TreeNode, ConversationTree, Project } from '../types/model'

const db = new Dexie('metro') as Dexie & {
  projects: EntityTable<Project, 'id'>
  trees: EntityTable<ConversationTree, 'id'>
  nodes: EntityTable<TreeNode, 'id'>
}

db.version(1).stores({
  projects: 'id, name, createdAt',
  trees: 'id, projectId, createdAt',
  nodes: 'id, treeId, parentId, createdAt',
})

export { db }
