import { Show, createSignal } from 'solid-js'
import type { ProviderConfig, ProviderType } from '../../types/provider'
import { PROVIDER_NAMES, DEFAULT_MODELS, DEFAULT_BASE_URLS } from '../../llm/defaults'
import { Field } from '../../components/Field'

export function AddProviderForm(props: { onAdd: (config: ProviderConfig) => void }) {
  const [open, setOpen] = createSignal(false)
  const [type, setType] = createSignal<ProviderType>('openai')
  const [name, setName] = createSignal('')
  const [apiKey, setApiKey] = createSignal('')
  const [baseUrl, setBaseUrl] = createSignal('')

  function submit() {
    const t = type()
    const n = name().trim() || PROVIDER_NAMES[t]
    const key = apiKey().trim()
    if (!key && t !== 'local' && t !== 'mock') return

    const config: ProviderConfig = {
      id: crypto.randomUUID(),
      type: t,
      name: n,
      apiKey: key,
      baseUrl: baseUrl().trim() || DEFAULT_BASE_URLS[t],
      models: DEFAULT_MODELS[t],
    }
    props.onAdd(config)
    setType('openai')
    setName('')
    setApiKey('')
    setBaseUrl('')
    setOpen(false)
  }

  return (
    <Show
      when={open()}
      fallback={
        <button
          class="w-full rounded-lg border border-dashed border-[var(--color-border)] py-2.5 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
          onClick={() => setOpen(true)}
        >
          + Add Provider
        </button>
      }
    >
      <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
        <div class="flex gap-1">
          {(['openai', 'anthropic', 'local', 'mock'] as const).map(t => (
            <button
              class={`flex-1 rounded px-2 py-1.5 text-xs ${type() === t ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <Field label="Name" value={name()} onInput={setName} placeholder="Optional" />
        <Show when={type() !== 'local' && type() !== 'mock'}>
          <Field label="API Key" value={apiKey()} onInput={setApiKey} type="password" />
        </Show>
        <Show when={type() === 'local'}>
          <Field label="Base URL" value={baseUrl()} onInput={setBaseUrl} placeholder="http://localhost:11434/v1" />
        </Show>
        <div class="flex justify-end gap-2">
          <button
            class="rounded px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            class="rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-[var(--color-accent-hover)]"
            onClick={submit}
          >
            Add
          </button>
        </div>
      </div>
    </Show>
  )
}
