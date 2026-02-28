import type { SegmentTree, Segment } from './segments'

export interface SegmentLayout {
  segmentId: string
  x: number
  yStart: number
  yEnd: number
  isTrunk: boolean
  segment: Segment
  depth: number
}

export interface SegmentEdge {
  fromSegmentId: string
  toSegmentId: string
  isTrunk: boolean
  fromPoint: { x: number; y: number }
  toPoint: { x: number; y: number }
}

export interface CanvasLayout {
  segments: SegmentLayout[]
  edges: SegmentEdge[]
}

const PX_PER_ROUND = 36
const MIN_SEGMENT_HEIGHT = 24
const SEGMENT_GAP = 14
const MIN_SIBLING_GAP = 40
export const SEGMENT_BAR_WIDTH = 12
export const LABEL_OFFSET = 8
export const LABEL_WIDTH = 130

interface Rect {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface SubtreeResult {
  rects: Rect[]
  layouts: Map<string, SegmentLayout>
}

function segmentHeight(seg: Segment): number {
  return Math.max(MIN_SEGMENT_HEIGHT, seg.rounds * PX_PER_ROUND)
}

function findMinRightShift(existing: Rect[], incoming: Rect[], gap: number): number {
  let shift = 0
  for (const e of existing) {
    for (const n of incoming) {
      if (e.y1 < n.y2 && e.y2 > n.y1) {
        const needed = e.x2 + gap - n.x1
        if (needed > shift) shift = needed
      }
    }
  }
  return shift
}

function mirrorRects(rects: Rect[]): Rect[] {
  return rects.map(r => ({ x1: -r.x2, y1: r.y1, x2: -r.x1, y2: r.y2 }))
}

function offsetRects(rects: Rect[], dx: number): Rect[] {
  return rects.map(r => ({ x1: r.x1 + dx, y1: r.y1, x2: r.x2 + dx, y2: r.y2 }))
}

function buildSegmentRects(seg: Segment, x: number, yStart: number, h: number): Rect[] {
  const half = SEGMENT_BAR_WIDTH / 2
  const rects: Rect[] = [{ x1: x - half, y1: yStart, x2: x + half, y2: yStart + h }]
  if (!seg.isTrunk) {
    rects.push({
      x1: x + half + LABEL_OFFSET,
      y1: yStart,
      x2: x + half + LABEL_OFFSET + LABEL_WIDTH,
      y2: yStart + 16,
    })
  }
  return rects
}

function layoutSubtree(
  seg: Segment,
  yStart: number,
  segmentMap: Map<string, Segment>,
  depth: number,
): SubtreeResult {
  const h = segmentHeight(seg)
  const layouts = new Map<string, SegmentLayout>()

  layouts.set(seg.id, {
    segmentId: seg.id,
    x: 0,
    yStart,
    yEnd: yStart + h,
    isTrunk: seg.isTrunk,
    segment: seg,
    depth,
  })

  const myRects = buildSegmentRects(seg, 0, yStart, h)

  if (seg.childSegmentIds.length === 0) {
    return { rects: myRects, layouts }
  }

  const childYStart = yStart + h + SEGMENT_GAP
  const children = seg.childSegmentIds
    .map(id => {
      const childSeg = segmentMap.get(id)!
      return { seg: childSeg, result: layoutSubtree(childSeg, childYStart, segmentMap, depth + 1) }
    })
    .sort((a, b) => {
      if (a.seg.isTrunk !== b.seg.isTrunk) return a.seg.isTrunk ? -1 : 1
      return b.result.rects.length - a.result.rects.length
    })

  let mergedRects = [...myRects]

  for (const [id, l] of children[0].result.layouts) layouts.set(id, l)
  mergedRects.push(...children[0].result.rects)

  for (let i = 1; i < children.length; i++) {
    const child = children[i]
    const goRight = i % 2 === 1

    let shift: number
    if (goRight) {
      shift = Math.max(MIN_SIBLING_GAP, findMinRightShift(mergedRects, child.result.rects, MIN_SIBLING_GAP))
    } else {
      const rs = findMinRightShift(mirrorRects(mergedRects), mirrorRects(child.result.rects), MIN_SIBLING_GAP)
      shift = -Math.max(MIN_SIBLING_GAP, rs)
    }

    for (const [id, l] of child.result.layouts) {
      l.x += shift
      layouts.set(id, l)
    }
    mergedRects.push(...offsetRects(child.result.rects, shift))
  }

  return { rects: mergedRects, layouts }
}

export function computeSegmentLayout(segmentTree: SegmentTree): CanvasLayout {
  if (segmentTree.segments.length === 0) return { segments: [], edges: [] }

  const rootSeg = segmentTree.segments[0]
  const result = layoutSubtree(rootSeg, 0, segmentTree.segmentMap, 0)

  const trunkLayouts = Array.from(result.layouts.values()).filter(l => l.isTrunk)
  if (trunkLayouts.length > 0) {
    const shift = trunkLayouts.reduce((sum, l) => sum + l.x, 0) / trunkLayouts.length
    for (const l of result.layouts.values()) l.x -= shift
  }

  return {
    segments: Array.from(result.layouts.values()),
    edges: computeEdges(segmentTree, result.layouts),
  }
}

function computeEdges(segmentTree: SegmentTree, layouts: Map<string, SegmentLayout>): SegmentEdge[] {
  const edges: SegmentEdge[] = []
  for (const seg of segmentTree.segments) {
    for (const childId of seg.childSegmentIds) {
      const from = layouts.get(seg.id)
      const to = layouts.get(childId)
      if (!from || !to) continue
      edges.push({
        fromSegmentId: seg.id,
        toSegmentId: childId,
        isTrunk: from.isTrunk && to.isTrunk,
        fromPoint: { x: from.x, y: from.yEnd },
        toPoint: { x: to.x, y: to.yStart },
      })
    }
  }
  return edges
}
