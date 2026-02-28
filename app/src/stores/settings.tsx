import { createContext, useContext, type ParentProps } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { AppSettings } from '../types/settings'
import type { ProviderConfig } from '../types/provider'
import { loadSettings, saveSettings } from '../db/settings'

interface SettingsContextValue {
  settings: AppSettings
  setTheme(theme: AppSettings['theme']): void
  setDefaultViewMode(mode: AppSettings['defaultViewMode']): void
  setActiveModel(model: AppSettings['activeModel']): void
  setSummaryModel(model: AppSettings['summaryModel']): void
  addProvider(provider: ProviderConfig): void
  updateProvider(id: string, changes: Partial<ProviderConfig>): void
  removeProvider(id: string): void
  setCanvasOption<K extends keyof AppSettings['canvas']>(key: K, value: AppSettings['canvas'][K]): void
}

const SettingsContext = createContext<SettingsContextValue>()

export function SettingsProvider(props: ParentProps) {
  const [settings, setSettings] = createStore<AppSettings>(loadSettings())

  function persist() {
    saveSettings(settings)
  }

  const value: SettingsContextValue = {
    get settings() { return settings },

    setTheme(theme) {
      setSettings('theme', theme)
      persist()
    },

    setDefaultViewMode(mode) {
      setSettings('defaultViewMode', mode)
      persist()
    },

    setActiveModel(model) {
      setSettings('activeModel', model)
      persist()
    },

    setSummaryModel(model) {
      setSettings('summaryModel', model)
      persist()
    },

    addProvider(provider) {
      setSettings('providers', prev => [...prev, provider])
      persist()
    },

    updateProvider(id, changes) {
      setSettings('providers', p => p.id === id, produce(p => Object.assign(p, changes)))
      persist()
    },

    removeProvider(id) {
      setSettings('providers', prev => prev.filter(p => p.id !== id))
      if (settings.activeModel?.providerId === id) {
        setSettings('activeModel', null)
      }
      if (settings.summaryModel?.providerId === id) {
        setSettings('summaryModel', null)
      }
      persist()
    },

    setCanvasOption(key, value) {
      setSettings('canvas', key, value)
      persist()
    },
  }

  return <SettingsContext.Provider value={value}>{props.children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
