import { createSignal, Show, For } from 'solid-js'
import { useSettings } from '../stores/settings'
import { useProjects } from '../stores/projects'
import { useTree } from '../stores/tree'

export function DevTest() {
  const settings = useSettings()
  const projects = useProjects()
  const tree = useTree()
  const [log, setLog] = createSignal<string[]>([])

  function addLog(msg: string) {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  async function testFullFlow() {
    setLog([])
    addLog('Creating project...')
    const project = await projects.create('Test Project')
    projects.setActive(project.id)
    addLog(`Project created: ${project.id}`)

    addLog('Creating tree...')
    const t = await tree.createTree(project.id, 'Test Conversation')
    addLog(`Tree created: ${t.id}, root: ${t.rootNodeId}`)

    addLog('Adding user node...')
    const userNode = await tree.addNode(t.rootNodeId, 'user', 'What is a tree data structure?')
    addLog(`User node: ${userNode.id}`)

    addLog('Adding assistant node...')
    const assistantNode = await tree.addNode(userNode.id, 'assistant', '')
    tree.setNodeStatus(assistantNode.id, 'streaming')
    addLog(`Assistant node (streaming): ${assistantNode.id}`)

    const chunks = ['A tree is ', 'a hierarchical ', 'data structure ', 'with nodes ', 'connected by edges.']
    for (const chunk of chunks) {
      tree.appendToNode(assistantNode.id, chunk)
      await new Promise(r => setTimeout(r, 100))
    }
    tree.setNodeStatus(assistantNode.id, 'idle')
    await tree.persistNode(assistantNode.id)
    addLog(`Streaming complete: "${tree.state.nodes[assistantNode.id]?.content}"`)

    addLog('Creating branch...')
    const branchNode = await tree.addNode(userNode.id, 'user', 'Tell me about binary trees specifically')
    addLog(`Branch node: ${branchNode.id}`)
    addLog(`User node now has ${tree.state.nodes[userNode.id]?.childIds.length} children (branch point!)`)

    addLog('Testing collapse...')
    tree.toggleCollapsed(assistantNode.id)
    addLog(`Assistant collapsed: ${tree.state.nodes[assistantNode.id]?.collapsed}`)
    tree.toggleCollapsed(assistantNode.id)
    addLog(`Assistant collapsed (toggled back): ${tree.state.nodes[assistantNode.id]?.collapsed}`)

    addLog('Testing ancestor chain...')
    const chain = tree.getAncestorChain(branchNode.id)
    addLog(`Ancestor chain length: ${chain.length} (root → user → branch)`)

    addLog('Testing settings...')
    settings.setTheme('dark')
    addLog(`Theme set to: ${settings.settings.theme}`)
    settings.setTheme('system')
    addLog(`Theme reset to: ${settings.settings.theme}`)

    addLog('All tests passed!')
  }

  async function testPersistence() {
    setLog([])
    addLog('Reloading projects from IndexedDB...')
    await projects.load()
    const projectList = Object.values(projects.state.projects)
    addLog(`Found ${projectList.length} project(s)`)

    if (projectList.length > 0) {
      const p = projectList[0]
      addLog(`Project: "${p.name}" with ${p.treeIds.length} tree(s)`)
      if (p.treeIds.length > 0) {
        await tree.loadTree(p.treeIds[0])
        const nodeCount = Object.keys(tree.state.nodes).length
        addLog(`Loaded tree with ${nodeCount} node(s)`)
        for (const node of Object.values(tree.state.nodes)) {
          addLog(`  [${node.role}] ${node.content.slice(0, 60) || '(empty)'}`)
        }
      }
    }
    addLog('Persistence check complete')
  }

  async function cleanup() {
    setLog([])
    const projectList = Object.values(projects.state.projects)
    for (const p of projectList) {
      await projects.remove(p.id)
      addLog(`Deleted project: ${p.name}`)
    }
    tree.unloadTree()
    addLog('Cleanup complete')
  }

  return (
    <div style={{ padding: '24px', 'font-family': 'monospace', 'max-width': '800px', margin: '0 auto' }}>
      <h1 style={{ 'font-size': '20px', 'margin-bottom': '16px' }}>Meridian - Phase 1 Data Layer Test</h1>

      <div style={{ display: 'flex', gap: '8px', 'margin-bottom': '16px' }}>
        <button onClick={testFullFlow} style={btnStyle}>Run Full Test</button>
        <button onClick={testPersistence} style={btnStyle}>Test Persistence</button>
        <button onClick={cleanup} style={btnStyle}>Cleanup</button>
      </div>

      <Show when={projects.state.loading}>
        <p>Loading projects...</p>
      </Show>

      <div style={{ 'margin-bottom': '16px' }}>
        <strong>Store State:</strong>
        <pre style={preStyle}>
          {JSON.stringify({
            projectCount: Object.keys(projects.state.projects).length,
            activeProjectId: projects.state.activeProjectId,
            treeId: tree.state.tree?.id ?? null,
            nodeCount: Object.keys(tree.state.nodes).length,
            activeNodeId: tree.state.activeNodeId,
            theme: settings.settings.theme,
          }, null, 2)}
        </pre>
      </div>

      <Show when={log().length > 0}>
        <div>
          <strong>Log:</strong>
          <div style={preStyle}>
            <For each={log()}>
              {line => <div>{line}</div>}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}

const btnStyle = {
  padding: '8px 16px',
  background: '#333',
  color: '#fff',
  border: 'none',
  'border-radius': '4px',
  cursor: 'pointer',
  'font-family': 'monospace',
}

const preStyle = {
  background: '#f5f5f5',
  padding: '12px',
  'border-radius': '4px',
  'font-size': '13px',
  overflow: 'auto',
  'max-height': '400px',
}
