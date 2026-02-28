import type { MessageRole } from '../types/model'

export interface LLMMessage {
  role: MessageRole
  content: string
}

export interface LLMRequest {
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface LLMResponse {
  content: string
  finishReason: 'stop' | 'length' | 'error'
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
