import type { ProviderType } from '../types/provider'
import type { LLMRequest, LLMResponse } from './types'

export interface LLMProvider {
  readonly type: ProviderType
  chat(request: LLMRequest): Promise<LLMResponse>
  chatStream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse>
  listModels(): Promise<string[]>
}
