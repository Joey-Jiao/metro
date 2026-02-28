import type { ProviderConfig } from './provider'

export type ModelRef = { providerId: string; modelId: string }

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  defaultViewMode: 'canvas' | 'chat'
  activeModel: ModelRef | null
  summaryModel: ModelRef | null
  providers: ProviderConfig[]
  canvas: {
    snapToGrid: boolean
    animateLayout: boolean
    defaultZoom: number
  }
}
