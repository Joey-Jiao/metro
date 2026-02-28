export type ProviderType = 'openai' | 'anthropic' | 'local' | 'mock'

export interface ProviderConfig {
  id: string
  type: ProviderType
  name: string
  apiKey: string
  baseUrl: string | null
  models: string[]
}
