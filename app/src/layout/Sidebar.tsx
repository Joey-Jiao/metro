import { For, Show, createSignal, createEffect, on } from 'solid-js'
import { useProjects } from '../stores/projects'
import { useTree } from '../stores/tree'
import { useUI } from '../stores/ui'
import type { ConversationTree } from '../types/model'
import { getTreesByProject, deleteTree, moveTree, updateTree } from '../db/trees'

function deduplicateName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name
  for (let i = 0; ; i++) {
    let suffix = ''
    let n = i
    do {
      suffix = String.fromCharCode(97 + (n % 26)) + suffix
      n = Math.floor(n / 26) - 1
    } while (n >= 0)
    const candidate = `${name} ${suffix}`
    if (!existing.includes(candidate)) return candidate
  }
}

const NAME_MAX = 40

function nameInputClass(value: string, base: string) {
  const over = value.trim().length > NAME_MAX
  return `${base} ${over ? 'border-red-400 focus:border-red-400' : 'border-[var(--color-border)] focus:border-[var(--color-border)]'}`
}

export function Sidebar() {
  const projects = useProjects()
  const tree = useTree()
  const ui = useUI()
  const [newProjectName, setNewProjectName] = createSignal('')
  const [newTreeName, setNewTreeName] = createSignal('')
  const [creatingProject, setCreatingProject] = createSignal(false)
  const [creatingTree, setCreatingTree] = createSignal(false)
  const [treeMetas, setTreeMetas] = createSignal<ConversationTree[]>([])
  const [menuFor, setMenuFor] = createSignal<string | null>(null)
  const [movingTreeId, setMovingTreeId] = createSignal<string | null>(null)
  const [renamingId, setRenamingId] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal('')
  const [confirmingDelete, setConfirmingDelete] = createSignal<string | null>(null)

  createEffect(on(
    () => projects.state.activeProjectId,
    async (projectId) => {
      if (!projectId) {
        setTreeMetas([])
        return
      }
      const trees = await getTreesByProject(projectId)
      setTreeMetas(trees)
    },
  ))

  function closeMenu() {
    setMenuFor(null)
    setMovingTreeId(null)
    setConfirmingDelete(null)
  }

  function toggleMenu(id: string, e: MouseEvent) {
    e.stopPropagation()
    if (menuFor() === id) {
      closeMenu()
    } else {
      setMenuFor(id)
      setMovingTreeId(null)
    }
  }

  function cancelNewProject() {
    setNewProjectName('')
    setCreatingProject(false)
  }

  function cancelNewTree() {
    setNewTreeName('')
    setCreatingTree(false)
  }

  function startRename(id: string, currentName: string) {
    closeMenu()
    setRenamingId(id)
    setRenameValue(currentName)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameValue('')
  }

  async function commitRenameProject(id: string) {
    const name = renameValue().trim()
    if (name.length > NAME_MAX) return
    const current = projects.state.projects[id]?.name
    if (!name || name === current) { cancelRename(); return }
    const existing = Object.values(projects.state.projects).filter(p => p.id !== id).map(p => p.name)
    const unique = deduplicateName(name, existing)
    cancelRename()
    await projects.update(id, { name: unique })
  }

  async function commitRenameTree(treeId: string) {
    const title = renameValue().trim()
    if (title.length > NAME_MAX) return
    const meta = treeMetas().find(t => t.id === treeId)
    if (!title || !meta || title === meta.title) { cancelRename(); return }
    const existing = treeMetas().filter(t => t.id !== treeId).map(t => t.title)
    const unique = deduplicateName(title, existing)
    cancelRename()
    await updateTree(treeId, { title: unique })
    setTreeMetas(prev => prev.map(t => t.id === treeId ? { ...t, title: unique } : t))
  }

  async function createProject() {
    const name = newProjectName().trim()
    if (!name || name.length > NAME_MAX) { if (!name) cancelNewProject(); return }
    const existing = Object.values(projects.state.projects).map(p => p.name)
    const unique = deduplicateName(name, existing)
    setNewProjectName('')
    setCreatingProject(false)
    const project = await projects.create(unique)
    projects.setActive(project.id)
  }

  async function createNewTree() {
    const name = newTreeName().trim()
    const projectId = projects.state.activeProjectId
    if (!name || name.length > NAME_MAX || !projectId) { if (!name) cancelNewTree(); return }
    const existing = treeMetas().map(t => t.title)
    const unique = deduplicateName(name, existing)
    setNewTreeName('')
    setCreatingTree(false)
    const t = await tree.createTree(projectId, unique)
    setTreeMetas(prev => [t, ...prev])
    await projects.load()
  }

  async function handleDeleteProject(id: string) {
    const wasActive = projects.state.activeProjectId === id
    await projects.remove(id)
    if (wasActive) {
      tree.unloadTree()
      setTreeMetas([])
    }
    closeMenu()
  }

  async function handleDeleteTree(treeId: string) {
    if (tree.state.tree?.id === treeId) tree.unloadTree()
    await deleteTree(treeId)
    setTreeMetas(prev => prev.filter(t => t.id !== treeId))
    await projects.load()
    closeMenu()
  }

  async function handleMoveTree(treeId: string, targetProjectId: string) {
    const meta = treeMetas().find(t => t.id === treeId)
    if (meta) {
      const targetTrees = await getTreesByProject(targetProjectId)
      const unique = deduplicateName(meta.title, targetTrees.map(t => t.title))
      if (unique !== meta.title) await updateTree(treeId, { title: unique })
    }
    if (tree.state.tree?.id === treeId) tree.unloadTree()
    await moveTree(treeId, targetProjectId)
    setTreeMetas(prev => prev.filter(t => t.id !== treeId))
    await projects.load()
    closeMenu()
  }

  async function loadTree(treeId: string) {
    ui.setSettingsOpen(false)
    await tree.loadTree(treeId)
  }

  const otherProjects = () => {
    const activeId = projects.state.activeProjectId
    return Object.values(projects.state.projects).filter(p => p.id !== activeId)
  }

  return (
    <div class="flex h-full w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <Show when={menuFor()}>
        <div class="fixed inset-0 z-40" onClick={closeMenu} />
      </Show>

      <div class="flex items-center justify-between border-b border-[var(--color-border)] p-3">
        <span class="text-sm font-medium">Projects</span>
        <button
          class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setCreatingProject(true)}
        >
          +
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <For each={Object.values(projects.state.projects)}>
          {(project) => (
            <div>
              <div
                class={`group relative flex cursor-pointer items-center transition-colors ${
                  projects.state.activeProjectId === project.id
                    ? 'bg-[var(--color-surface-hover)]'
                    : 'hover:bg-[var(--color-surface-hover)]'
                }`}
                onClick={() => {
                  if (renamingId() === project.id) return
                  projects.setActive(project.id)
                  tree.unloadTree()
                  ui.setSettingsOpen(false)
                }}
              >
                <Show
                  when={renamingId() !== project.id}
                  fallback={
                    <div class="flex-1 px-2 py-1.5">
                      <input
                        ref={el => setTimeout(() => { el.focus(); el.select() })}
                        class={nameInputClass(renameValue(), 'w-full rounded-lg border bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-colors')}
                        value={renameValue()}
                        onInput={(e) => setRenameValue(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRenameProject(project.id)
                          if (e.key === 'Escape') cancelRename()
                        }}
                        onBlur={cancelRename}
                      />
                    </div>
                  }
                >
                  <span
                    class={`flex-1 truncate px-3 py-2 text-left text-sm ${
                      projects.state.activeProjectId === project.id
                        ? 'text-[var(--color-text)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {project.name}
                  </span>
                  <Show when={projects.state.activeProjectId === project.id}>
                    <button
                      class="shrink-0 px-1 text-xs text-[var(--color-text-muted)] opacity-0 hover:text-[var(--color-text)] group-hover:opacity-100"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.stopPropagation(); setCreatingTree(true) }}
                    >
                      +
                    </button>
                  </Show>
                  <button
                    class={`shrink-0 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${menuFor() === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => { e.stopPropagation(); toggleMenu(project.id, e) }}
                  >
                    ···
                  </button>
                  <Show when={menuFor() === project.id}>
                    <div class="absolute right-1 top-full z-50 min-w-[120px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                      <button
                        class="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        onClick={() => startRename(project.id, project.name)}
                      >
                        Rename
                      </button>
                      <button
                        class="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[var(--color-surface-hover)]"
                        onClick={() => {
                          if (confirmingDelete() === project.id) {
                            handleDeleteProject(project.id)
                          } else {
                            setConfirmingDelete(project.id)
                          }
                        }}
                      >
                        {confirmingDelete() === project.id ? 'Confirm' : 'Delete'}
                      </button>
                    </div>
                  </Show>
                </Show>
              </div>

              <Show when={projects.state.activeProjectId === project.id}>
                <div class="pl-4">
                  <For each={treeMetas()}>
                    {(meta) => (
                      <div
                        class={`group relative flex cursor-pointer items-center transition-colors ${
                          tree.state.tree?.id === meta.id
                            ? 'bg-[var(--color-surface-hover)]'
                            : 'hover:bg-[var(--color-surface-hover)]'
                        }`}
                        onClick={() => {
                          if (renamingId() === meta.id) return
                          loadTree(meta.id)
                        }}
                      >
                        <Show
                          when={renamingId() !== meta.id}
                          fallback={
                            <div class="flex-1 px-2 py-1">
                              <input
                                ref={el => setTimeout(() => { el.focus(); el.select() })}
                                class={nameInputClass(renameValue(), 'w-full rounded-lg border bg-[var(--color-bg)] px-3 py-1 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-colors')}
                                value={renameValue()}
                                onInput={(e) => setRenameValue(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRenameTree(meta.id)
                                  if (e.key === 'Escape') cancelRename()
                                }}
                                onBlur={cancelRename}
                              />
                            </div>
                          }
                        >
                          <span
                            class={`flex-1 truncate px-3 py-1.5 text-left text-xs ${
                              tree.state.tree?.id === meta.id
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-muted)]'
                            }`}
                          >
                            {meta.title}
                          </span>
                          <button
                            class={`shrink-0 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${menuFor() === meta.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); toggleMenu(meta.id, e) }}
                          >
                            ···
                          </button>
                          <Show when={menuFor() === meta.id}>
                            <div class="absolute right-1 top-full z-50 w-[180px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                              <Show
                                when={movingTreeId() !== meta.id}
                                fallback={
                                  <>
                                    <div class="px-3 py-1 text-[10px] text-[var(--color-text-muted)]">Move to</div>
                                    <For each={otherProjects()}>
                                      {(p) => (
                                        <button
                                          class="w-full truncate px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                                          onClick={() => handleMoveTree(meta.id, p.id)}
                                        >
                                          {p.name}
                                        </button>
                                      )}
                                    </For>
                                  </>
                                }
                              >
                                <button
                                  class="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                                  onClick={() => startRename(meta.id, meta.title)}
                                >
                                  Rename
                                </button>
                                <Show when={otherProjects().length > 0}>
                                  <button
                                    class="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                                    onClick={() => setMovingTreeId(meta.id)}
                                  >
                                    Move to...
                                  </button>
                                </Show>
                                <button
                                  class="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[var(--color-surface-hover)]"
                                  onClick={() => {
                                    if (confirmingDelete() === meta.id) {
                                      handleDeleteTree(meta.id)
                                    } else {
                                      setConfirmingDelete(meta.id)
                                    }
                                  }}
                                >
                                  {confirmingDelete() === meta.id ? 'Confirm' : 'Delete'}
                                </button>
                              </Show>
                            </div>
                          </Show>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={creatingTree()}>
                    <div class="px-2 py-1">
                      <input
                        ref={el => setTimeout(() => el.focus())}
                        class={nameInputClass(newTreeName(), 'w-full rounded-lg border bg-[var(--color-bg)] px-3 py-1 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-colors')}
                        placeholder="Conversation title"
                        value={newTreeName()}
                        onInput={(e) => setNewTreeName(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createNewTree()
                          if (e.key === 'Escape') cancelNewTree()
                        }}
                        onBlur={cancelNewTree}
                      />
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </For>

        <Show when={creatingProject()}>
          <div class="px-2 py-1.5">
            <input
              ref={el => setTimeout(() => el.focus())}
              class={nameInputClass(newProjectName(), 'w-full rounded-lg border bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-colors')}
              placeholder="Project name"
              value={newProjectName()}
              onInput={(e) => setNewProjectName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject()
                if (e.key === 'Escape') cancelNewProject()
              }}
              onBlur={cancelNewProject}
            />
          </div>
        </Show>
      </div>

      <div
        class={`flex h-12 cursor-pointer items-center border-t border-[var(--color-border)] px-3 transition-colors ${
          ui.state.settingsOpen
            ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
        }`}
        onClick={() => ui.setSettingsOpen(!ui.state.settingsOpen)}
      >
        <span class="text-sm">Settings</span>
      </div>
    </div>
  )
}
