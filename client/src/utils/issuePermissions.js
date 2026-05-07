/**
 * Aligns with server/src/controllers/issueController.js
 * - status "closed": only admin | project_manager
 * - developers: update issues assigned to them or that they reported
 */
export function canReopenIssue(user, issue) {
  if (user?.role === 'tester') {
    return issue?.status === 'resolved'
  }
  return false
}
export function canSetClosedStatus(role) {
  return role === 'admin' || role === 'project_manager'
}

export function isDeveloperLikeRestricted(role) {
  return role === 'developer'
}

/** Developers may see issues assigned to them or that they reported (frontend guard; backend still enforces updates). */
export function developerCanViewIssue(userId, issue) {
  if (!issue) return false
  if (issue.reported_by === userId) return true
  if (!issue.assigned_to) return false
  return issue.assigned_to === userId
}

export function canEditIssueFields(user, issue) {
  if (!user || !issue) return false
  if (user.role === 'admin' || user.role === 'project_manager' || user.role === 'tester') return true
  if (user.role === 'developer') {
    return (
      issue.assigned_to === user.user_id || issue.reported_by === user.user_id
    )
  }
  return false
}

export function canAssignIssue(user) {
  return user?.role === 'admin' || user?.role === 'project_manager'
}

/** Status options for dropdowns: hide Closed unless role may set it. */
export function getSelectableStatuses(role, currentStatus) {
  const all = ['open', 'in_progress', 'resolved', 'closed']
  if (canSetClosedStatus(role)) return all
  return all.filter((s) => s !== 'closed' || currentStatus === 'closed')
}
