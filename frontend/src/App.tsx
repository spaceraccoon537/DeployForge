import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Sidebar from './components/Sidebar'
import NewProjectDialog from './components/NewProjectDialog'
import Dashboard from './pages/Dashboard'
import DeploymentDetails from './pages/DeploymentDetails'
import Deployments from './pages/Deployments'
import ProjectDetails from './pages/ProjectDetails'
import Projects from './pages/Projects'
import type { Project } from './types/deployment'
import './dashboard.css'

function Workspace() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const title = location.pathname.startsWith('/deployments')
    ? 'Deployments'
    : location.pathname.startsWith('/projects/')
      ? 'Project overview'
      : location.pathname === '/projects'
        ? 'Projects'
        : 'Dashboard'

  function handleCreated(project: Project) {
    setDialogOpen(false)
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="workspace">
      <Sidebar />
      <div className="workspace-main">
        <header className="topbar">
          <div>
            <span className="topbar-kicker">DEPLOYFORGE / WORKSPACE</span>
            <h1>{title}</h1>
          </div>
          <button className="button button-primary" onClick={() => setDialogOpen(true)}>
            <Plus size={17} strokeWidth={2.5} />
            <span>New project</span>
          </button>
        </header>
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
            <Route path="/deployments" element={<Deployments />} />
            <Route path="/deployments/:deploymentId" element={<DeploymentDetails />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      {dialogOpen && (
        <NewProjectDialog onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Workspace />
    </BrowserRouter>
  )
}
