/** Matches Postgres enums in server/schema.sql — use these values in API bodies. */
export const ISSUE_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const ISSUE_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const ISSUE_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'task', label: 'Task' },
  { value: 'feature', label: 'Feature' },
]

export function priorityLabel(value) {
  return ISSUE_PRIORITIES.find((p) => p.value === value)?.label ?? value
}

export function statusLabel(value) {
  return ISSUE_STATUSES.find((s) => s.value === value)?.label ?? value
}
