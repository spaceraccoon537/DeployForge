import { useEffect, useState } from 'react'
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LogViewer from '../components/LogViewer'
import StatusBadge from '../components/StatusBadge'
import { getDeployment, rollbackDeployment } from '../services/api'
import { formatDate } from '../services/format'
import type { Deployment } from '../types/deployment'

const activeStatuses = new Set(['QUEUED', 'CLONING', 'BUILDING', 'DEPLOYING', 'HEALTH_CHECK', 'STOPPING'])
const pipelineStages = [
  { label: 'Clone', stage: 'CLONE' },
  { label: 'Build', stage: 'BUILD' },
  { label: 'Deploy', stage: 'DEPLOY' },
  { label: 'Health check', stage: 'HEALTH_CHECK' },
  { label: 'Live', stage: 'LIVE' },
]

function formatDuration(seconds?: number | null) {
  if (seconds == null) return 'In progress'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`
}

export default function DeploymentDetails() {
  const { deploymentId } = useParams()
  const navigate = useNavigate()
  const [deployment, setDeployment] = useState<Deployment | null>(null)
  const [error, setError] = useState('')
  const [rollingBack, setRollingBack] = useState(false)

  useEffect(() => {
    if (!deploymentId) return
    let cancelled = false
    let timer: number | undefined
    async function poll() {
      try {
        const result = await getDeployment(deploymentId!)
        if (cancelled) return
        setDeployment(result)
        setError('')
        if (activeStatuses.has(result.status)) timer = window.setTimeout(poll, 2000)
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Could not load deployment')
        timer = window.setTimeout(poll, 5000)
      }
    }
    void poll()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [deploymentId])

  async function handleRollback() {
    if (!deployment) return
    setRollingBack(true)
    setError('')
    try {
      const result = await rollbackDeployment(deployment.id)
      navigate(`/deployments/${result.deploymentId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rollback failed')
    } finally {
      setRollingBack(false)
    }
  }

  if (!deployment) return error ? <div className="error-state" role="alert">{error}</div> : <div className="loading-state">Loading deployment...</div>

  const live = deployment.active_deployment_id === deployment.id
  const running = activeStatuses.has(deployment.status)
  const failed = deployment.status === 'FAILED'
  const currentIndex = pipelineStages.findIndex((item) => item.stage === deployment.stage)

  return (
    <>
      <Link className="detail-back" to={`/projects/${deployment.project_id}`}><ArrowLeft size={14} /> {deployment.project_name || 'Project'}</Link>
      <div className="page-heading">
        <div className="detail-title"><span className="eyebrow">DEPLOYMENT / RUN #{deployment.deployment_number}</span><div className="detail-title-row"><h2>Deployment #{deployment.deployment_number}</h2><StatusBadge status={deployment.status} live={live} /></div></div>
        {live && deployment.status === 'SUCCESS' && <button className="button button-danger" onClick={handleRollback} disabled={rollingBack}><RotateCcw size={14} />{rollingBack ? 'Rolling back...' : 'Rollback'}</button>}
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <div className="deployment-summary">
        <div className="overview-cell"><label>Commit</label><strong>{deployment.commit_hash?.slice(0, 12) || 'Not available'}</strong></div>
        <div className="overview-cell"><label>Duration</label><strong>{formatDuration(deployment.duration)}</strong></div>
        <div className="overview-cell"><label>Started</label><strong>{formatDate(deployment.started_at || deployment.created_at)}</strong></div>
        <div className="overview-cell"><label>Container</label><strong>{deployment.container_name || 'Pending'}</strong></div>
        <div className="overview-cell"><label>Port</label><strong>{deployment.port ? `:${deployment.port}` : 'Pending'}</strong></div>
        <div className="overview-cell"><label>Project</label><Link to={`/projects/${deployment.project_id}`}>{deployment.project_name || 'Open project'}</Link></div>
      </div>
      <div className="section-heading"><h3>Pipeline</h3><span className="eyebrow">{deployment.stage || deployment.status}</span></div>
      <div className="pipeline">
        {pipelineStages.map((item, index) => {
          const complete = !failed && (deployment.status === 'SUCCESS' || currentIndex > index)
          const current = !failed && running && currentIndex === index
          const stepFailed = failed && (currentIndex === index || (currentIndex < 0 && index === 0))
          const icon = stepFailed ? <X size={12} /> : complete ? <Check size={12} /> : index + 1
          return <div className={`pipeline-step${complete ? ' complete' : ''}${current ? ' current' : ''}${stepFailed ? ' failed' : ''}`} key={item.stage}>
            <span className="pipeline-icon">{icon}</span><span>{item.label}</span>
          </div>
        })}
      </div>
      <div className="section-heading"><h3>Logs</h3>{running && <span className="eyebrow">REFRESHES EVERY 2 SECONDS</span>}</div>
      <LogViewer logs={deployment.logs} live={running} />
    </>
  )
}