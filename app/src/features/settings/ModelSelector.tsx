import { For, Show } from 'solid-js'
import type { ProviderConfig } from '../../types/provider'

export function ModelSelector(props: {
  label: string
  description?: string
  providers: ProviderConfig[]
  value: { providerId: string; modelId: string } | null
  onChange: (value: { providerId: string; modelId: string } | null) => void
  nullable?: boolean
}) {
  const selectedProvider = () =>
    props.value ? props.providers.find(p => p.id === props.value!.providerId) ?? null : null

  function onProviderChange(providerId: string) {
    if (!providerId) {
      props.onChange(null)
      return
    }
    const provider = props.providers.find(p => p.id === providerId)
    if (provider && provider.models.length > 0) {
      props.onChange({ providerId, modelId: provider.models[0] })
    }
  }

  function onModelChange(modelId: string) {
    if (props.value) {
      props.onChange({ ...props.value, modelId })
    }
  }

  return (
    <div>
      <label class="mb-1 block text-sm font-medium">{props.label}</label>
      <Show when={props.description}>
        <p class="mb-2 text-xs text-[var(--color-text-muted)]">{props.description}</p>
      </Show>
      <div class="flex gap-2">
        <select
          class="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          value={props.value?.providerId ?? ''}
          onChange={e => onProviderChange(e.currentTarget.value)}
        >
          {props.nullable !== false && <option value="">None</option>}
          <For each={props.providers}>
            {p => <option value={p.id}>{p.name}</option>}
          </For>
        </select>
        <select
          class="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          value={props.value?.modelId ?? ''}
          onChange={e => onModelChange(e.currentTarget.value)}
          disabled={!selectedProvider()}
        >
          <Show when={!selectedProvider()}>
            <option value="">—</option>
          </Show>
          <For each={selectedProvider()?.models ?? []}>
            {m => <option value={m}>{m}</option>}
          </For>
        </select>
      </div>
    </div>
  )
}
