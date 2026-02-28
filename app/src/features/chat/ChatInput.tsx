import { For, Show, createSignal } from 'solid-js'
import { useSettings } from '../../stores/settings'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput(props: Props) {
  const [text, setText] = createSignal('')
  const settings = useSettings()
  let textareaRef!: HTMLTextAreaElement

  function handleSubmit() {
    const content = text().trim()
    if (!content || props.disabled) return
    props.onSend(content)
    setText('')
    textareaRef.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const activeModelLabel = () => {
    const m = settings.settings.activeModel
    if (!m) return 'No model'
    return m.modelId
  }

  const allModels = () => {
    const items: { providerId: string; modelId: string; label: string }[] = []
    for (const p of settings.settings.providers) {
      for (const m of p.models) {
        items.push({ providerId: p.id, modelId: m, label: `${p.name} / ${m}` })
      }
    }
    return items
  }

  const activeKey = () => {
    const m = settings.settings.activeModel
    return m ? `${m.providerId}::${m.modelId}` : ''
  }

  function onModelChange(key: string) {
    const item = allModels().find(i => `${i.providerId}::${i.modelId}` === key)
    if (item) settings.setActiveModel({ providerId: item.providerId, modelId: item.modelId })
  }

  return (
    <div class="p-4 pb-5">
      <div class="mx-auto max-w-2xl lg:max-w-3xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <textarea
          ref={textareaRef}
          class="block max-h-[40vh] w-full resize-none overflow-y-auto bg-transparent px-4 pt-3 pb-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none"
          rows={1}
          placeholder={props.placeholder ?? 'Message...'}
          value={text()}
          onInput={(e) => {
            setText(e.currentTarget.value)
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
          disabled={props.disabled}
        />
        <div class="flex items-center justify-between px-3 pb-2">
          <div class="flex items-center">
            <button
              class="flex h-7 w-7 items-center justify-center rounded-md text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              +
            </button>
          </div>
          <div class="flex items-center gap-2">
            <Show when={allModels().length > 0}>
              <select
                class="h-7 rounded-md border-none bg-transparent px-1.5 text-xs text-[var(--color-text-muted)] outline-none cursor-pointer hover:text-[var(--color-text)]"
                value={activeKey()}
                onChange={(e) => onModelChange(e.currentTarget.value)}
              >
                <For each={allModels()}>
                  {(item) => (
                    <option value={`${item.providerId}::${item.modelId}`}>{item.label}</option>
                  )}
                </For>
              </select>
            </Show>
            <Show when={!allModels().length}>
              <span class="text-xs text-[var(--color-text-muted)]">{activeModelLabel()}</span>
            </Show>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              onClick={handleSubmit}
              disabled={!text().trim() || props.disabled}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
