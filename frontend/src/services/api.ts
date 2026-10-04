import type { Deployment, Project } from '../types/deployment'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export function getProjects() {
  return request<Project[]>('/projects')
}

export function getProject(projectId: string) {
  return request<Project>(`/projects/${projectId}`)
}

export function getProjectDeployments(projectId: string) {
  return request<Deployment[]>(`/projects/${projectId}/deployments`)
}

export function getDeployments() {
  return request<Deployment[]>('/deployments')
}

export function getDeployment(deploymentId: string) {
  return request<Deployment>(`/deployments/${deploymentId}`)
}

export function deployProject(projectId: string) {
  return request<{ deploymentId: string; deploymentNumber: number }>(
    `/deployments/${projectId}/deploy`,
    { method: 'POST' },
  )
}

export function createProject(project: Pick<Project, 'name' | 'repository_url' | 'branch'>) {
  return request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: project.name, repositoryUrl: project.repository_url, branch: project.branch }),
  })
}

export function rollbackDeployment(deploymentId: string) {
  return request<{ deploymentId: string; deploymentNumber: number; status: string }>(
    `/deployments/${deploymentId}/rollback`,
    { method: 'POST' },
  )
}