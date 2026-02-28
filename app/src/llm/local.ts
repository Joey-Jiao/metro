import { OpenAIProvider } from './openai'
import type { LLMProvider } from './provider'
import type { LLMRequest, LLMResponse } from './types'

export class LocalProvider implements LLMProvider {
  readonly type = 'local' as const
  private inner: OpenAIProvider
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.inner = new OpenAIProvider('', baseUrl)
  }

  chat(request: LLMRequest): Promise<LLMResponse> {
    return this.inner.chat(request)
  }

  chatStream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    return this.inner.chatStream(request, onChunk)
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/models`)
    if (!res.ok) throw new Error(`Local API error: ${res.status}`)
    const data = await res.json()
    return data.data.map((m: { id: string }) => m.id).sort()
  }
}
