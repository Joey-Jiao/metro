import { For, Show, createEffect, on } from 'solid-js'
import { useTree } from '../../stores/tree'
import { useChat } from '../../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'

export function ChatView() {
  const tree = useTree()
  const chat = useChat()
  let messagesEnd!: HTMLDivElement

  createEffect(on(
    () => Object.keys(tree.state.nodes).length,
    () => {
      requestAnimationFrame(() => {
        messagesEnd?.scrollIntoView({ behavior: 'smooth' })
      })
    },
  ))

  return (
    <div class="flex h-full flex-col">
      <Show
        when={tree.state.tree}
        fallback={
          <div class="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
            No conversation selected
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto px-4 py-6">
          <div class="mx-auto max-w-2xl lg:max-w-3xl">
            <For each={chat.linearChain().filter(n => n.role !== 'system')}>
              {(node) => {
                const info = () => chat.getSiblingInfo(node)
                return (
                  <MessageBubble
                    node={node}
                    isActive={tree.state.activeNodeId === node.id}
                    siblingIndex={info().index}
                    siblingCount={info().count}
                    onSelect={() => tree.setActiveNode(node.id)}
                    onBranch={() => chat.branch(node)}
                    onRegenerate={() => chat.regenerate(node)}
                    onSiblingNav={(dir) => chat.navigateSibling(node, dir)}
                  />
                )
              }}
            </For>
            <div ref={messagesEnd} />
          </div>
        </div>

        <Show when={chat.branchTarget()}>
          <div class="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
            Branching — ask a different follow-up...
            <button
              class="ml-2 text-[var(--color-accent)] hover:underline"
              onClick={() => chat.setBranchTarget(null)}
            >
              Cancel
            </button>
          </div>
        </Show>
        <ChatInput
          onSend={chat.sendMessage}
          disabled={!chat.canSend()}
          placeholder={chat.placeholder()}
        />
      </Show>
    </div>
  )
}
