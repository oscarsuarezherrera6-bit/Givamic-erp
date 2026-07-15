-- ============================================================
-- GIVAMIC ERP — Migración 002: Crear usuarios en Supabase Auth
-- ============================================================
-- INSTRUCCIONES:
-- Este script NO se puede ejecutar directamente en el SQL Editor normal.
-- Los usuarios de Supabase Auth se crean de dos formas:
--
-- OPCIÓN A (Recomendada): Dashboard manual
--   1. Ve a Authentication → Users → Add User
--   2. Crea cada usuario con su email y contraseña
--   3. Luego ejecuta el bloque UPDATE más abajo para asignar roles
--
-- OPCIÓN B: Script con service_role (ejecutar SOLO desde backend seguro)
--   Requiere SUPABASE_SERVICE_ROLE_KEY (nunca exponer en frontend)
-- ============================================================

-- ── USUARIOS A CREAR EN SUPABASE AUTH ────────────────────────────────────────
--
-- | Email                      | Contraseña sugerida  | Rol                              |
-- |----------------------------|----------------------|----------------------------------|
-- | admin@givamic.pe           | (elige una segura)   | Administrador                    |
-- | logistica@givamic.pe       | (elige una segura)   | Coordinador Logística y Compras  |
-- | coord.general@givamic.pe   | (elige una segura)   | Coordinador General              |
-- | coord.ops@givamic.pe       | (elige una segura)   | Coordinador Operaciones          |
-- | auditor@givamic.pe         | (elige una segura)   | Auditor                          |
--
-- IMPORTANTE: Usa contraseñas distintas a las anteriores (admin123, etc.).
-- Sugerencia: mínimo 12 caracteres, mayúscula + número + símbolo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PASO 2: Asignar roles y nombres en user_metadata ─────────────────────────
-- DESPUÉS de crear los usuarios en el dashboard, ejecuta esto en SQL Editor.
-- Reemplaza cada <UUID-del-usuario> con el ID real de cada usuario creado.
-- Puedes ver los IDs en Authentication → Users.

/*
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"nombre": "Admin GIVAMIC", "rol": "Administrador"}'::jsonb
WHERE email = 'admin@givamic.pe';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"nombre": "Oscar Suarez", "rol": "Coordinador Logística y Compras"}'::jsonb
WHERE email = 'logistica@givamic.pe';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"nombre": "Coord. General", "rol": "Coordinador General"}'::jsonb
WHERE email = 'coord.general@givamic.pe';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"nombre": "Coord. Operaciones", "rol": "Coordinador Operaciones"}'::jsonb
WHERE email = 'coord.ops@givamic.pe';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"nombre": "Auditor ISO", "rol": "Auditor"}'::jsonb
WHERE email = 'auditor@givamic.pe';
*/

-- ── VERIFICAR que los roles quedaron asignados ────────────────────────────────
-- SELECT email, raw_user_meta_data->>'nombre' AS nombre, raw_user_meta_data->>'rol' AS rol
-- FROM auth.users
-- ORDER BY created_at;
