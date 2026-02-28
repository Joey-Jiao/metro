import { Show, createSignal, createEffect, on } from 'solid-js'
import type { ProviderConfig } from '../../types/provider'
import { getProvider, clearProvider } from '../../llm/registry'
import { Field } from '../../components/Field'

export function ProviderCard(props: {
  provider: ProviderConfig
  onUpdate: (id: string, changes: Partial<ProviderConfig>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = createSignal(false)
  const [name, setName] = createSignal(props.provider.name)
  const [apiKey, setApiKey] = createSignal(props.provider.apiKey)
  const [baseUrl, setBaseUrl] = createSignal(props.provider.baseUrl ?? '')
  const [models, setModels] = createSignal(props.provider.models.join(', '))
  const [confirmDelete, setConfirmDelete] = createSignal(false)
  const [fetching, setFetching] = createSignal(false)

  createEffect(on(() => props.provider, (p) => {
    setName(p.name)
    setApiKey(p.apiKey)
    setBaseUrl(p.baseUrl ?? '')
    setModels(p.models.join(', '))
  }))

  function save() {
    const parsed = models().split(',').map(s => s.trim()).filter(Boolean)
    props.onUpdate(props.provider.id, {
      name: name(),
      apiKey: apiKey(),
      baseUrl: baseUrl() || null,
      models: parsed,
    })
    setExpanded(false)
  }

  async function fetchModels() {
    setFetching(true)
    try {
      const tempConfig: ProviderConfig = {
        ...props.provider,
        apiKey: apiKey(),
        baseUrl: baseUrl() || null,
      }
      clearProvider(tempConfig.id)
      const provider = getProvider(tempConfig)
      const fetched = await provider.listModels()
      if (fetched.length > 0) {
        setModels(fetched.join(', '))
      }
    } catch {
    } finally {
      setFetching(false)
    }
  }

  function handleDelete() {
    if (!confirmDelete()) {
      setConfirmDelete(true)
      return
    }
    props.onDelete(props.provider.id)
  }

  return (
    <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        class="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded())}
      >
        <div class="flex items-center gap-2">
          <span class="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--color-text-muted)]">
            {props.provider.type}
          </span>
          <span class="text-sm">{props.provider.name}</span>
        </div>
        <span class="text-xs text-[var(--color-text-muted)]">
          {props.provider.models.length} model{props.provider.models.length !== 1 ? 's' : ''}
        </span>
      </button>

      <Show when={expanded()}>
        <div class="border-t border-[var(--color-border)] px-4 py-3 space-y-3">
          <Field label="Name" value={name()} onInput={setName} />
          <Field label="API Key" value={apiKey()} onInput={setApiKey} type="password" />
          <Field label="Base URL" value={baseUrl()} onInput={setBaseUrl} placeholder="Default" />
          <div>
            <label class="mb-1 block text-xs text-[var(--color-text-muted)]">Models</label>
            <div class="flex gap-2">
              <input
                class="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                value={models()}
                onInput={e => setModels(e.currentTarget.value)}
              />
              <button
                class="rounded border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
                onClick={fetchModels}
                disabled={fetching()}
              >
                {fetching() ? '...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <button
              class={`text-xs ${confirmDelete() ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-error)]'}`}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete() ? 'Confirm delete' : 'Delete'}
            </button>
            <div class="flex gap-2">
              <button
                class="rounded px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                onClick={() => setExpanded(false)}
              >
                Cancel
              </button>
              <button
                class="rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-[var(--color-accent-hover)]"
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
