import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Rocket } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DeploymentRow from '../components/DeploymentRow'
import StatusBadge from '../components/StatusBadge'
import { deployProject, getProject, getProjectDeployments } from '../services/api'
import type { Deployment, Project } from '../types/deployment'

export default function ProjectDetails() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    Promise.all([getProject(projectId), getProjectDeployments(projectId)])
      .then(([projectData, deploymentData]) => {
        if (cancelled) return
        setProject(projectData)
        setDeployments(deploymentData)
      })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load project') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  async function handleDeploy() {
    if (!projectId) return
    setDeploying(true)
    setError('')
    try {
      const deployment = await deployProject(projectId)
      navigate(`/deployments/${deployment.deploymentId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not queue deployment')
      setDeploying(false)
    }
  }

  if (loading) return <div className="loading-state">Loading project...</div>
  if (error && !project) return <div className="error-state" role="alert">{error}</div>
  if (!project) return <div className="empty-state">Project not found.</div>

  return (
    <>
      <Link className="detail-back" to="/projects"><ArrowLeft size={14} /> All projects</Link>
      <div className="page-heading">
        <div className="detail-title"><span className="eyebrow">PROJECT / OVERVIEW</span><div className="detail-title-row"><h2>{project.name}</h2><StatusBadge status={project.status || 'IDLE'} /></div></div>
        <button className="button button-primary" onClick={handleDeploy} disabled={deploying}>
          <Rocket size={15} />{deploying ? 'Queueing...' : 'Deploy now'}
        </button>
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <div className="project-overview">
        <div className="overview-cell"><label>Repository</label><a href={project.repository_url} target="_blank" rel="noreferrer">{project.repository_url} <ExternalLink size={12} /></a></div>
        <div className="overview-cell"><label>Branch</label><strong>{project.branch || 'main'}</strong></div>
        <div className="overview-cell"><label>Deployments</label><strong>{deployments.length} total</strong></div>
      </div>
      <div className="section-heading"><h3>Deployment history</h3><span className="eyebrow">LATEST FIRST</span></div>
      <div className="deployment-list">
        <div className="deployment-list-header"><span>Release</span><span>Commit / stage</span><span>Status</span><span>Created</span></div>
        {error ? null : deployments.length ? deployments.map((deployment) => (
          <DeploymentRow key={deployment.id} deployment={{ ...deployment, active_deployment_id: project.active_deployment_id }} />
        )) : <div className="empty-state">No deployments yet. Deploy this project to start its history.</div>}
      </div>
    </>
  )
}