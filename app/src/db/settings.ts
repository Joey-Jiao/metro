import type { AppSettings } from '../types/settings'

const SETTINGS_KEY = 'metro:settings'

const defaults: AppSettings = {
  theme: 'system',
  defaultViewMode: 'canvas',
  activeModel: null,
  summaryModel: null,
  providers: [],
  canvas: {
    snapToGrid: false,
    animateLayout: true,
    defaultZoom: 1,
  },
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return { ...defaults, canvas: { ...defaults.canvas } }
  let parsed: Partial<AppSettings>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...defaults, canvas: { ...defaults.canvas } }
  }
  return {
    ...defaults,
    ...parsed,
    canvas: { ...defaults.canvas, ...parsed.canvas },
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
