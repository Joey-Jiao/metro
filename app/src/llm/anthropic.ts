import type { LLMProvider } from './provider'
import type { LLMRequest, LLMResponse } from './types'
import { readSSE } from './stream'

function mapStopReason(reason: string | undefined): LLMResponse['finishReason'] {
  if (reason === 'max_tokens') return 'length'
  return 'stop'
}

export class AnthropicProvider implements LLMProvider {
  readonly type = 'anthropic' as const
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl?: string | null) {
    this.apiKey = apiKey
    this.baseUrl = (baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, false)),
    })
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
    const data = await res.json()
    const text = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
    return {
      content: text,
      finishReason: mapStopReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    }
  }

  async chatStream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, true)),
    })
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)

    let content = ''
    let finishReason: LLMResponse['finishReason'] = 'stop'
    let promptTokens = 0
    let completionTokens = 0

    await readSSE(res, (event: unknown) => {
      const data = event as Record<string, any>
      switch (data.type) {
        case 'message_start':
          promptTokens = data.message?.usage?.input_tokens ?? 0
          break
        case 'content_block_delta':
          if (data.delta?.type === 'text_delta') {
            content += data.delta.text
            onChunk(data.delta.text)
          }
          break
        case 'message_delta':
          if (data.delta?.stop_reason) {
            finishReason = mapStopReason(data.delta.stop_reason)
          }
          completionTokens = data.usage?.output_tokens ?? 0
          break
      }
    })

    return {
      content,
      finishReason,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/v1/models`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
    const data = await res.json()
    return data.data.map((m: { id: string }) => m.id).sort()
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }

  private buildBody(request: LLMRequest, stream: boolean) {
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
    return {
      model: request.model,
      messages,
      stream,
      max_tokens: request.maxTokens ?? 4096,
      ...(request.systemPrompt && { system: request.systemPrompt }),
      ...(request.temperature != null && { temperature: request.temperature }),
    }
  }
}
