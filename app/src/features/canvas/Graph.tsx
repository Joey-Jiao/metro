import { onMount, onCleanup, createEffect, createSignal, untrack, Show } from 'solid-js'
import { select, zoom, zoomIdentity } from 'd3'
import { useTree } from '../../stores/tree'
import { buildSegments, type SegmentTree } from '../../lib/segments'
import { computeSegmentLayout, SEGMENT_BAR_WIDTH, LABEL_OFFSET, type CanvasLayout } from '../../lib/layout'
import { SegmentPanel } from './SegmentPanel'

const BAR_RADIUS = 6
const TRUNK_COLOR = '#3b82f6'
const TRUNK_COLOR_DIM = '#1e3a5f'
const BRANCH_COLOR = '#404040'
const BRANCH_COLOR_DIM = '#262626'
const ACTIVE_PATH_COLOR = '#60a5fa'
const EDGE_TRUNK_COLOR = '#404040'
const EDGE_BRANCH_COLOR = '#2a2a2a'

interface Props {
  onNavigateToChat?: (nodeId: string) => void
}

export function Graph(props: Props) {
  let container!: HTMLDivElement
  let svgEl!: SVGSVGElement
  const tree = useTree()
  const [selectedSegmentId, setSelectedSegmentId] = createSignal<string | null>(null)
  const [currentSegmentTree, setCurrentSegmentTree] = createSignal<SegmentTree | null>(null)
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; text: string } | null>(null)

  onMount(() => {
    const svgSelection = select(svgEl)
    const g = svgSelection.select<SVGGElement>('g.canvas-root')

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svgSelection.call(zoomBehavior)

    svgSelection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(container.clientWidth / 2, 60).scale(1),
    )
  })

  createEffect(() => {
    Object.keys(tree.state.nodes)
    tree.state.tree?.id
    tree.state.activeNodeId

    untrack(() => {
      if (!tree.state.tree) return
      const segTree = buildSegments(tree.state.nodes, tree.state.tree.rootNodeId)
      setCurrentSegmentTree(segTree)
      const layout = computeSegmentLayout(segTree)
      const activePath = buildActivePath(segTree, tree.state.activeNodeId)
      renderGraph(layout, segTree, activePath)
    })
  })

  function buildActivePath(segTree: SegmentTree, activeNodeId: string | null): Set<string> {
    const path = new Set<string>()
    if (!activeNodeId) return path
    const segId = segTree.nodeToSegment.get(activeNodeId)
    if (!segId) return path
    let current: string | null = segId
    while (current) {
      path.add(current)
      current = segTree.segmentMap.get(current)?.parentSegmentId ?? null
    }
    return path
  }

  function getFirstUserMessage(segTree: SegmentTree, segmentId: string, maxLen = 50): string | null {
    const seg = segTree.segmentMap.get(segmentId)
    if (!seg) return null
    for (const nid of seg.nodeIds) {
      const node = tree.state.nodes[nid]
      if (node?.role === 'user' && node.content) {
        const text = node.content.slice(0, maxLen)
        return text + (node.content.length > maxLen ? '…' : '')
      }
    }
    return null
  }

  function edgePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
    if (from.x === to.x) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    const dy = to.y - from.y
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy * 0.4}, ${to.x} ${to.y - dy * 0.4}, ${to.x} ${to.y}`
  }

  function renderGraph(layout: CanvasLayout, segTree: SegmentTree, activePath: Set<string>) {
    const g = select(svgEl).select<SVGGElement>('g.canvas-root')
    g.selectAll('*').remove()

    const edgeGroup = g.append('g').attr('class', 'edges')
    for (const edge of layout.edges) {
      const isActive = activePath.has(edge.fromSegmentId) && activePath.has(edge.toSegmentId)

      edgeGroup.append('path')
        .attr('d', edgePath(edge.fromPoint, edge.toPoint))
        .attr('fill', 'none')
        .attr('stroke', isActive ? ACTIVE_PATH_COLOR : edge.isTrunk ? EDGE_TRUNK_COLOR : EDGE_BRANCH_COLOR)
        .attr('stroke-width', isActive ? 2 : edge.isTrunk ? 1.5 : 1)
        .attr('stroke-dasharray', edge.isTrunk || isActive ? 'none' : '4 3')
    }

    const segGroup = g.append('g').attr('class', 'segments')
    for (const sl of layout.segments) {
      const isActive = activePath.has(sl.segmentId)
      const h = sl.yEnd - sl.yStart
      const halfW = SEGMENT_BAR_WIDTH / 2

      const group = segGroup.append('g')
        .attr('transform', `translate(${sl.x - halfW}, ${sl.yStart})`)
        .attr('cursor', 'pointer')
        .on('click', () => setSelectedSegmentId(sl.segmentId))
        .on('mouseenter', function (this: SVGGElement) {
          const bbox = this.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const summary = getFirstUserMessage(segTree, sl.segmentId)
          if (summary) {
            setTooltip({
              x: bbox.right - containerRect.left + 10,
              y: bbox.top - containerRect.top + bbox.height / 2 - 14,
              text: summary,
            })
          }
        })
        .on('mouseleave', () => setTooltip(null))

      const fillColor = isActive ? ACTIVE_PATH_COLOR
        : sl.isTrunk ? TRUNK_COLOR_DIM : BRANCH_COLOR_DIM
      const strokeColor = isActive ? ACTIVE_PATH_COLOR
        : sl.isTrunk ? TRUNK_COLOR : BRANCH_COLOR
      const opacity = isActive ? 1 : sl.isTrunk ? 0.9 : Math.max(0.4, 0.8 - sl.depth * 0.08)

      group.append('rect')
        .attr('width', SEGMENT_BAR_WIDTH)
        .attr('height', h)
        .attr('rx', BAR_RADIUS)
        .attr('ry', BAR_RADIUS)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', isActive ? 2 : 1)
        .attr('opacity', opacity)

      if (sl.segment.childSegmentIds.length > 1) {
        group.append('circle')
          .attr('cx', halfW)
          .attr('cy', 0)
          .attr('r', 3)
          .attr('fill', strokeColor)
      }

      if (sl.segment.childSegmentIds.length === 0) {
        group.append('rect')
          .attr('x', 2)
          .attr('y', h - 3)
          .attr('width', SEGMENT_BAR_WIDTH - 4)
          .attr('height', 3)
          .attr('rx', 1.5)
          .attr('fill', strokeColor)
          .attr('opacity', 0.6)
      }

      if (sl.isTrunk) {
        group.append('text')
          .attr('x', SEGMENT_BAR_WIDTH + 6)
          .attr('y', h / 2 + 3)
          .attr('fill', 'var(--color-text-muted)')
          .attr('font-size', 10)
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .text(`${sl.segment.rounds}r`)
      } else {
        const summary = getFirstUserMessage(segTree, sl.segmentId, 22)
        const label = summary
          ? `${summary} · ${sl.segment.rounds}r`
          : `${sl.segment.rounds}r`
        group.append('text')
          .attr('x', SEGMENT_BAR_WIDTH + LABEL_OFFSET)
          .attr('y', Math.min(12, h / 2 + 3))
          .attr('fill', 'var(--color-text-muted)')
          .attr('font-size', 10)
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .text(label)
      }
    }
  }

  onCleanup(() => {
    select(svgEl).on('.zoom', null)
  })

  const selectedSegment = () => {
    const id = selectedSegmentId()
    const st = currentSegmentTree()
    if (!id || !st) return null
    return st.segmentMap.get(id) ?? null
  }

  function handleNavigateToNode(nodeId: string) {
    tree.setActiveNode(nodeId)
    props.onNavigateToChat?.(nodeId)
  }

  async function handleDeleteBranch(segmentId: string) {
    const segTree = currentSegmentTree()
    if (!segTree) return
    const seg = segTree.segmentMap.get(segmentId)
    if (!seg || !seg.parentSegmentId || seg.isTrunk) return
    setSelectedSegmentId(null)
    await tree.deleteSubtree(seg.nodeIds[0])
  }

  return (
    <div ref={container} class="relative h-full w-full bg-[var(--color-bg)]">
      <svg ref={svgEl} class="h-full w-full">
        <g class="canvas-root" />
      </svg>
      <Show when={tooltip()}>
        {(t) => (
          <div
            class="pointer-events-none absolute z-20 max-w-56 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] shadow-lg"
            style={{ left: `${t().x}px`, top: `${t().y}px` }}
          >
            {t().text}
          </div>
        )}
      </Show>
      <Show when={selectedSegment()}>
        {(seg) => (
          <SegmentPanel
            segment={seg()}
            segmentTree={currentSegmentTree()!}
            onClose={() => setSelectedSegmentId(null)}
            onNavigateToNode={handleNavigateToNode}
            onDeleteBranch={handleDeleteBranch}
          />
        )}
      </Show>
    </div>
  )
}
