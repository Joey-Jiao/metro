import { createContext, useContext, onMount, type ParentProps } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { Project } from '../types/model'
import * as projectsDb from '../db/projects'

interface ProjectsState {
  projects: Record<string, Project>
  activeProjectId: string | null
  loading: boolean
}

interface ProjectsContextValue {
  state: ProjectsState
  load(): Promise<void>
  create(name: string): Promise<Project>
  update(id: string, changes: Partial<Pick<Project, 'name'>>): Promise<void>
  remove(id: string): Promise<void>
  setActive(id: string | null): void
}

const ProjectsContext = createContext<ProjectsContextValue>()

export function ProjectsProvider(props: ParentProps) {
  const [state, setState] = createStore<ProjectsState>({
    projects: {},
    activeProjectId: null,
    loading: true,
  })

  async function load() {
    const projects = await projectsDb.getAllProjects()
    const map: Record<string, Project> = {}
    for (const p of projects) {
      map[p.id] = p
    }
    setState({ projects: map, loading: false })
  }

  onMount(() => { load() })

  const value: ProjectsContextValue = {
    get state() { return state },

    load,

    async create(name) {
      const project = await projectsDb.createProject(name)
      setState('projects', project.id, project)
      return project
    },

    async update(id, changes) {
      await projectsDb.updateProject(id, changes)
      setState('projects', id, produce(p => Object.assign(p, changes, { updatedAt: Date.now() })))
    },

    async remove(id) {
      await projectsDb.deleteProject(id)
      setState('projects', produce(p => { delete p[id] }))
      if (state.activeProjectId === id) {
        setState('activeProjectId', null)
      }
    },

    setActive(id) {
      setState('activeProjectId', id)
    },
  }

  return <ProjectsContext.Provider value={value}>{props.children}</ProjectsContext.Provider>
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider')
  return ctx
}
