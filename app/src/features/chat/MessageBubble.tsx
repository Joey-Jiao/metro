import { Show } from 'solid-js'
import type { TreeNode } from '../../types/model'
import { renderMarkdown } from '../../lib/markdown'

interface Props {
  node: TreeNode
  isActive: boolean
  siblingIndex?: number
  siblingCount?: number
  onSelect: () => void
  onBranch?: () => void
  onRegenerate?: () => void
  onSiblingNav?: (direction: -1 | 1) => void
}

export function MessageBubble(props: Props) {
  const isUser = () => props.node.role === 'user'
  const isAssistant = () => props.node.role === 'assistant'
  const isStreaming = () => props.node.status === 'streaming'
  const isError = () => props.node.status === 'error'
  const hasSiblings = () => (props.siblingCount ?? 1) > 1

  return (
    <div
      class={`group flex ${isUser() ? 'justify-end' : 'justify-start'} mb-3`}
      onClick={props.onSelect}
    >
      <div
        class={`relative max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed transition-colors
          ${isUser()
            ? 'bg-[var(--color-user)] text-[var(--color-text)]'
            : 'bg-[var(--color-assistant)] text-[var(--color-text)]'}
          ${props.isActive ? 'ring-1 ring-[var(--color-accent)]' : ''}
          ${isError() ? 'ring-1 ring-[var(--color-error)]' : ''}
        `}
      >
        <div class="mb-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{isUser() ? 'You' : 'Assistant'}</span>
          <Show when={hasSiblings()}>
            <span class="flex items-center gap-1">
              <button
                class="hover:text-[var(--color-text)] disabled:opacity-30"
                disabled={props.siblingIndex === 0}
                onClick={(e) => { e.stopPropagation(); props.onSiblingNav?.(-1) }}
              >
                ◀
              </button>
              <span>{(props.siblingIndex ?? 0) + 1}/{props.siblingCount}</span>
              <button
                class="hover:text-[var(--color-text)] disabled:opacity-30"
                disabled={props.siblingIndex === (props.siblingCount ?? 1) - 1}
                onClick={(e) => { e.stopPropagation(); props.onSiblingNav?.(1) }}
              >
                ▶
              </button>
            </span>
          </Show>
        </div>

        <Show
          when={isAssistant()}
          fallback={
            <div class="whitespace-pre-wrap break-words">
              {props.node.content || '(empty)'}
            </div>
          }
        >
          <div class="markdown-content break-words" innerHTML={renderMarkdown(props.node.content || '')} />
        </Show>
        <Show when={isStreaming()}>
          <span class="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-[var(--color-text-muted)]" />
        </Show>

        <Show when={isAssistant() && !isStreaming()}>
          <div class="mt-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              onClick={(e) => { e.stopPropagation(); props.onBranch?.() }}
            >
              Branch
            </button>
            <button
              class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              onClick={(e) => { e.stopPropagation(); props.onRegenerate?.() }}
            >
              Regenerate
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}
