import api from './axios'

export async function fetchProjectsForUser(user) {
  if (user?.role === 'admin') {
    try {
      const r = await api.get('/projects/all_projects')
      return Array.isArray(r.data.data) ? r.data.data : []
    } catch {
      return []
    }
  }
  try {
    const r = await api.get('/projects/')
    return Array.isArray(r.data.data) ? r.data.data : []
  } catch (err) {
    if (err.response?.status === 404) return []
    throw err
  }
}
