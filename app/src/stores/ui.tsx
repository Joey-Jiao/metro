import { createContext, useContext, onCleanup, type ParentProps } from 'solid-js'
import { createStore } from 'solid-js/store'

type ViewMode = 'canvas' | 'chat'

interface ContextMenuState {
  open: boolean
  x: number
  y: number
  nodeId: string | null
}

interface UIState {
  viewMode: ViewMode
  sidebarOpen: boolean
  contextMenu: ContextMenuState
  settingsOpen: boolean
}

interface UIContextValue {
  state: UIState
  setViewMode(mode: ViewMode): void
  toggleSidebar(): void
  setSidebarOpen(open: boolean): void
  openContextMenu(x: number, y: number, nodeId: string | null): void
  closeContextMenu(): void
  setSettingsOpen(open: boolean): void
}

const UIContext = createContext<UIContextValue>()

const lgQuery = '(min-width: 1024px)'

export function UIProvider(props: ParentProps) {
  const [state, setState] = createStore<UIState>({
    viewMode: 'canvas',
    sidebarOpen: window.matchMedia(lgQuery).matches,
    contextMenu: { open: false, x: 0, y: 0, nodeId: null },
    settingsOpen: false,
  })

  const mql = window.matchMedia(lgQuery)
  const handleChange = (e: MediaQueryListEvent) => {
    if (!e.matches) setState('sidebarOpen', false)
  }
  mql.addEventListener('change', handleChange)
  onCleanup(() => mql.removeEventListener('change', handleChange))

  const value: UIContextValue = {
    get state() { return state },

    setViewMode(mode) {
      setState('viewMode', mode)
    },

    toggleSidebar() {
      setState('sidebarOpen', prev => !prev)
    },

    setSidebarOpen(open) {
      setState('sidebarOpen', open)
    },

    openContextMenu(x, y, nodeId) {
      setState('contextMenu', { open: true, x, y, nodeId })
    },

    closeContextMenu() {
      setState('contextMenu', 'open', false)
    },

    setSettingsOpen(open) {
      setState('settingsOpen', open)
    },
  }

  return <UIContext.Provider value={value}>{props.children}</UIContext.Provider>
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
