import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/layout/Toast'
import PageHeader from '../components/common/PageHeader'
import { CameraIcon, KeyIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

function getInitials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default function Perfil() {
  const { user, updateUser } = useAuth()
  const { state, dispatch } = useApp()
  const toast = useToast()
  const fileRef = useRef()

  const [pwdForm, setPwdForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const initials = getInitials(user?.nombre)

  // ── Foto de perfil ──────────────────────────────────────────────────────────
  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const foto = ev.target.result
      // Update auth session
      updateUser({ foto })
      // Update in Maestros > Usuarios table
      const userRecord = (state.usuarios || []).find(u => u.email === user?.email)
      if (userRecord) {
        dispatch({ type: 'UPDATE_USUARIO', id: userRecord.id, payload: { foto } })
      }
      toast('Foto de perfil actualizada')
    }
    reader.readAsDataURL(file)
  }

  const quitarFoto = () => {
    updateUser({ foto: null })
    const userRecord = (state.usuarios || []).find(u => u.email === user?.email)
    if (userRecord) dispatch({ type: 'UPDATE_USUARIO', id: userRecord.id, payload: { foto: null } })
    toast('Foto eliminada')
  }

  // ── Cambio de contraseña ────────────────────────────────────────────────────
  const handleCambiarPwd = async () => {
    setPwdError('')
    if (!pwdForm.actual || !pwdForm.nueva || !pwdForm.confirmar) {
      setPwdError('Complete todos los campos'); return
    }
    const userRecord = (state.usuarios || []).find(u => u.email === user?.email)
    const stored = userRecord?.password || user?.password || ''
    if (pwdForm.actual !== stored) {
      setPwdError('La contraseña actual no es correcta'); return
    }
    if (pwdForm.nueva.length < 6) {
      setPwdError('La nueva contraseña debe tener al menos 6 caracteres'); return
    }
    if (pwdForm.nueva !== pwdForm.confirmar) {
      setPwdError('Las contraseñas nuevas no coinciden'); return
    }

    // 1. Actualizar en Supabase Auth (contraseña real)
    if (isSupabaseEnabled && supabase) {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.nueva })
      if (error) { setPwdError('Error al actualizar: ' + error.message); return }
    }

    // 2. Actualizar referencia local (visible en Roles y Permisos)
    updateUser({ password: pwdForm.nueva })
    if (userRecord) {
      dispatch({ type: 'UPDATE_USUARIO', id: userRecord.id, payload: { password: pwdForm.nueva } })
    }

    setPwdForm({ actual: '', nueva: '', confirmar: '' })
    toast('Contraseña actualizada correctamente')
  }

  const setPwd = (k, v) => setPwdForm(p => ({ ...p, [k]: v }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Mi Perfil" subtitle="Gestiona tu foto y contraseña de acceso" />

      {/* Tarjeta de perfil */}
      <div className="card">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-[#1e3a5f] text-white text-2xl font-bold flex items-center justify-center overflow-hidden ring-4 ring-blue-100">
              {user?.foto
                ? <img src={user.foto} alt="avatar" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <button
              onClick={() => fileRef.current.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center hover:bg-[#2a4f7c] transition-colors shadow-md"
              title="Cambiar foto"
            >
              <CameraIcon className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800">{user?.nombre}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">{user?.rol}</span>
          </div>

          {/* Foto actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => fileRef.current.click()} className="btn-secondary text-sm py-1.5">
              {user?.foto ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {user?.foto && (
              <button onClick={quitarFoto} className="btn-danger text-sm py-1.5">
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">Formatos: JPG, PNG. Tamaño máximo: 2MB</p>
      </div>

      {/* Cambio de contraseña */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-[#1e3a5f]" />
          <h3 className="font-semibold text-gray-800">Cambiar Contraseña</h3>
        </div>

        <div className="space-y-3">
          {/* Contraseña actual */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                type={showActual ? 'text' : 'password'}
                className="input pr-10"
                value={pwdForm.actual}
                onChange={e => setPwd('actual', e.target.value)}
                placeholder="Ingresa tu contraseña actual"
              />
              <button type="button" onClick={() => setShowActual(v => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showActual ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNueva ? 'text' : 'password'}
                className="input pr-10"
                value={pwdForm.nueva}
                onChange={e => setPwd('nueva', e.target.value)}
                placeholder="Mínimo 4 caracteres"
              />
              <button type="button" onClick={() => setShowNueva(v => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showNueva ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                className="input pr-10"
                value={pwdForm.confirmar}
                onChange={e => setPwd('confirmar', e.target.value)}
                placeholder="Repite la nueva contraseña"
                onKeyDown={e => e.key === 'Enter' && handleCambiarPwd()}
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showConf ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {pwdError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwdError}</p>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={handleCambiarPwd} className="btn-primary flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />Actualizar contraseña
          </button>
        </div>
      </div>
    </div>
  )
}
