-- ============================================================
-- GIVAMIC ERP — Migración 001: Schema principal + RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabla única para el estado completo de la aplicación (JSONB)
-- Un solo registro con id=1 almacena los 43 módulos del ERP.
CREATE TABLE IF NOT EXISTS public.app_state (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Comentario descriptivo
COMMENT ON TABLE public.app_state IS
  'Estado global del ERP GIVAMIC. Un único registro JSON con todos los módulos.';

-- ── Row Level Security ────────────────────────────────────────────────────────
-- CRÍTICO: sin estas políticas cualquier visitante podría leer/escribir los datos.

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden LEER
CREATE POLICY "app_state_select"
  ON public.app_state FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden INSERTAR
CREATE POLICY "app_state_insert"
  ON public.app_state FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden ACTUALIZAR
CREATE POLICY "app_state_update"
  ON public.app_state FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Nadie puede ELIMINAR el registro (ni siquiera autenticados)
-- Para resetear datos hay que hacerlo desde el Dashboard de Supabase.

-- ── Insertar fila inicial vacía ──────────────────────────────────────────────
-- La aplicación React hará un UPSERT sobre id=1.
INSERT INTO public.app_state (id, data)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- ── Índice para búsquedas dentro del JSON (opcional, mejora rendimiento futuro) ──
CREATE INDEX IF NOT EXISTS idx_app_state_updated
  ON public.app_state (updated_at DESC);
