import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext()
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/auth/me')
            .then(res => setUser(res.data.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, []) //[] means run once when app starts
    const login = (userData) => setUser(userData)
    const logout = () => {
        api.post('/auth/logout').then(() => setUser(null))
    }
    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAuth() {
    return useContext(AuthContext)
}