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
La función `enrollStudent` es el corazón del sistema. Implementa tres barreras de seguridad antes de insertar en la BD:
1. **Verificación de Límite Mensual:** En lugar de guardar el cupo mensual en crudo, el sistema cruza la relación `classes_per_week` del plan y lo multiplica por 4 (`classes_per_week * 4`). Si la cuenta de inscripciones del mes en curso supera ese umbral, lanza error.
2. **Control de Capacidad Restrictivo:** Cuenta el número de inscriptos actuales (`count: 'exact', head: true` en Supabase para evitar transferir todo el payload de datos) y lo compara con el campo `capacity` de la clase origen.
3. **Manejo de Condiciones de Carrera:** Delega a la capa de base de datos la protección final. Si falla con el error `23505` de PostgreSQL (Unique Constraint Violation), significa que el alumno intentó reservar la misma clase dos veces de forma simultánea.

### 2.2. Resiliencia Externa (`holiday.service.ts`)
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
2. **Cuidado con los Inputs:** Dado nuestro parser personalizado para moneda local (ADR-002), es obligación mockear la entrada de datos enviando strings (ej. `fireEvent.change(input, { target: { value: '34.700' } })`) y validando que el servicio reciba enteros crudos (`34700`). Nunca testear enviando `type="number"` a menos que sea un campo estrictamente no-financiero.
