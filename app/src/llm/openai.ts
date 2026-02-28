import type { LLMProvider } from './provider'
import type { LLMRequest, LLMResponse } from './types'
import { readSSE } from './stream'

export class OpenAIProvider implements LLMProvider {
  readonly type = 'openai' as const
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl?: string | null) {
    this.apiKey = apiKey
    this.baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, false)),
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return {
      content: data.choices[0].message.content ?? '',
      finishReason: data.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    }
  }

  async chatStream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, true)),
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`)

    let content = ''
    let finishReason: LLMResponse['finishReason'] = 'stop'
    let usage: LLMResponse['usage'] | undefined

    await readSSE(res, (event: unknown) => {
      const chunk = event as Record<string, any>
      const delta = chunk.choices?.[0]?.delta
      if (delta?.content) {
        content += delta.content
        onChunk(delta.content)
      }
      const fr = chunk.choices?.[0]?.finish_reason
      if (fr) finishReason = fr === 'stop' ? 'stop' : 'length'
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        }
      }
    })

    return { content, finishReason, usage }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
    const data = await res.json()
    return data.data
      .filter((m: { id: string }) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4'))
      .map((m: { id: string }) => m.id)
      .sort()
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }
  }

  private buildBody(request: LLMRequest, stream: boolean) {
    const messages: { role: string; content: string }[] = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content })
    }
    return {
      model: request.model,
      messages,
      stream,
      ...(stream && { stream_options: { include_usage: true } }),
      ...(request.temperature != null && { temperature: request.temperature }),
      ...(request.maxTokens != null && { max_tokens: request.maxTokens }),
    }
  }
}
