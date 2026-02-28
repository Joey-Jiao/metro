import { useNavigate, useLocation } from '@solidjs/router'
import { useTree } from '../stores/tree'
import { useUI } from '../stores/ui'

export function Toolbar() {
  const tree = useTree()
  const navigate = useNavigate()
  const location = useLocation()
  const isCanvas = () => location.pathname === '/canvas'
  const ui = useUI()

  function navChat() { ui.setSettingsOpen(false); navigate('/chat') }
  function navCanvas() { ui.setSettingsOpen(false); navigate('/canvas') }

  return (
    <div class="relative grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
      <div class="flex items-center gap-3">
        <button
          class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onClick={() => ui.toggleSidebar()}
        >
          ☰
        </button>
        <span class="text-sm font-medium">
          {tree.state.tree?.title ?? 'Metro'}
        </span>
      </div>

      <div class="flex rounded border border-[var(--color-border)]">
        <button
          class={`px-2.5 py-1 text-xs transition-colors ${!isCanvas() ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
          onClick={navChat}
        >
          Chat
        </button>
        <button
          class={`px-2.5 py-1 text-xs transition-colors ${isCanvas() ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
          onClick={navCanvas}
        >
          Canvas
        </button>
      </div>

      <div />
    </div>
  )
}
