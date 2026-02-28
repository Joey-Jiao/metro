import type { ProviderConfig, ProviderType } from '../types/provider'

export const PROVIDER_NAMES: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  local: 'Local',
  mock: 'Mock',
}

export const DEFAULT_MODELS: Record<ProviderType, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-20250514'],
  local: ['llama3'],
  mock: ['mock-model'],
}

export const DEFAULT_BASE_URLS: Record<ProviderType, string | null> = {
  openai: null,
  anthropic: null,
  local: 'http://localhost:11434/v1',
  mock: null,
}

export function createDefaultProvider(type: ProviderType, apiKey: string, baseUrl?: string): ProviderConfig {
  return {
    id: crypto.randomUUID(),
    type,
    name: PROVIDER_NAMES[type],
    apiKey,
    baseUrl: baseUrl || DEFAULT_BASE_URLS[type],
    models: DEFAULT_MODELS[type],
  }
}
