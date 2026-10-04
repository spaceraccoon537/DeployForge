import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import DeploymentRow from '../components/DeploymentRow'
import ProjectCard from '../components/ProjectCard'
import { getDeployments, getProjects } from '../services/api'
import type { Deployment, Project } from '../types/deployment'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjects(), getDeployments()])
      .then(([projectData, deploymentData]) => {
        if (cancelled) return
        setProjects(projectData)
        setDeployments(deploymentData)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load workspace')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const liveCount = projects.filter((project) => project.status === 'LIVE').length
  const latestByProject = new Map<string, Deployment>()
  for (const deployment of deployments) {
    if (!latestByProject.has(deployment.project_id)) latestByProject.set(deployment.project_id, deployment)
  }

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">WORKSPACE / OVERVIEW</span><h2>Ship with confidence.</h2><p>Deployment activity across your projects.</p></div>
        <Link className="text-link" to="/projects">All projects <ArrowRight size={14} /></Link>
      </div>
      {error && <div className="error-state" role="alert">{error}</div>}
      <div className="stat-grid">
        <div className="stat-item"><span className="stat-label">Projects</span><strong className="stat-value">{loading || error ? '—' : projects.length}</strong></div>
        <div className="stat-item"><span className="stat-label">Live projects</span><strong className="stat-value">{loading || error ? '—' : liveCount}</strong></div>
        <div className="stat-item"><span className="stat-label">Deployments</span><strong className="stat-value">{loading || error ? '—' : deployments.length}</strong></div>
      </div>
      <div className="section-heading"><h3>Projects</h3><Link className="text-link" to="/projects">Browse projects <ArrowRight size={14} /></Link></div>
      {loading ? <div className="loading-state">Loading workspace...</div> : error ? null : projects.length ? (
        <div className="project-grid">
          {projects.slice(0, 4).map((project) => <ProjectCard key={project.id} project={project} latestDeployment={latestByProject.get(project.id)} />)}
        </div>
      ) : <div className="empty-state">No projects yet. Add a repository to start your first deployment.</div>}
      <div className="section-heading"><h3>Recent deployments</h3><Link className="text-link" to="/deployments">View all <ArrowRight size={14} /></Link></div>
      <div className="deployment-list">
        <div className="deployment-list-header"><span>Release</span><span>Project</span><span>Status</span><span>Created</span></div>
        {loading ? <div className="loading-state">Loading deployment activity...</div> : error ? null : deployments.length ? deployments.slice(0, 5).map((deployment) => (
          <DeploymentRow key={deployment.id} deployment={deployment} showProject />
        )) : <div className="empty-state">Deployments will appear here when a project is released.</div>}
      </div>
    </>
  )
}