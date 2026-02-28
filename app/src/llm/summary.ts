import type { LLMProvider } from './provider'

const SUMMARY_PROMPT = 'Summarize the following message in one concise sentence. Output only the summary, nothing else.'

export async function generateSummary(provider: LLMProvider, model: string, content: string): Promise<string> {
  if (content.length < 100) return content

  const response = await provider.chat({
    model,
    messages: [{ role: 'user', content }],
    systemPrompt: SUMMARY_PROMPT,
    temperature: 0,
    maxTokens: 100,
  })
  return response.content.trim()
}
