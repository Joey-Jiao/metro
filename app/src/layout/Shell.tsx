import { Show, type ParentProps } from 'solid-js'
import { useUI } from '../stores/ui'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TokenCounter } from '../components/TokenCounter'
import { Toolbox } from '../components/Toolbox'

export function Shell(props: ParentProps) {
  const ui = useUI()

  return (
    <div class="flex h-screen flex-col">
      <Toolbar />
      <div class="flex flex-1 overflow-hidden">
        <Show when={ui.state.sidebarOpen}>
          <div
            class="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => ui.setSidebarOpen(false)}
          />
        </Show>
        <div
          class={`fixed top-12 bottom-0 left-0 z-40 transition-transform duration-200 lg:relative lg:top-auto lg:z-auto lg:transition-none ${
            ui.state.sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:hidden'
          }`}
        >
          <Sidebar />
        </div>
        <div class="relative flex-1 overflow-hidden">
          {props.children}
          <Show when={ui.state.settingsOpen}>
            <div class="absolute inset-0 z-20 bg-[var(--color-bg)]">
              <SettingsPage />
            </div>
          </Show>
          <TokenCounter />
          <Show when={import.meta.env.DEV}>
            <Toolbox />
          </Show>
        </div>
      </div>
    </div>
  )
}
