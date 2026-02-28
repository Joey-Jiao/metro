import type { TreeNode } from '../types/model'
import { estimateTokens } from '../llm/context'

export interface Segment {
  id: string
  nodeIds: string[]
  parentSegmentId: string | null
  childSegmentIds: string[]
  rounds: number
  tokenEstimate: number
  timeRange: { start: number; end: number }
  isTrunk: boolean
}

export interface SegmentTree {
  segments: Segment[]
  segmentMap: Map<string, Segment>
  trunkSegmentIds: string[]
  nodeToSegment: Map<string, string>
}

function countRounds(nodes: Record<string, TreeNode>, nodeIds: string[]): number {
  let rounds = 0
  for (const id of nodeIds) {
    if (nodes[id]?.role === 'user') rounds++
  }
  return rounds
}

function computeTokens(nodes: Record<string, TreeNode>, nodeIds: string[]): number {
  let total = 0
  for (const id of nodeIds) {
    const node = nodes[id]
    if (node) total += estimateTokens(node.content)
  }
  return total
}

function computeTimeRange(nodes: Record<string, TreeNode>, nodeIds: string[]): { start: number; end: number } {
  let start = Infinity
  let end = 0
  for (const id of nodeIds) {
    const node = nodes[id]
    if (!node) continue
    if (node.createdAt < start) start = node.createdAt
    if (node.updatedAt > end) end = node.updatedAt
  }
  return { start: start === Infinity ? 0 : start, end }
}

export function buildSegments(nodes: Record<string, TreeNode>, rootId: string): SegmentTree {
  const segments: Segment[] = []
  const segmentMap = new Map<string, Segment>()
  const nodeToSegment = new Map<string, string>()
  let segCounter = 0

  function createSegment(
    startNodeId: string,
    parentSegmentId: string | null,
  ): Segment {
    const id = `seg-${segCounter++}`
    const nodeIds: string[] = []
    let currentId: string | null = startNodeId

    while (currentId) {
      const node: TreeNode | undefined = nodes[currentId]
      if (!node) break
      nodeIds.push(currentId)
      if (node.childIds.length !== 1) break
      currentId = node.childIds[0]
    }

    const segment: Segment = {
      id,
      nodeIds,
      parentSegmentId,
      childSegmentIds: [],
      rounds: countRounds(nodes, nodeIds),
      tokenEstimate: computeTokens(nodes, nodeIds),
      timeRange: computeTimeRange(nodes, nodeIds),
      isTrunk: false,
    }

    segments.push(segment)
    segmentMap.set(id, segment)
    for (const nid of nodeIds) {
      nodeToSegment.set(nid, id)
    }

    const lastNodeId = nodeIds[nodeIds.length - 1]
    const lastNode = nodes[lastNodeId]
    if (lastNode && lastNode.childIds.length > 1) {
      for (const childId of lastNode.childIds) {
        const childSeg = createSegment(childId, id)
        segment.childSegmentIds.push(childSeg.id)
      }
    }

    return segment
  }

  if (!nodes[rootId]) {
    return { segments: [], segmentMap, trunkSegmentIds: [], nodeToSegment }
  }

  createSegment(rootId, null)

  const trunkSegmentIds = findTrunk(segments, segmentMap)
  for (const sid of trunkSegmentIds) {
    segmentMap.get(sid)!.isTrunk = true
  }

  return { segments, segmentMap, trunkSegmentIds, nodeToSegment }
}

function findTrunk(segments: Segment[], segmentMap: Map<string, Segment>): string[] {
  if (segments.length === 0) return []

  const root = segments[0]

  function longestChain(seg: Segment): string[] {
    if (seg.childSegmentIds.length === 0) return [seg.id]

    let best: string[] = []
    let bestNodeCount = 0

    for (const childId of seg.childSegmentIds) {
      const child = segmentMap.get(childId)!
      const chain = longestChain(child)
      const totalNodes = chain.reduce((sum, sid) => sum + segmentMap.get(sid)!.nodeIds.length, 0)
      if (totalNodes > bestNodeCount) {
        best = chain
        bestNodeCount = totalNodes
      }
    }

    return [seg.id, ...best]
  }

  return longestChain(root)
}

export function getCumulativeTokens(segmentTree: SegmentTree, segmentId: string): number {
  let total = 0
  let current: string | null = segmentId
  while (current) {
    const seg = segmentTree.segmentMap.get(current)
    if (!seg) break
    total += seg.tokenEstimate
    current = seg.parentSegmentId
  }
  return total
}

export function getSegmentDepth(segmentTree: SegmentTree, segmentId: string): number {
  let depth = 0
  let current: string | null = segmentTree.segmentMap.get(segmentId)?.parentSegmentId ?? null
  while (current) {
    depth++
    current = segmentTree.segmentMap.get(current)?.parentSegmentId ?? null
  }
  return depth
}
