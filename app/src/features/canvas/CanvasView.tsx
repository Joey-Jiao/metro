import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Graph } from './Graph'
import { useTree } from '../../stores/tree'

export function CanvasView() {
  const tree = useTree()
  const navigate = useNavigate()

  function handleNavigateToChat(nodeId: string) {
    tree.setActiveNode(nodeId)
    navigate('/chat')
  }

  return (
    <Show
      when={tree.state.tree}
      fallback={
        <div class="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
          No conversation selected
        </div>
      }
    >
      <Graph onNavigateToChat={handleNavigateToChat} />
    </Show>
  )
}
