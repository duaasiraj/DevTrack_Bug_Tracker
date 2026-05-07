/** Compact display id (UUIDs are not human-friendly in UI). */
export function formatIssueKey(issueId) {
  if (!issueId) return ''
  const hex = issueId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `DEV-${hex}`
}

export function priorityTone(priority) {
  switch (priority) {
    case 'critical':
      return 'text-red-400'
    case 'high':
      return 'text-orange-400'
    case 'medium':
      return 'text-gray-300'
    case 'low':
    default:
      return 'text-sky-300/90'
  }
}

export function statusColumnColor(status) {
  switch (status) {
    case 'open':
      return 'bg-sky-400'
    case 'in_progress':
      return 'bg-violet-400'
    case 'resolved':
      return 'bg-emerald-400'
    case 'closed':
      return 'bg-gray-500'
    default:
      return 'bg-gray-400'
  }
}
