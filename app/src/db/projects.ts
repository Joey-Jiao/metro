import { db } from './index'
import type { Project } from '../types/model'

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('createdAt').reverse().toArray()
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function createProject(name: string): Promise<Project> {
  const now = Date.now()
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    treeIds: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.projects.add(project)
  return project
}

export async function updateProject(id: string, changes: Partial<Pick<Project, 'name' | 'treeIds'>>): Promise<void> {
  await db.projects.update(id, { ...changes, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  const trees = await db.trees.where('projectId').equals(id).toArray()
  await db.transaction('rw', [db.projects, db.trees, db.nodes], async () => {
    for (const tree of trees) {
      await db.nodes.where('treeId').equals(tree.id).delete()
    }
    await db.trees.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}
