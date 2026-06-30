# Reglas de Negocio — Versatile

*Última actualización: Junio 2026*
*Este documento es la fuente de verdad para todas las decisiones de dominio. Cualquier cambio en reglas de negocio debe reflejarse aquí.*

---

## 1. Planes y Actividades

### 1.1. Estructura de un Plan
Un plan (`plans`) define:
- **Nombre** (ej. "Plan Mensual", "Plan Premium")
- **Precio base mensual** (`price`)
- **Cupos por actividad** (`plan_activities`): desglose de cuántas clases por semana tiene cada actividad (ej. 2 boxeo, 1 yoga, 1 funcional)
- **Estado** (`is_active`): solo los planes activos aparecen en selectores

### 1.2. Cupos Mensuales
Los cupos **no son una bolsa general**. Cada actividad tiene su propio límite independiente:
- Fórmula base: `clases_por_semana × 4` (4 semanas por mes)
- **Mid-month proration:** Si el alumno se inscribe o cambia de plan a mitad de mes, los cupos se prorratean: `ceil(cupo_mensual × días_restantes / días_del_mes)`
- Ejemplo: Plan "2 boxeo + 1 yoga", cambio el día 15 de un mes de 30 días → boxeo: `ceil(8 × 15/30) = 4`, yoga: `ceil(4 × 15/30) = 2`

### 1.3. Reconciliación al Cambiar de Plan
Cuando un alumno cambia de plan a mitad de mes:
- Los cupos ya consumidos bajo el plan anterior **se descuentan** del nuevo plan
- Fórmula: `max(0, cupo_prorrateado_nuevo − consumido_en_el_mes)`
- Si el nuevo plan no incluye una actividad que el alumno ya consumió, esas clases se ignoran (no generan cupo en el nuevo plan)
- Si el nuevo plan incluye una actividad nueva, recibe el cupo prorrateado completo
- **No se permiten cupos negativos**

---

## 2. Pagos y Facturación

### 2.1. Prorrateo de Pagos
El primer pago de un alumno se prorratea según los días restantes del mes:
- Fórmula: `ceil(precio_base × días_restantes / días_del_mes)`
- El resultado se redondea hacia arriba para garantizar al menos 1 peso si queda 1 día

### 2.2. Descuentos y Recargos
| Concepto | Condición | Fórmula |
|----------|-----------|---------|
| Descuento por efectivo | Método de pago = `efectivo` | `-15%` sobre base prorrateada |
| Descuento promocional | `promotion_expiration_date ≥ today` | `-X%` configurable por alumno |
| Recargo por mora | Día del mes > 10 | `+20%` sobre base prorrateada |

Los descuentos y recargos **se aplican en orden**: primero descuentos (efectivo, promo), luego recargo (mora).

### 2.3. Período de Gracia
Los alumnos con pago vencido tienen **10 días de gracia** (del 1 al 10 de cada mes) durante los cuales:
- Pueden seguir anotándose a clases normalmente
- El sistema muestra el badge "Pago Pendiente" pero no bloquea
- A partir del día 11, si no registraron pago, **no pueden anotarse** a nuevas clases

### 2.4. Registro de Pagos
- Todo pago se registra manualmente por el admin desde **Finanzas → Registrar Cobro**
- El modal `RecordPaymentModal` calcula automáticamente el monto prorrateado
- El admin puede sobrescribir el monto manualmente (campo "Override Manual")
- El pago registra: `amount`, `original_amount`, `discount_applied`, `surcharge_applied`, `payment_method`, `is_first_payment`

---

## 3. Cambio de Plan

### 3.1. Regla Fundamental
**Todo cambio de plan requiere el registro de un pago.** No se puede cambiar el plan de un alumno sin pasar por el flujo de cobro.

### 3.2. Flujo
1. Admin va a **Finanzas → Registrar Cobro**
2. Selecciona al alumno
3. Activa el checkbox **"Cambiar plan"**
4. Selecciona el nuevo plan del dropdown
5. El sistema recalcula el monto prorrateado para el nuevo plan
6. Al confirmar, se ejecuta atómicamente:
   - Se registra el pago
   - Se inserta un registro en `plan_changes` (old_plan_id, new_plan_id, changed_at, changed_by, payment_id)
   - Se actualiza `profiles.plan_id` y `plan_expiration_date`

### 3.3. Qué NO se puede hacer
- ❌ Cambiar el plan desde el modal de edición de alumno (`StudentFormModal`). Ese modal solo permite editar datos personales y promociones. El selector de plan fue removido intencionalmente.
- ❌ El alumno no puede cambiar su plan por autoservicio (el botón "Ver Planes" abre WhatsApp)

---

## 4. Reservas y Asistencia

### 4.1. Booking Window
- El alumno puede anotarse a una clase **hasta 1:30 hs antes** del inicio
- Puede cancelar su reserva **hasta 1 hora antes** del inicio
- Estas validaciones se ejecutan en el frontend antes de llamar al servicio

### 4.2. Estados de Asistencia
| Estado | Significado |
|--------|-------------|
| `pending` | El alumno se anotó pero aún no se pasó lista |
| `present` | El profesor marcó asistencia |
| `absent` | El profesor marcó falta |
| `cancelled` | El alumno canceló antes del límite |

### 4.3. Límites de Capacidad
- Cada clase tiene un `capacity`. Si `inscriptos_actuales ≥ capacity`, no se permiten nuevas reservas.
- La verificación se hace con `count: 'exact'` en Supabase para no transferir datos innecesarios.

---

## 5. Usuarios y Roles

### 5.1. Estructura
- **`auth.users`** (Supabase Auth): email, contraseña, metadatos
- **`profiles`**: extiende `auth.users`. Almacena `full_name`, `role` (`admin`, `teacher`, `student`), `plan_id`, `studio_id`
- Sincronización: un trigger de Supabase crea automáticamente el `profile` cuando se registra un usuario en Auth

### 5.2. Roles
| Rol | Acceso |
|-----|--------|
| `admin` | Dashboard administrativo, ABMs, finanzas, calendario |
| `teacher` | Dashboard de profesor, pasar lista |
| `student` | Dashboard de alumno, reservar clases, ver plan y pagos |

### 5.3. Naming
- El `full_name` se almacena en `profiles`
- En el dashboard del alumno, se muestra solo el primer nombre (`firstName = full_name.split(' ')[0]`)
- En listados administrativos, se muestra el `full_name` completo

### 5.4. Multi-Tenant (Studios)
- Cada usuario pertenece a un `studio_id`
- Las queries siempre filtran por `studio_id` para aislar datos entre estudios
- El `studio_id` se obtiene del `useAuthStore` y se inyecta en cada inserción/modificación

### 5.5. Flujo de Onboarding

#### Alumno nuevo
1. El admin crea al alumno desde **Alumnos → Nuevo Alumno** con nombre, email y contraseña inicial (`password123`)
2. El sistema crea el usuario en `auth.users` + `profiles` con `role = 'student'` y el `studio_id` del admin
3. El alumno recibe sus credenciales y accede por primera vez
4. Al ingresar, ve su dashboard con un mensaje "Sin Plan Activo" y la grilla de clases (no puede reservar sin plan)
5. El admin le asigna un plan registrando el primer pago desde **Finanzas → Registrar Cobro**
6. Una vez registrado el pago, el alumno tiene cupos disponibles y puede reservar clases

#### Profesor nuevo
1. El admin crea al profesor desde **Profesores → Nuevo Profesor**
2. El sistema crea el usuario en `auth.users` + `profiles` con `role = 'teacher'`
3. El profesor completa su onboarding (especialidades, datos adicionales)
4. El admin asigna al profesor a clases desde la grilla

#### Contraseña inicial
- Todo usuario nuevo recibe `password123` como contraseña inicial
- El sistema **no obliga** el cambio de contraseña en el primer login (pendiente de implementar)
- El admin es responsable de comunicar las credenciales al usuario

---

## 8. Profesores y Comisiones

### 8.1. Asignación
- Un profesor se asigna a una **instancia de clase** (ej. "Yoga Lunes 10 AM con Karu"), no a una actividad genérica
- La asignación se hace desde el formulario de creación/edición de clase (`ClassForm`)
- Un profesor puede tener múltiples clases asignadas en la grilla

### 8.2. Comisiones
- Las comisiones se gestionan a nivel de **instancia de clase**, no a nivel de profesor global
- El admin configura una comisión por clase (monto fijo o porcentaje)
- **Estado actual:** el modelo de comisiones está definido en el schema (`classes.commission_amount`, `classes.commission_type`) pero la lógica de cálculo y liquidación **no está implementada** en el frontend
- **Pendiente:** dashboard de comisiones para el admin, vista de comisiones para el profesor, lógica de liquidación mensual

---

## 9. Integración de Feriados

- Versatile consume la API pública `https://api.argentinadatos.com/v1/feriados` para obtener los feriados nacionales de Argentina
- **Política de fallback:** Si la API falla (sin conexión, error del servidor), el sistema retorna una lista vacía. El gimnasio puede operar normalmente sin datos de feriados.
- Los feriados se muestran en el calendario del admin y en la grilla de clases
- **No se bloquean reservas** en días feriados — es solo informativo (el gimnasio decide si abre o no)

---

## 10. Moneda y Formato

- **Moneda:** Pesos Argentinos (ARS)
- **Almacenamiento:** Enteros o floats sin formato en Supabase
- **Visualización:** `toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })`
- **Input:** `<input type="text" inputMode="numeric">` con parser que elimina puntos de miles
- **Prohibido:** `<input type="number">` para campos de dinero (corrompe valores en formato `es-AR`)

---

## 11. Historial de Decisiones

| Fecha | Decisión | Ciclo SDD |
|-------|----------|-----------|
| Jun 2026 | Prorrateo de pagos + período de gracia | `mid-month-proration` |
| Jun 2026 | Cupos por actividad + cambio de plan con pago | `mid-month-plan-change` |
| Jun 2026 | Validación de formularios (email, tel, fecha) | `form-validation-improvements` |
| Jun 2026 | Fix de currency ARS + nombre de estudio en navbar | `sprint-3-polish` |
