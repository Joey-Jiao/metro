import { Router, Route } from '@solidjs/router'
import { SettingsProvider } from './stores/settings'
import { ProjectsProvider } from './stores/projects'
import { TreeProvider } from './stores/tree'
import { UIProvider } from './stores/ui'
import { Shell } from './layout/Shell'
import { ChatView } from './features/chat/ChatView'
import { CanvasView } from './features/canvas/CanvasView'

export default function App() {
  return (
    <SettingsProvider>
      <ProjectsProvider>
        <TreeProvider>
          <UIProvider>
            <Router root={Shell}>
              <Route path="/" component={ChatView} />
              <Route path="/chat" component={ChatView} />
              <Route path="/canvas" component={CanvasView} />
            </Router>
          </UIProvider>
        </TreeProvider>
      </ProjectsProvider>
    </SettingsProvider>
  )
}
