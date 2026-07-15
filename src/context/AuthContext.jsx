import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const AuthContext = createContext(null)

function auditEvent(type, payload) {
  try {
    window.dispatchEvent(new CustomEvent('givamic:audit', { detail: { type, payload } }))
  } catch {}
}

function userFromSupabaseSession(session) {
  if (!session?.user) return null
  const meta = session.user.user_metadata || {}
  return {
    id: session.user.id,
    email: session.user.email,
    nombre: meta.nombre || meta.name || session.user.email,
    rol: meta.rol || 'Visitante',
    activo: true,
    _supabaseId: session.user.id,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('givamic_user')) } catch { return null }
  })
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled)

  useEffect(() => {
    if (!isSupabaseEnabled) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = userFromSupabaseSession(session)
      if (u) {
        setUser(u)
        localStorage.setItem('givamic_user', JSON.stringify(u))
      } else {
        setUser(null)
        localStorage.removeItem('givamic_user')
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = userFromSupabaseSession(session)
      setUser(u)
      if (u) localStorage.setItem('givamic_user', JSON.stringify(u))
      else localStorage.removeItem('givamic_user')
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('givamic_user', JSON.stringify(userData))
    auditEvent('USER_LOGIN', { nombre: userData.nombre, rol: userData.rol, email: userData.email })
  }

  const logout = async () => {
    const u = user
    if (isSupabaseEnabled) {
      await supabase.auth.signOut()
    }
    setUser(null)
    localStorage.removeItem('givamic_user')
    if (u) auditEvent('USER_LOGOUT', { nombre: u.nombre, rol: u.rol })
  }

  const updateUser = (fields) => {
    const updated = { ...user, ...fields }
    setUser(updated)
    localStorage.setItem('givamic_user', JSON.stringify(updated))
  }

  const isAdmin          = user?.rol === 'Administrador'
  const isGerencia       = user?.rol === 'Gerencia'
  const isAlmacen        = user?.rol === 'Almacenero' || user?.rol === 'Asistente Almacén'
  const isCoordLogistica = user?.rol === 'Coordinador Logística y Compras' || user?.rol === 'Administrador'
  const isJefeRRHH       = user?.rol === 'Jefe RRHH' || user?.rol === 'Administrador'
  const isAdminEmpresa   = user?.rol === 'Administrador de Empresa' || user?.rol === 'Administrador'
  const isAsistLogistica = user?.rol === 'Asistente Logística'
  const isFacturacion    = user?.rol === 'Facturación'
  const isContador       = user?.rol === 'Contador'
  const isCoordGen       = user?.rol === 'Coordinador General' || user?.rol === 'Administrador'
  const isCoordOps       = user?.rol === 'Coordinador Operaciones'
  const isAuditor        = user?.rol === 'Auditor' || user?.rol === 'Administrador'
  const puedeAtenderREQ  = isAdmin || isCoordLogistica

  return (
    <AuthContext.Provider value={{
      user, login, logout, updateUser, authReady,
      isAdmin, isGerencia, isAlmacen, isContador,
      isCoordGen, isCoordOps, isCoordLogistica, isJefeRRHH,
      isAdminEmpresa, isAsistLogistica, isFacturacion, isAuditor, puedeAtenderREQ,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
