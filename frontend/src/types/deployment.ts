export interface Project {
  id: string
  name: string
  repository_url: string
  branch: string
  status: string
  active_deployment_id?: string | null
  created_at?: string
}

export interface Deployment {
  id: string
  project_id: string
  deployment_number: number
  status: string
  stage?: string | null
  logs?: string | null
  container_name?: string | null
  port?: number | null
  started_at?: string | null
  completed_at?: string | null
  duration?: number | null
  commit_hash?: string | null
  created_at?: string
  project_name?: string
  active_deployment_id?: string | null
}