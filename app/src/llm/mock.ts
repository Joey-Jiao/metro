import type { LLMProvider } from './provider'
import type { LLMRequest, LLMResponse } from './types'

const responses = [
  'A tree data structure consists of nodes connected by edges, where each node can have zero or more child nodes. The topmost node is called the root.',
  'That\'s an interesting question. Let me think about it from a few angles.\n\nFirst, consider the fundamental tradeoff between breadth and depth in any exploration. Going deep gives you expertise, going broad gives you context.\n\nSecond, the best approach usually involves iterating: go deep enough to understand, then zoom out to see how it connects.',
  'Here are the key points:\n\n1. Start with the simplest possible implementation\n2. Measure before optimizing\n3. Prefer composition over inheritance\n4. Make illegal states unrepresentable',
  'The short answer is yes, but with caveats.\n\nThe longer answer requires understanding how memory allocation works at the OS level. When you allocate memory, the OS doesn\'t actually give you physical RAM immediately — it creates a virtual mapping that only gets backed by physical pages when you first write to them.',
  'I\'d recommend breaking this into smaller steps:\n\n- First, define your data model clearly\n- Then build the persistence layer\n- Add the business logic on top\n- Finally, wire up the UI\n\nThis way each layer can be tested independently.',
]

export class MockProvider implements LLMProvider {
  readonly type = 'mock' as const

  async chat(_request: LLMRequest): Promise<LLMResponse> {
    const content = responses[Math.floor(Math.random() * responses.length)]
    return {
      content,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: content.length, totalTokens: content.length + 10 },
    }
  }

  async chatStream(_request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    const content = responses[Math.floor(Math.random() * responses.length)]
    const words = content.split(/(?<=\s)/)

    for (const word of words) {
      await new Promise(r => setTimeout(r, 30 + Math.random() * 50))
      onChunk(word)
    }

    return {
      content,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: content.length, totalTokens: content.length + 10 },
    }
  }

  async listModels(): Promise<string[]> {
    return ['mock-model']
  }
}
