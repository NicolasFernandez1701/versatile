# Fixes v1 — Cierre operativo de Versatile

**Estado:** en curso
**Alcance:** solo correcciones. Sin features nuevas. Sin refactor.
**Restricción:** un usuario real en producción. `main` siempre deployada y funcionando.

Regla de cada fix: `rama fix/<cosa>` → preview de Vercel → verificar → merge a `main`.
`npm test && npm run build` verde antes de cada push.

---

## Contexto de los bugs reportados

1. **Onboarding de profesor, paso 3 (Especialidades)** → modal genérico "Error guardando datos".
   Captura: iPhone, `versatile-seven.vercel.app`, paso 3 de 3, "Funcional kids" seleccionada.
2. **No se pueden borrar profesores.** Sí se pueden borrar clases.

---

## T1 — Superficie del error real en onboarding

**Tipo:** bug de diagnóstico (bloquea el T2)
**Archivo:** `src/core/hooks/onboarding/useTeacherOnboarding.ts:106`

**Causa:** `error instanceof Error` es falso para `PostgrestError` (objeto plano de
`postgrest-js`), así que se descarta el mensaje real y se muestra el texto genérico.
Esto es exactamente lo que reporta el usuario: "no sabe cuál es el error".

```ts
showError(error instanceof Error ? error.message : 'Error guardando datos');
```

**Fix:** normalizar el error a un mensaje útil antes de mostrarlo
(`message`, `code`, `details`, `hint`). Aplicar el mismo tratamiento en el resto de
los `catch` de la app que usen el patrón `instanceof Error`.

**Gate:** al reproducir el fallo, el modal muestra el mensaje real de la base
(por ejemplo `null value in column "studio_id"` o `new row violates row-level security policy`).

---

## T2 — Corregir la causa real del fallo de guardado de especialidades

**Tipo:** bug funcional
**Archivo:** `src/core/services/users.service.ts` — `saveTeacherOnboardingDetails`

```ts
const studioId = useAuthStore.getState().current_studio_id;
const { error: detailsError } = await supabase
  .from('teacher_details')
  .insert([{ profile_id: profileId, studio_id: studioId, ...details }]);
```

**Hipótesis, en orden de probabilidad:**

| # | Hipótesis | Verificación |
|---|---|---|
| H1 | `current_studio_id` es `null` porque el profesor todavía no tiene fila en `studio_members`; el insert viola la política `teacher_details_tenant_insert` o el `NOT NULL` de `studio_id` | El mensaje real del T1 lo dice |
| H2 | Reintento del usuario → violación de unicidad en `teacher_details.profile_id` | Código `23505` |
| H3 | `specialties` es `string[]` pero la columna espera otro tipo (`uuid[]` / `text[]` / número) | Código `22P02` |

**Nota:** `current_studio_id` se deriva de `firstMembership?.studio_id`
(`useAuthStore.setUser`), es decir de `studio_members`. Si el profesor no tiene
membership al momento del onboarding, `studio_id` va `undefined` y el insert falla.

**Confirmado contra `database/schema.sql`:**

```sql
CREATE TABLE public.teacher_details (
    profile_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id   UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    address     VARCHAR(255),
    birth_date  DATE,
    specialties UUID[] DEFAULT '{}',
    ...
);
CREATE TABLE public.specialties (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL ...
);
```

- **H1 confirmada como principal candidata**: `studio_id` es `NOT NULL`, así que un
  `current_studio_id` nulo produce `23502`, o `42501` si la política
  `teacher_details_tenant_insert` no encuentra la membership.
- **H3 descartada**: `specialties` es `UUID[]` y el cliente envía los UUID de
  `specialties.id`. El tipo coincide.

**Gate:** un profesor completa el flujo 1→2→3 y llega a `/teacher/dashboard`
con su fila en `teacher_details` y `has_completed_onboarding = true`.

**Depende de:** T1 (sin el mensaje real, se adivina).

**RESUELTO — el diagnóstico real no era ninguna de las tres hipótesis.**

La consulta a producción mostró 7 profesores: 2 con `teacher_details` y
`has_completed_onboarding = true`; 5 con 0 filas y `false`. **Todos con
`memberships = 1`.** Eso descarta H1 (membership ausente), H2 (duplicado) y H3 (tipo).

Causa raíz: **`current_studio_id` quedaba nulo en el cliente por una carrera en la
hidratación del store.** `App.tsx` hacía `setUser((session?.user as AppUser) || null)`
dentro de `onAuthStateChange`. Ese objeto no tiene `memberships`, así que `setUser`
dejaba `current_studio_id = null`. Como ese callback compite con `getCurrentUser()`,
ganaba el último que resolvía: de ahí que funcionara para 2 usuarios y fallara para 5.
El insert enviaba `studio_id: undefined` → `23502`.

```
src/App.tsx                          re-fetch del usuario completo; nunca castear session.user
database/migrations/007_..._rpc.sql  RPC save_teacher_onboarding_details
database/schema.sql                  + la función en "17. RPC FUNCTIONS"
src/core/services/users.service.ts   saveTeacherOnboardingDetails → RPC (sin profileId)
src/core/hooks/onboarding/...        pasa el payload sin user.id
tests                                servicio + cableado actualizados
```

**Dos defensas independientes:** el store ya no pierde las memberships, y el
`studio_id` se deriva en el servidor desde `auth_studio_ids()`, así que aunque el
cliente vuelva a quedar sin estado, el guardado funciona. El RPC además hace upsert:
reintentar es seguro y un fallo parcial ya no deja datos a medias.


---

## T3 — Borrado de profesores: éxito fantasma por RLS

**Tipo:** bug funcional + diseño
**Archivos:** `src/core/services/users.service.ts:232` (`deleteUser`), `src/pages/admin/teachers/TeachersPage.tsx`

**Causa raíz:** `profiles` tiene solo tres políticas: `profiles_select`,
`profiles_update_own`, `profiles_update_admin`. **No existe política `DELETE`.**
RLS bloquea el borrado, PostgREST devuelve **0 filas sin error**, `deleteUser` no
lanza, el store recarga, el profesor sigue en la lista… y la UI muestra
**"Profesor eliminado."**

Resultado: el usuario ve un éxito falso y el profesor nunca desaparece. Clases sí
se borran porque `classes` sí tiene política de `DELETE`.

**Problema adicional de diseño:** borrar el `profiles` no borra el usuario de Auth
(el propio código lo admite en un comentario). Queda un usuario huérfano que puede
volver a entrar y recrear el perfil.

**Opciones:**

| Opción | Qué implica | Riesgo |
|---|---|---|
**Lo que reveló `database/schema.sql` — las FKs ya están preparadas:**

```sql
studio_members.user_id   → profiles(id) ON DELETE CASCADE
teacher_details.profile_id → profiles(id) ON DELETE CASCADE
classes.teacher_id       → profiles(id) ON DELETE SET NULL   -- conserva la clase
commissions.teacher_id   → profiles(id) ON DELETE CASCADE    -- ← borra el historial
```

| Opción | Qué implica | Riesgo |
|---|---|---|
| **A. Baja lógica** (`is_active` en `profiles`) | Migración con columna nueva; filtrar en todas las listas; guarda en el login | Medio. Sin pérdida de datos, pero hay que filtrar en muchos lugares |
| B. Borrado real | Requiere `auth.admin.deleteUser` desde el Worker (service_role). **Sin migración**: las FKs ya hacen el resto | **Alto: borra `commissions`**, que son registros financieros |
| **C. Desvincular del estudio** (borrar la fila de `studio_members`) | Migración con política `DELETE` sobre `studio_members`. RLS quita el acceso porque todo se deriva de la membership. Conserva historial y comisiones | **Bajo** |

**Recomendación: opción C.** Es la que coincide con el texto del modal
("Se desvinculará de sus clases actuales"), no pierde datos financieros, no necesita
columna nueva ni guarda en el login, y el acceso se corta solo por RLS.

**Sub-fix obligatorio en cualquier caso:** dejar de reportar éxito cuando se
afectaron 0 filas (`.delete().select()` y error explícito si no volvió nada).

**Gate:** al confirmar el borrado, el profesor desaparece de la lista, no hay
mensaje de éxito falso, y las clases históricas conservan la referencia sin romperse.

**Implementado (opción C, vía RPC atómico)** — pendiente de aplicar y verificar en producción:

```
database/migrations/006_unlink_studio_member_rpc.sql  NUEVO (RPC, formato 00N)
database/schema.sql                        + unlink_studio_member en "17. RPC FUNCTIONS"
                                             (sin policy DELETE: el RPC es el único camino)
src/core/services/users.service.ts         deleteUser → supabase.rpc('unlink_studio_member')
src/pages/admin/teachers/TeachersPage.tsx  copy "Desvincular" + error real
src/core/services/users.service.test.ts    2 tests (llamada al RPC + propagación del error)
src/pages/admin/teachers/TeachersPage.test.tsx  expectativas actualizadas
```

**Por qué RPC y no una policy DELETE:** la desvinculación tiene que anular
`classes.teacher_id` y borrar la membership **en la misma transacción**. Con la policy
sola quedaba un estado inconsistente: el profesor fuera del staff pero las clases
seguían apuntándole. Se eliminó la policy para que el RPC sea el único camino
(fail closed ante un DELETE directo).

**Nota de seguridad:** `unlink_studio_member` es `SECURITY DEFINER` y, como
`get_financial_balance`, no lleva `GRANT` explícito (queda el EXECUTE por defecto para
`authenticated`). La autorización vive dentro de la función: pertenencia al estudio,
rol admin del llamador y protección del último admin.

Verificación: 80 archivos / 798 tests verdes · build ok · lint 0 errores.

**Orden obligatorio de despliegue:** aplicar la migración 006 en Supabase **antes**
del deploy del cliente. Sin el RPC, el cliente llama a una función inexistente.

---

## T4 — RESUELTO: el borrado de clases destruía historial

```sql
enrollments.class_id  NOT NULL REFERENCES classes(id) ON DELETE CASCADE
commissions.class_id  NOT NULL REFERENCES classes(id) ON DELETE CASCADE
```

Borrar una clase borraba en cascada **todas sus inscripciones** (historial de
asistencia) y **todas sus comisiones** (plata del profesor), sin recuperación. El
diálogo solo decía "esta acción no se puede deshacer" e ignoraba las consecuencias.

Además `classes` ya tenía `is_active BOOLEAN DEFAULT true` y el hook ya exponía
`toggleStatus`, así que el borrado duro era **redundante además de destructivo**.

**Implementado:** `deleteClass` → `deactivateClass` (`UPDATE … SET is_active = false`),
con guard de 0 filas para no repetir el éxito fantasma. El diálogo pasa a
"Desactivar Clase", explica que el historial se conserva y deja de ser destructivo.

---

## T4 — Verificación original

**Tipo:** verificación (no hay bug reportado)
**Motivo:** sirve de patrón de referencia para T3 e informa si `classes` tiene
política `DELETE` y qué pasa con las inscripciones asociadas
(`enrollments` → `classes`).

**Gate:** documentado en este archivo: política existente, comportamiento en cascada
y qué ocurre con las inscripciones.

---

## T5 — Falla silenciosa en el catálogo de especialidades

`createClass`, `createClasses` y `updateClass` hacían el upsert en `specialties`
y **descartaban el resultado**. Si fallaba, la clase se creaba pero la actividad
nunca llegaba al catálogo: el filtro del formulario de clases y la lista de
especialidades del profesor quedaban desincronizados, sin señal.

Peor: dos tests **afirmaban** ese comportamiento como esperado
("debería continuar incluso si el upsert falla").

**Implementado:** helper `upsertActivitySpecialty` que propaga el error. Si el
catálogo no se puede actualizar, la clase no se crea ni se modifica. Los dos tests
se invirtieron para exigir el rechazo.

## Verificación de esquema

```bash
npm run db:verify
```

Comprueba contra el proyecto real que existan los RPC que el cliente llama
(`save_teacher_onboarding_details`, `unlink_studio_member`, `get_financial_balance`).
PostgREST responde `PGRST202` cuando la función no existe, y el script lo detecta:
un archivo de migración commiteado no garantiza que se haya aplicado.

**Correr antes de cada deploy que dependa de una migración nueva.**

Si una función recién creada sigue dando 404: `NOTIFY pgrst, 'reload schema';`

## Fuera de alcance (backlog)

- Cualquier pedido de funcionalidad nueva del usuario.
- Code splitting, breakpoints, variante mobile de `DataTable`.
- Refactor a `platform` / `capabilities` / `modules`.
- Backup y `baseline.sql` — **no es refactor, es seguridad: sigue pendiente y es urgente.**

---

## Definición de terminado de esta etapa

- [ ] Los bugs reportados por el usuario resueltos y verificados por él
- [ ] `npm test` verde
- [ ] `npm run build` verde
- [ ] Todo deployado en `main`
- [ ] `git tag v1-operativo`
- [ ] Lista del usuario vacía → recién ahí se abre `dev`
