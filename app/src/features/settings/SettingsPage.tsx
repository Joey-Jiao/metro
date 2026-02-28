import { For } from 'solid-js'
import { useSettings } from '../../stores/settings'
import { Section } from '../../components/Section'
import { ProviderCard } from './ProviderCard'
import { AddProviderForm } from './AddProviderForm'
import { ModelSelector } from './ModelSelector'

export function SettingsPage() {
  const ctx = useSettings()

  return (
    <div class="h-full overflow-y-auto">
      <div class="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8 space-y-8">
        <h1 class="text-lg font-semibold">Settings</h1>

        <Section title="Providers">
          <div class="space-y-2">
            <For each={ctx.settings.providers}>
              {provider => (
                <ProviderCard
                  provider={provider}
                  onUpdate={(id, changes) => ctx.updateProvider(id, changes)}
                  onDelete={(id) => ctx.removeProvider(id)}
                />
              )}
            </For>
            <AddProviderForm onAdd={config => ctx.addProvider(config)} />
          </div>
        </Section>

        <Section title="Chat Model">
          <ModelSelector
            label="Active Model"
            providers={ctx.settings.providers}
            value={ctx.settings.activeModel}
            onChange={v => ctx.setActiveModel(v)}
          />
        </Section>

        <Section title="Summary Model">
          <ModelSelector
            label="Summarization Model"
            description="Used for auto-summarization and other lightweight tasks."
            providers={ctx.settings.providers}
            value={ctx.settings.summaryModel}
            onChange={v => ctx.setSummaryModel(v)}
            nullable
          />
        </Section>

      </div>
    </div>
  )
}
