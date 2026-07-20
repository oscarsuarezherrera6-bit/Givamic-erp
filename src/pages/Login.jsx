import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { supabase, supabaseAdmin, isSupabaseEnabled } from '../lib/supabase'

export default function Login() {
  const { login } = useAuth()
  const { state } = useApp()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsIOS(ios)
    setInstalled(standalone)
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  // Credenciales por defecto — fallback si localStorage tiene datos viejos
  // Credenciales de demo — solo activas cuando Supabase NO está configurado
  const DEFAULT_USERS = isSupabaseEnabled ? [] : [
    { id: 'u1',  nombre: 'Admin GIVAMIC',                   email: 'admin@givamic.pe',         password: 'admin123',     rol: 'Administrador' },
    { id: 'u2',  nombre: 'Oscar Suarez (Coord. Logística)', email: 'logistica@givamic.pe',     password: 'logistica123', rol: 'Coordinador Logística y Compras' },
    { id: 'u3',  nombre: 'Coord. General',                  email: 'coord.general@givamic.pe', password: 'coordgen123',  rol: 'Coordinador General' },
    { id: 'u4',  nombre: 'Coord. Operaciones',              email: 'coord.ops@givamic.pe',     password: 'coordops123',  rol: 'Coordinador Operaciones' },
    { id: 'u11', nombre: 'Auditor ISO',                     email: 'auditor@givamic.pe',       password: 'auditor123',   rol: 'Auditor' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const emailNorm = form.email.trim().toLowerCase()

    if (isSupabaseEnabled) {
      // Intento 1: Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: form.password,
      })

      if (!authError && data?.user) {
        const meta = data.user?.user_metadata || {}
        // Si el usuario tiene rol en metadata úsalo; si no, busca en state.usuarios
        const usuarioLocal = (state.usuarios || []).find(u => u.email?.toLowerCase() === emailNorm)
        login({
          id: data.user.id,
          email: data.user.email,
          nombre: meta.nombre || usuarioLocal?.nombre || data.user.email,
          rol: meta.rol || usuarioLocal?.rol || 'Visitante',
          jefeDirectoId: usuarioLocal?.jefeDirectoId || null,
          rolERPId: usuarioLocal?.rolERPId || undefined,
          activo: true,
          _supabaseId: data.user.id,
        })
        setLoading(false)
        return
      }

      // Intento 2: Fallback — consultar Supabase directamente (sin depender del estado React)
      let usuarios = []
      try {
        const { data: row } = await supabase.from('app_state').select('data').eq('id', 1).single()
        if (row?.data?.usuarios?.length > 0) usuarios = row.data.usuarios
      } catch {}
      // Si Supabase no tiene datos aún, usar el estado local
      if (usuarios.length === 0) usuarios = state.usuarios || []

      let u = usuarios.find(u => u.email?.toLowerCase() === emailNorm && u.password === form.password)

      if (u) {
        if (u.activo === false) {
          setError('Tu cuenta está desactivada. Contacta al administrador.')
          setLoading(false)
          return
        }
        // Crear en Supabase Auth en segundo plano — próximo login será directo
        if (supabaseAdmin) {
          supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: form.password,
            email_confirm: true,
            user_metadata: { nombre: u.nombre, rol: u.rol },
          }).catch(() => {
            // Si ya existe, actualizar contraseña y metadata
            supabase.auth.admin?.updateUserById?.('', {}).catch(() => {})
          })
        }
        login(u)
      } else {
        setError('Correo o contraseña incorrectos')
      }
    } else {
      // Modo local puro (sin Supabase)
      await new Promise(r => setTimeout(r, 800))
      let u = (state.usuarios || []).find(u => u.email === emailNorm && u.password === form.password)
      if (u && u.activo === false) { setError('Tu cuenta está desactivada. Contacta al administrador.'); setLoading(false); return }
      if (u) login(u)
      else { setError('Correo o contraseña incorrectos'); setLoading(false) }
    }
    setLoading(false)
  }

  const fillDemo = (email, pass) => setForm({ email, password: pass })
  const logoSrc = state.logo || state.config?.logoBase64

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: '#071a20' }}>

      {/* Blob teal — arriba izquierda */}
      <div className="absolute top-0 left-0 w-[480px] h-[480px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(26,175,197,0.38) 0%, transparent 68%)', transform: 'translate(-35%, -35%)' }} />
      {/* Blob verde — abajo derecha */}
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(139,189,120,0.3) 0%, transparent 68%)', transform: 'translate(30%, 30%)' }} />
      {/* Blob azul — centro */}
      <div className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(80,112,168,0.18) 0%, transparent 70%)' }} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6"
             style={{ background: 'rgba(7,26,32,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full"
                 style={{ border: '3px solid rgba(26,175,197,0.15)' }} />
            <div className="absolute inset-0 rounded-full animate-spin"
                 style={{ border: '3px solid transparent', borderTopColor: '#2ABFD5' }} />
            <div className="absolute inset-2 rounded-full animate-spin"
                 style={{ border: '2px solid transparent', borderTopColor: 'rgba(139,189,120,0.5)', animationDuration: '0.65s', animationDirection: 'reverse' }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-base tracking-wide" style={{ color: '#e8f8fa' }}>Verificando acceso</p>
            <p className="text-xs mt-1 tracking-widest" style={{ color: '#2ABFD5' }}>Sistema Integrado de Gestión</p>
          </div>
          <div className="flex gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#2ABFD5', animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#8BBD78', animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#7A9FCC', animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl p-8"
           style={{
             background: 'rgba(255,255,255,0.06)',
             backdropFilter: 'blur(28px)',
             WebkitBackdropFilter: 'blur(28px)',
             border: '1px solid rgba(42,191,213,0.18)',
             boxShadow: '0 32px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)'
           }}>

        {/* Logo / Header */}
        <div className="text-center mb-7">
          {logoSrc ? (
            <img src={logoSrc} alt="Logo GIVAMIC" className="h-24 object-contain mx-auto mb-3" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ background: 'rgba(26,175,197,0.3)', border: '1px solid rgba(42,191,213,0.35)' }}>
              <span className="font-black text-2xl" style={{ color: '#e0f8fb' }}>G</span>
            </div>
          )}
          <h1 className="font-black text-xl tracking-widest" style={{ color: '#e8f8fa' }}>GIVAMIC</h1>
          <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: 'rgba(42,191,213,0.6)' }}>
            Sistema Integrado de Gestión
          </p>
        </div>

        <div className="mb-6" style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(42,191,213,0.25), transparent)' }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                   style={{ color: 'rgba(255,255,255,0.35)' }}>
              Correo electrónico
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'rgba(42,191,213,0.5)' }} />
              <input
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#e8f8fa',
                  caretColor: '#2ABFD5'
                }}
                type="email"
                placeholder="usuario@givamic.pe"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
                onFocus={e => e.target.style.borderColor = 'rgba(42,191,213,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                   style={{ color: 'rgba(255,255,255,0.35)' }}>
              Contraseña
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: 'rgba(42,191,213,0.5)' }} />
              <input
                className="w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#e8f8fa',
                  caretColor: '#2ABFD5'
                }}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
                onFocus={e => e.target.style.borderColor = 'rgba(42,191,213,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                      tabIndex={-1}>
                {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <span className="font-bold">!</span>{error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all mt-2"
            style={{
              background: loading ? 'rgba(26,175,197,0.35)' : 'rgba(26,175,197,0.55)',
              border: '1px solid rgba(42,191,213,0.4)',
              color: '#e0f8fb',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(26,175,197,0.75)' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(26,175,197,0.55)' }}
          >
            {loading ? 'Accediendo...' : 'Ingresar al Sistema'}
          </button>
        </form>


        
        {/* Botón instalar PWA */}
        {!installed && (installPrompt || isIOS) && (
          <div className="mt-4 rounded-xl p-3 text-center"
               style={{ background: 'rgba(42,191,213,0.07)', border: '1px solid rgba(42,191,213,0.2)' }}>
            {installPrompt && (
              <button
                onClick={handleInstall}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(42,191,213,0.2)', color: '#2ABFD5', border: '1px solid rgba(42,191,213,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(42,191,213,0.35)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(42,191,213,0.2)'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Instalar App en este dispositivo
              </button>
            )}
            {isIOS && !installPrompt && (
              <p className="text-xs" style={{ color: 'rgba(42,191,213,0.7)' }}>
                Para instalar en iPhone: toca <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>
              </p>
            )}
          </div>
        )}

        <p className="text-center text-[10px] mt-5" style={{ color: 'rgba(255,255,255,0.15)' }}>
          GIVAMIC &copy; {new Date().getFullYear()} &mdash; Sistema Integrado de Gestión
        </p>
      </div>
    </div>
  )
}
