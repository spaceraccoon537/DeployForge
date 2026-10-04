import { useEffect, useState } from 'react'
import ProjectCard from '../components/ProjectCard'
import { getProjects } from '../services/api'
import type { Project } from '../types/deployment'

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getProjects()
      .then((data) => { if (!cancelled) setProjects(data) })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load projects') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">WORKSPACE / INVENTORY</span><h2>Projects</h2><p>Connected repositories and deployment branches.</p></div>
      </div>
      {error && <div className="error-state" role="alert">{error}</div>}
      {loading ? <div className="loading-state">Loading projects...</div> : error ? null : projects.length ? (
        <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      ) : <div className="empty-state">No projects have been configured yet. Use New project to connect a repository.</div>}
    </>
  )
}