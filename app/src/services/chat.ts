import type { LLMProvider } from '../llm/provider'
import type { LLMResponse } from '../llm/types'
import type { TreeNode } from '../types/model'
import { buildContextChain } from '../llm/context'

export async function streamResponse(
  provider: LLMProvider,
  modelId: string,
  nodes: Record<string, TreeNode>,
  contextNodeId: string,
  onChunk: (chunk: string) => void,
): Promise<LLMResponse> {
  const messages = buildContextChain(nodes, contextNodeId)
  return provider.chatStream(
    { model: modelId, messages, maxTokens: 4096 },
    onChunk,
  )
}
