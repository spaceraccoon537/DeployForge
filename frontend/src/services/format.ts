export function formatDate(value?: string | null) {
  if (!value) return 'Pending'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Pending'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}