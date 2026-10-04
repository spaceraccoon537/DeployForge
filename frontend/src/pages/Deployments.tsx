import { useEffect, useState } from 'react'
import DeploymentRow from '../components/DeploymentRow'
import { getDeployments } from '../services/api'
import type { Deployment } from '../types/deployment'

export default function Deployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getDeployments()
      .then((data) => { if (!cancelled) setDeployments(data) })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load deployments') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">WORKSPACE / RELEASES</span><h2>Deployments</h2><p>Recent deployment runs across all projects.</p></div></div>
      {error && <div className="error-state" role="alert">{error}</div>}
      <div className="deployment-list">
        <div className="deployment-list-header"><span>Release</span><span>Project</span><span>Status</span><span>Created</span></div>
        {loading ? <div className="loading-state">Loading deployments...</div> : error ? null : deployments.length ? deployments.map((deployment) => (
          <DeploymentRow key={deployment.id} deployment={deployment} showProject />
        )) : <div className="empty-state">No deployments have been created yet.</div>}
      </div>
    </>
  )
}