import { Show, createSignal } from 'solid-js'
import { useTree } from '../stores/tree'
import { useProjects } from '../stores/projects'

interface Preset {
  label: string
  depth: number
  branchChance: number
  branchesPerPoint: [number, number]
  branchDepth: [number, number]
}

const presets: Preset[] = [
  { label: 'Linear (20)', depth: 10, branchChance: 0, branchesPerPoint: [0, 0], branchDepth: [0, 0] },
  { label: 'Light branch (40)', depth: 12, branchChance: 0.3, branchesPerPoint: [1, 1], branchDepth: [2, 4] },
  { label: 'Heavy branch (100+)', depth: 15, branchChance: 0.5, branchesPerPoint: [1, 3], branchDepth: [3, 6] },
  { label: 'Deep (200+)', depth: 25, branchChance: 0.4, branchesPerPoint: [1, 2], branchDepth: [4, 8] },
  { label: 'Wide (150+)', depth: 8, branchChance: 0.7, branchesPerPoint: [2, 4], branchDepth: [2, 4] },
]

const userMessages = [
  'What is a binary tree?',
  'How does garbage collection work?',
  'Explain the event loop in JavaScript',
  'What are the SOLID principles?',
  'How do databases handle concurrency?',
  'What is the CAP theorem?',
  'Explain how TLS handshake works',
  'What is the difference between threads and processes?',
  'How does virtual memory work?',
  'What are monads in functional programming?',
  'Can you explain consistent hashing?',
  'How does Raft consensus work?',
  'What is backpressure in streaming systems?',
  'Explain the differences between HTTP/2 and HTTP/3',
  'How do bloom filters work?',
]

const assistantMessages = [
  `A **binary tree** is a hierarchical data structure where each node has at most two children.

For a balanced binary tree with $n$ nodes, the height is $h = \\log_2(n)$, and traversal runs in $O(n)$ time.

\`\`\`python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)
\`\`\`

The number of structurally unique BSTs with $n$ nodes is given by the **Catalan number**: $$C_n = \\frac{1}{n+1}\\binom{2n}{n}$$`,

  `## Garbage Collection

GC automatically reclaims memory no longer referenced by the program. The two main approaches are:

1. **Reference Counting** — each object tracks how many references point to it
2. **Mark-and-Sweep** — traverses the object graph from roots, then frees unmarked objects

> The tradeoff is throughput vs latency. Generational GC amortizes cost by observing that most objects die young.

\`\`\`java
WeakReference<byte[]> ref = new WeakReference<>(new byte[1024 * 1024]);
System.gc();
assert ref.get() == null;
\`\`\`

Pause time for G1 GC is roughly $T_{pause} \\approx \\frac{H_{region}}{R_{copy}}$.`,

  `## The Event Loop

JavaScript uses a **single-threaded** event loop model:

1. Execute synchronous code on the **call stack**
2. When the stack is empty, dequeue from the **microtask queue** (Promises)
3. Then dequeue from the **macrotask queue** (setTimeout, I/O)

\`\`\`typescript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
\`\`\``,

  `## SOLID Principles

| Principle | Description |
|-----------|-------------|
| **S**ingle Responsibility | A class should have one reason to change |
| **O**pen/Closed | Open for extension, closed for modification |
| **L**iskov Substitution | Subtypes must be substitutable for base types |
| **I**nterface Segregation | Prefer small, specific interfaces |
| **D**ependency Inversion | Depend on abstractions, not concretions |`,

  `## CAP Theorem

The **CAP theorem** states that a distributed system can only guarantee **two of three** properties:

- **C**onsistency — every read receives the most recent write
- **A**vailability — every request receives a response
- **P**artition tolerance — system operates despite network partitions

> In practice, partition tolerance is non-negotiable, so the real choice is between **CP** and **AP**.`,
]

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function Toolbox() {
  const tree = useTree()
  const projects = useProjects()
  const [open, setOpen] = createSignal(false)

  async function generate(preset: Preset) {
    let projectId = projects.state.activeProjectId
    if (!projectId) {
      const p = await projects.create('Dev Test')
      projects.setActive(p.id)
      projectId = p.id
    }

    await tree.createTree(projectId, `${preset.label} — ${Date.now()}`)
    const rootId = tree.state.tree!.rootNodeId

    let currentParent = rootId
    const branchPoints: string[] = []

    for (let d = 0; d < preset.depth; d++) {
      const userNode = await tree.addNode(currentParent, 'user', pick(userMessages))
      const assistantNode = await tree.addNode(userNode.id, 'assistant', pick(assistantMessages))
      currentParent = assistantNode.id
      if (Math.random() < preset.branchChance) branchPoints.push(assistantNode.id)
    }

    for (const bpId of branchPoints) {
      const numBranches = randInt(preset.branchesPerPoint[0], preset.branchesPerPoint[1])
      for (let b = 0; b < numBranches; b++) {
        let branchParent = bpId
        const branchLen = randInt(preset.branchDepth[0], preset.branchDepth[1])
        for (let bd = 0; bd < branchLen; bd++) {
          const u = await tree.addNode(branchParent, 'user', pick(userMessages))
          const a = await tree.addNode(u.id, 'assistant', pick(assistantMessages))
          branchParent = a.id
        }
      }
    }

    setOpen(false)
  }

  return (
    <div class="absolute right-3 top-3 z-10">
      <button
        class="flex h-7 w-7 items-center justify-center rounded-md text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        onClick={() => setOpen(!open())}
      >
        ≡
      </button>
      <Show when={open()}>
        <div class="absolute right-0 top-8 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          <div class="px-3 py-1.5 text-[10px] text-[var(--color-text-muted)]">Tree Generator</div>
          {presets.map(p => (
            <button
              class="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              onClick={() => generate(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Show>
    </div>
  )
}
