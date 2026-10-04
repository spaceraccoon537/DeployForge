import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { createProject } from '../services/api'
import type { Project } from '../types/deployment'

interface NewProjectDialogProps {
  onClose: () => void
  onCreated: (project: Project) => void
}

export default function NewProjectDialog({ onClose, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const project = await createProject({ name: name.trim(), repository_url: repositoryUrl.trim(), branch: branch.trim() || 'main' })
      onCreated(project)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <div className="modal-heading">
          <div><span className="eyebrow">PROJECT SETUP</span><h2 id="new-project-title">Add a project</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="project-name">Project name</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="web-app" autoFocus />
          </div>
          <div className="form-field">
            <label htmlFor="repository-url">Repository URL</label>
            <input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} required placeholder="https://github.com/org/repository" />
          </div>
          <div className="form-field">
            <label htmlFor="project-branch">Branch</label>
            <input id="project-branch" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" />
          </div>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}