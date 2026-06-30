# Guía para Desarrolladores (Developer Guide)

Este documento es el manual técnico avanzado de Versatile. A diferencia del `TECHNICAL_DOCUMENTATION.md` (que explica *qué* hace el sistema), este documento explica *por qué* el código está escrito de la forma en que lo vas a encontrar. Contiene las justificaciones de las decisiones de arquitectura, los hacks tácticos implementados por rendimiento, y las reglas estrictas de contribución.

Si acabás de clonar el repositorio, **leé esto antes de modificar código crítico**.

---

## 1. Filosofía de Arquitectura y "Hacks" Tácticos

El sistema favorece la velocidad, la usabilidad móvil y el pragmatismo por sobre la pureza teórica. Estas son las decisiones de diseño fundamentales que rigen el repositorio:

### 1.1. Desnormalización Táctica (El "Modelo Plano" de Clases)
Si venís de un trasfondo de SQL estricto, te va a sorprender que la tabla `classes` no tenga una `foreign key` hacia una tabla de `activities`. El campo `activity_name` es un string puro.
* **¿Por qué?** Versatile es, en su núcleo, un motor de reservas. La carga más pesada de la aplicación es renderizar la grilla del calendario con múltiples clases en distintos horarios. Si tuviésemos que hacer `JOIN` con la tabla de `activities` (y potencialmente con la de perfiles de profesores por cada celda del calendario), la latencia de la base de datos se multiplicaría.
* **Beneficio Colateral:** Le permite al administrador crear "spin-offs" de clases (ej. escribir "Yoga Nivel 2" en lugar de "Yoga") sin tener que crear una entidad global en un catálogo maestro.

### 1.2. Parsing Financiero (El infierno de HTML5 y `es-AR`)
**Prohibición Absoluta:** Jamás utilices `<input type="number">` para campos relacionados a dinero o precios.
* **El Problema:** El estándar HTML5 obliga a que los inputs numéricos utilicen el formato estadounidense (el punto `.` denota fracciones decimales). En Argentina (formato `es-AR`), los usuarios tipean `34.700` asumiendo que son "Treinta y cuatro mil setecientos". El navegador intercepta ese input y, silenciosamente, envía al backend el valor float `34.7` (treinta y cuatro con setenta centavos), corrompiendo la base de datos de Supabase.
* **La Solución Implementada:** Todos los formularios financieros (como `PlanForm` o `ClassForm`) utilizan `<input type="text" inputMode="numeric">`. Al momento de hacer submit, aplicamos un parser regex:
  ```typescript
  // Extraído de PlanForm.tsx
  const parsedPrice = Number(price.replace(/\./g, '').replace(/,/g, '.'));
  ```
* **Visualización:** Para renderizar dinero desde la base de datos hacia la UI, se utiliza nativamente `.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Se prohíbe el uso estricto de `.toFixed(2)` ya que rompe la coma decimal.

---

## 2. Capa de Servicios y Algoritmos Transaccionales

Toda interacción con Supabase se encuentra aislada en `/src/core/services`. Las reglas de negocio pesadas residen aquí, no en los componentes de UI.

### 2.1. El Algoritmo de Reservas (`enrollments.service.ts`)
La función `enrollStudent` es el corazón del sistema. Implementa **cuatro** barreras de seguridad antes de insertar en la BD:
1. **Verificación de Cupo por Actividad:** Delega en `quotaTracker.getRemainingQuota()` que calcula los cupos prorrateados por actividad usando `ceil(clases_per_week × 4 × daysRemaining / daysInMonth)`. Si la actividad específica no tiene cupo restante, rechaza la inscripción. A diferencia de la versión anterior (que solo chequeaba un total mensual), ahora se respeta el desglose de `plan_activities`.
2. **Verificación de Cupo Total (fallback):** Como red de seguridad, también verifica que el total consumido entre todas las actividades no supere el límite mensual global.
3. **Control de Capacidad Restrictivo:** Cuenta el número de inscriptos actuales (`count: 'exact', head: true` en Supabase para evitar transferir todo el payload de datos) y lo compara con el campo `capacity` de la clase origen.
4. **Manejo de Condiciones de Carrera:** Delega a la capa de base de datos la protección final. Si falla con el error `23505` de PostgreSQL (Unique Constraint Violation), significa que el alumno intentó reservar la misma clase dos veces de forma simultánea.

### 2.2. Prorrateo y Cambio de Plan (`quotaTracker.ts` + `finances.service.ts`)
El sistema implementa dos utilidades de cálculo puro siguiendo el mismo patrón:
- **`paymentCalculator`** — prorrateo de pagos: `ceil(basePrice × daysRemaining / daysInMonth)` + descuentos + recargos.
- **`quotaTracker`** — prorrateo de cupos: `ceil(clases_per_week × 4 × daysRemaining / daysInMonth)` por actividad, con reconciliación `max(0, newProratedQuota − oldConsumed)`.

Ambas utilidades son **funciones puras** (sin acceso a Supabase). El fetching de datos (historial de pagos, consumos del mes) se hace en hooks o services que las invocan. Esto permite testear las fórmulas de forma aislada con 100% de cobertura.

**Cambio de plan atómico:** `financesService.recordPayment()` acepta un parámetro opcional `planChange: { newPlanId, studentId }`. Si está presente, tras insertar el pago exitosamente, registra el cambio en la tabla `plan_changes` y actualiza `profiles.plan_id` y `plan_expiration_date`. El cambio de plan **siempre requiere pago** — no se puede cambiar el plan desde el `StudentFormModal` (ese modal ahora redirige a Finanzas).

### 2.3. Resiliencia Externa (`holiday.service.ts`)
El sistema de calendario consume `https://api.argentinadatos.com/v1/feriados`.
* **Diseño Fail-Safe:** Si el endpoint del gobierno falla o el usuario no tiene conexión, el servicio intercepta el `catch` y retorna `[]` (un array vacío) en lugar de arrojar una excepción. El gimnasio puede operar ignorando los feriados; no podemos permitir que una API de terceros bloquee el inicio de la aplicación.
* **Transformación:** El JSON externo se mapea a nuestra interfaz `Holiday` en la misma capa de servicio aislando al resto del sistema de cambios en la API gubernamental.

---

## 3. Estado Global vs Local (Zustand)

El proyecto utiliza Zustand en lugar de Redux o Context API por su bajo boilerplate y ausencia de re-renders en cascada.

* **Cuándo usar Zustand (`useUsersStore`, `useAuthStore`):** Para data que se consume en todo el árbol de componentes (ej. Perfil del usuario autenticado, catálogo general de profesores para desplegables de filtros).
* **Cuándo usar React Local State (`useState`):** Para el estado sucio de los ABMs (`ClassForm`, `PlanForm`). La data no debe tocar Zustand hasta que la base de datos haya confirmado la mutación (`await service.update(...)`). Modales de edición reciben `initialData` por `props` y manejan su ciclo de vida independientemente.

---

## 4. Directrices de Testing Automatizado (Vitest)

Versatile está configurado con **Vitest** y **React Testing Library**.

1. **La Regla de Cobertura Crítica:** Cualquier componente que modifique precios (`PlanForm`, `RecordPaymentModal`) o calcule cuotas debe poseer su suite de tests.
2. **Utilities Puras:** `paymentCalculator` y `quotaTracker` son el patrón a seguir para nueva lógica de negocio. Funciones puras sin dependencias externas → 100% testeables. El fetching async se hace en services/hooks que las invocan.
3. **Cuidado con los Inputs:** Dado nuestro parser personalizado para moneda local (ADR-002), es obligación mockear la entrada de datos enviando strings (ej. `fireEvent.change(input, { target: { value: '34.700' } })`) y validando que el servicio reciba enteros crudos (`34700`). Nunca testear enviando `type="number"` a menos que sea un campo estrictamente no-financiero.
4. **Tests de UI con Datalist:** Los componentes que usan `<datalist>` para selección de estudiantes (ej. `RecordPaymentModal`) requieren esperar a que las opciones se carguen asincrónicamente antes de disparar `fireEvent.change`. Usar `waitFor(() => document.querySelector('#datalist-id option'))` para sincronizar.

---

## 5. Mapeo de Errores (Supabase → Usuario)

Los errores de Supabase **nunca** se muestran crudos al usuario. Cada servicio atrapa el error de la DB y la capa de UI lo traduce a un mensaje amigable.

### Errores comunes y su traducción

| Error Supabase | Significado | Mensaje al usuario |
|----------------|-------------|-------------------|
| `23505` (unique violation) | El alumno ya está inscripto en esa clase para esa fecha | "Ya estás registrado en esta clase." |
| `42501` (RLS violation) | Falta `studio_id` en la query o el usuario no tiene permisos | "No tenés permisos para realizar esta acción." |
| `PGRST204` (column not found) | Columna faltante en el schema cache de Supabase | (Error interno — no se muestra al usuario. Verificar migraciones.) |
| `23503` (FK violation) | Referencia a un registro que no existe (ej. plan eliminado) | "El recurso solicitado ya no está disponible." |
| `Network error` | Sin conexión a Supabase | "Error de conexión. Reintentá en unos minutos." |

### Patrón en servicios
```typescript
const { data, error } = await supabase.from('tabla').select();
if (error) throw error; // El componente atrapa en catch y usa showError()
```

Los componentes usan `catch (error: unknown)` con:
```typescript
const message = error instanceof Error ? error.message : 'Error desconocido';
showError('Error al procesar: ' + message);
```

---

## 6. GGA — Code Review Automatizado

El proyecto usa **Gentleman Guardian Angel (GGA)** como pre-commit hook para validar automáticamente cada commit contra las reglas de arquitectura definidas en `AGENTS.md`.

### Qué valida GGA
1. **Aislamiento de Supabase:** Ningún `.tsx` puede importar `supabase` directamente. Todo acceso a datos va por `src/core/services/`.
2. **Cero frameworks CSS:** Prohibido Tailwind, Bootstrap, MUI. Solo Vanilla CSS con `var(--*)`.
3. **Tipos explícitos:** Nada de `any`. Cada prop, estado y respuesta de API debe tener su tipo en `*.types.ts`.
4. **Estado global:** Solo Zustand (`src/core/store/`). Nada de Redux o Context API para datos globales.
5. **Formularios:** Validación cliente antes del submit, estado `loading` para deshabilitar botones.
6. **Supabase Auth:** `profiles.id` se sincroniza vía trigger de Auth. Nunca modificar manualmente.

### Cómo funciona
- Al hacer `git commit`, GGA ejecuta automáticamente (`husky` + `.gga`)
- Si encuentra violaciones, **rechaza el commit** y muestra qué regla se rompió
- Para commits que resuelven violaciones preexistentes, se puede usar `--no-verify` (con aprobación explícita)
- Provider: `opencode:opencode-go/deepseek-v4-flash` (configurado en `.gga`)
