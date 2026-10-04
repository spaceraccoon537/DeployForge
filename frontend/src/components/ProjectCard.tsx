import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import type { Deployment, Project } from '../types/deployment'

interface ProjectCardProps {
  project: Project
  latestDeployment?: Deployment
}

export default function ProjectCard({ project, latestDeployment }: ProjectCardProps) {
  return (
    <Link className="project-card" to={`/projects/${project.id}`}>
      <div className="project-card-top">
        <h3>{project.name}</h3>
        <StatusBadge status={project.status || 'IDLE'} />
      </div>
      <div className="project-repository">{project.repository_url}</div>
      <div className="project-card-meta">
        <span>Branch: {project.branch || 'main'}</span>
        <span>{latestDeployment ? `Last #${latestDeployment.deployment_number}` : 'No deployments'} <ArrowUpRight size={12} /></span>
      </div>
    </Link>
  )
}