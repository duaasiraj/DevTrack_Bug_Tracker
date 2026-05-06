const KEY = 'devtrack_last_project_id'

export function setLastProjectId(projectId) {
  if (projectId) {
    try {
      sessionStorage.setItem(KEY, projectId)
    } catch {
      /* ignore */
    }
  }
}

export function getLastProjectId() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
