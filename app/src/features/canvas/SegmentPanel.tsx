import { For, Show } from 'solid-js'
import type { Segment, SegmentTree } from '../../lib/segments'
import { getCumulativeTokens, getSegmentDepth } from '../../lib/segments'
import { useTree } from '../../stores/tree'
import { useSettings } from '../../stores/settings'
import type { TreeNode } from '../../types/model'

interface Props {
  segment: Segment
  segmentTree: SegmentTree
  onClose: () => void
  onNavigateToNode: (nodeId: string) => void
  onDeleteBranch: (segmentId: string) => void
}

const KNOWN_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4': 8_192,
  'gpt-4-turbo': 128_000,
  'claude-sonnet-4-20250514': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
  'claude-3-haiku-20240307': 200_000,
  'llama3': 8_192,
  'mock-model': 128_000,
}

function inferContextWindow(modelId: string | null): number {
  if (!modelId) return 128_000
  if (KNOWN_CONTEXT_WINDOWS[modelId]) return KNOWN_CONTEXT_WINDOWS[modelId]
  if (modelId.includes('claude')) return 200_000
  if (modelId.includes('gpt-4o')) return 128_000
  return 128_000
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function formatTime(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function SegmentPanel(props: Props) {
  const tree = useTree()
  const settings = useSettings()

  const messageNodes = () => {
    const nodes: TreeNode[] = []
    for (const nid of props.segment.nodeIds) {
      const node = tree.state.nodes[nid]
      if (node && node.role !== 'system') nodes.push(node)
    }
    return nodes
  }

  const totalMessages = () => props.segment.nodeIds.length
  const cumulativeTokens = () => getCumulativeTokens(props.segmentTree, props.segment.id)
  const depth = () => getSegmentDepth(props.segmentTree, props.segment.id)
  const duration = () => {
    const { start, end } = props.segment.timeRange
    return end > start ? end - start : 0
  }

  const modelId = () => settings.settings.activeModel?.modelId ?? null
  const contextWindow = () => inferContextWindow(modelId())
  const contextUsage = () => {
    const cumTokens = cumulativeTokens()
    const window = contextWindow()
    return Math.min(100, (cumTokens / window) * 100)
  }

  const positionLabel = () => {
    if (props.segment.isTrunk) return 'Trunk'
    if (!props.segment.parentSegmentId) return 'Root'
    const parent = props.segmentTree.segmentMap.get(props.segment.parentSegmentId)
    if (!parent) return 'Branch'
    const lastParentNodeId = parent.nodeIds[parent.nodeIds.length - 1]
    const lastParentNode = tree.state.nodes[lastParentNodeId]
    const preview = lastParentNode?.content.slice(0, 40) || ''
    return `Branch from: "${preview}${lastParentNode && lastParentNode.content.length > 40 ? '...' : ''}"`
  }

  return (
    <div class="absolute right-0 top-0 z-10 flex h-full w-80 lg:w-[380px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      <div class="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-[var(--color-text)]">{positionLabel()}</div>
        </div>
        <div class="ml-2 flex flex-shrink-0 items-center gap-2">
          <Show when={props.segment.parentSegmentId && !props.segment.isTrunk}>
            <button
              class="text-xs text-red-400/60 hover:text-red-400"
              onClick={() => props.onDeleteBranch(props.segment.id)}
            >
              Delete
            </button>
          </Show>
          <button
            class="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={props.onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <div class="border-b border-[var(--color-border)] px-4 py-3">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <MetaRow label="Rounds" value={String(props.segment.rounds)} />
          <MetaRow label="Messages" value={String(totalMessages())} />
          <MetaRow label="Tokens (seg)" value={formatNumber(props.segment.tokenEstimate)} />
          <MetaRow label="Tokens (cum)" value={formatNumber(cumulativeTokens())} />

          <div class="col-span-2">
            <div class="mb-1 flex justify-between text-[var(--color-text-muted)]">
              <span>Context usage</span>
              <span>{contextUsage().toFixed(1)}%</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
              <div
                class="h-full rounded-full transition-all"
                style={{
                  width: `${contextUsage()}%`,
                  background: contextUsage() > 80 ? 'var(--color-error)' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>

          <MetaRow label="Created" value={formatTime(props.segment.timeRange.start)} />
          <MetaRow label="Last active" value={formatTime(props.segment.timeRange.end)} />
          <MetaRow label="Duration" value={formatDuration(duration())} />
          <MetaRow label="Depth" value={String(depth())} />
          <MetaRow label="Branches" value={String(props.segment.childSegmentIds.length)} />
          <MetaRow label="Model" value={modelId() ?? 'Unknown'} />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-3">
        <div class="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Messages</div>
        <For each={messageNodes()}>
          {(node) => (
            <button
              class="mb-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-left transition-colors hover:border-[var(--color-accent)]"
              onClick={() => props.onNavigateToNode(node.id)}
            >
              <div class="mb-1 text-[10px] font-medium" style={{
                color: node.role === 'user' ? '#93c5fd' : '#c4b5fd',
              }}>
                {node.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div class="line-clamp-3 text-xs leading-relaxed text-[var(--color-text)]" style={{ opacity: 0.85 }}>
                {node.content || '(empty)'}
              </div>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}

function MetaRow(props: { label: string; value: string }) {
  return (
    <div class="flex justify-between">
      <span class="text-[var(--color-text-muted)]">{props.label}</span>
      <span class="text-[var(--color-text)]">{props.value}</span>
    </div>
  )
}
