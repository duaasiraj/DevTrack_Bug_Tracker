/**
 * Aligns with server/src/controllers/issueController.js
 * - status "closed": only admin | project_manager
 * - developers: only update issues assigned_to them (and thus only those should be editable in UI)
 */

export function canSetClosedStatus(role) {
  return role === 'admin' || role === 'project_manager'
}

export function isDeveloperLikeRestricted(role) {
  return role === 'developer'
}

/** Developers may only see/act on issues assigned to them (frontend guard; backend still enforces updates). */
export function developerCanViewIssue(userId, issue) {
  if (!issue?.assigned_to) return false
  return issue.assigned_to === userId
}

export function canEditIssueFields(user, issue) {
  if (!user || !issue) return false
  if (user.role === 'admin' || user.role === 'project_manager' || user.role === 'tester') return true
  if (user.role === 'developer') {
    return issue.assigned_to === user.user_id
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
