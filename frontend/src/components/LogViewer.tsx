import { Radio } from 'lucide-react'

interface LogViewerProps {
  logs?: string | null
  live?: boolean
}

export default function LogViewer({ logs, live = false }: LogViewerProps) {
  const lines = (logs ?? '').split(/\r?\n/).filter(Boolean)
  return (
    <section className="logs-panel" aria-label="Deployment logs">
      <div className="logs-header">
        <span>BUILD OUTPUT</span>
        {live && <span className="logs-live"><Radio size={12} /> Updating</span>}
      </div>
      <div className="logs-body" aria-live="polite">
        {lines.length ? lines.map((line, index) => (
          <div className="log-line" key={`${index}-${line}`}>
            <span className="log-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="log-content">{line}</span>
          </div>
        )) : <div className="logs-empty">Waiting for deployment output...</div>}
      </div>
    </section>
  )
}