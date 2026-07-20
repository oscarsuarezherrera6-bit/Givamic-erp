import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { useApp } from './AppContext'

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
  const { state } = useApp()
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

  const rol = user?.rol || ''

  // ── Buscar rolERP configurado para este usuario en Roles y Permisos ──────────
  const rolERP = (state.rolesERP || []).find(r => r.nombre === rol)
  const hasRolERP = !!rolERP && !rolERP.esSuperAdmin

  // puedeHacer: si hay rolERP configurado usa sus permisos; si no, devuelve null
  // (null indica "sin configuración → usar flags de nombre de rol")
  const puedeHacer = (modulo, accion) => {
    if (!user) return false
    if (rol === 'Administrador' || rolERP?.esSuperAdmin) return true
    if (hasRolERP) return !!(rolERP.permisos?.[modulo]?.[accion])
    return null  // sin rolERP configurado → el flag de nombre de rol decide
  }

  // Helper: true si puedeHacer devuelve true O (sin rolERP) si el nombre de rol coincide
  const perm = (modulo, accion, fallbackRoles) => {
    const r = puedeHacer(modulo, accion)
    if (r === true) return true
    if (r === false) return false
    return fallbackRoles.includes(rol)  // r === null → usar fallback
  }

  // ── Flags de rol ─────────────────────────────────────────────────────────────
  const isAdmin          = rol === 'Administrador'
  const isGerencia       = perm('requerimientos', 'aprobar', ['Gerencia'])
  const isAlmacen        = perm('almacen', 'ingresar', ['Almacenero','Asistente Almacén'])
  const isCoordLogistica = perm('requerimientos', 'aprobar', ['Coordinador Logística y Compras','Administrador'])
  const isJefeRRHH       = perm('rrhh', 'editar', ['Jefe RRHH','Administrador'])
  const isRRHH           = perm('rrhh', 'crear', ['Jefe RRHH','Asistente RRHH']) || perm('rrhh', 'editar', ['Jefe RRHH','Asistente RRHH'])
  const isSoma           = perm('epps', 'editar', ['Jefe SOMA/SIG','Asistente SOMA'])
  const isRemu           = isAdmin || isRRHH || rol === 'Gerencia'
  const isAdminEmpresa   = perm('empresas-clientes', 'editar', ['Administrador de Empresa','Administrador'])
  const isAsistLogistica = perm('requerimientos', 'crear', ['Asistente Logística'])
  const isFacturacion    = perm('facturas', 'crear', ['Facturación'])
  const isContador       = perm('cuentas-por-pagar', 'ver', ['Contador'])
  const isCoordGen       = perm('reportes', 'ver', ['Coordinador General','Administrador'])
  const isCoordOps       = perm('requerimientos', 'crear', ['Coordinador Operaciones'])
  const isAuditor        = perm('auditoria', 'ver', ['Auditor','Administrador'])
  const puedeAtenderREQ  = isAdmin || isCoordLogistica

  return (
    <AuthContext.Provider value={{
      user, login, logout, updateUser, authReady,
      isAdmin, isGerencia, isAlmacen, isContador,
      isCoordGen, isCoordOps, isCoordLogistica, isJefeRRHH,
      isAdminEmpresa, isAsistLogistica, isFacturacion, isAuditor, puedeAtenderREQ,
      isRRHH, isSoma, isRemu, puedeHacer,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
