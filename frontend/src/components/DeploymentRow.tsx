import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { formatDate } from '../services/format'
import type { Deployment } from '../types/deployment'

interface DeploymentRowProps {
  deployment: Deployment
  showProject?: boolean
}

export default function DeploymentRow({ deployment, showProject = false }: DeploymentRowProps) {
  const live = deployment.active_deployment_id === deployment.id
  return (
    <Link className="deployment-row-link" to={`/deployments/${deployment.id}`}>
      <div className={showProject ? 'deployment-table-row' : 'deployment-row'}>
        <div className="deployment-row-main">
          <span className="deployment-number">#{deployment.deployment_number}</span>
          {showProject && <span className="deployment-project">{deployment.project_name}</span>}
        </div>
        {!showProject && <span className="deployment-project">{deployment.commit_hash?.slice(0, 7) || deployment.stage || 'Deployment'}</span>}
        <StatusBadge status={deployment.status} live={live} />
        <div className="deployment-row-end">
          <span className="deployment-date">{formatDate(deployment.created_at || deployment.started_at)}</span>
          {showProject && <span className="deployment-commit">{deployment.commit_hash?.slice(0, 7) || <ArrowUpRight size={13} />}</span>}
        </div>
      </div>
    </Link>
  )
}