import type { ProviderConfig } from '../types/provider'
import type { LLMProvider } from './provider'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { LocalProvider } from './local'
import { MockProvider } from './mock'
import { DEFAULT_BASE_URLS } from './defaults'

const instances = new Map<string, LLMProvider>()

export function getProvider(config: ProviderConfig): LLMProvider {
  const cached = instances.get(config.id)
  if (cached) return cached

  let provider: LLMProvider
  switch (config.type) {
    case 'openai':
      provider = new OpenAIProvider(config.apiKey, config.baseUrl)
      break
    case 'anthropic':
      provider = new AnthropicProvider(config.apiKey, config.baseUrl)
      break
    case 'local':
      provider = new LocalProvider(config.baseUrl || DEFAULT_BASE_URLS.local!)
      break
    case 'mock':
      provider = new MockProvider()
      break
    default: {
      const _exhaustive: never = config.type
      throw new Error(`Unknown provider type: ${_exhaustive}`)
    }
  }

  instances.set(config.id, provider)
  return provider
}

export function clearProvider(configId: string): void {
  instances.delete(configId)
}

export function clearAllProviders(): void {
  instances.clear()
}
