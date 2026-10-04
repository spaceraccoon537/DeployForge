interface StatusBadgeProps {
  status: string
  live?: boolean
}

export default function StatusBadge({ status, live = false }: StatusBadgeProps) {
  const normalized = live ? 'LIVE' : status.toUpperCase()
  const tone = live || normalized === 'LIVE'
    ? 'live'
    : normalized === 'SUCCESS'
      ? 'success'
      : normalized === 'FAILED'
        ? 'failed'
        : normalized === 'ERROR'
          ? 'error'
          : normalized === 'QUEUED'
            ? 'queued'
            : normalized.toLowerCase()

  return (
    <span className={`status-badge ${tone}`}>
      <span className="status-dot" />
      {normalized.replaceAll('_', ' ')}
    </span>
  )
}