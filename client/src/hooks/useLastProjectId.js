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

/** Remove stored “last project” if it was deleted so sidebar/board links don’t 404. */
export function clearLastProjectIdIfMatch(projectId) {
  if (!projectId) return
  try {
    const cur = sessionStorage.getItem(KEY)
    if (cur && String(cur) === String(projectId)) {
      sessionStorage.removeItem(KEY)
    }
  } catch {
    /* ignore */
  }
}

export function getLastProjectId() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
