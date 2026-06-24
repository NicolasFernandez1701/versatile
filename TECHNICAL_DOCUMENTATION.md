# Documentación Técnica: Versatile

*Última actualización: Junio 2026*
*Estado: Documentación Viva (En Evolución)*

Versatile es una plataforma integral (SaaS/B2B) orientada a la gestión de gimnasios, academias y centros de entrenamiento. El sistema centraliza la administración de usuarios (alumnos, profesores), la grilla de clases, el control de asistencia y la facturación/comisiones.

---

## 1. Arquitectura Base y Stack Tecnológico

La arquitectura de Versatile se apoya en un stack moderno, priorizando rendimiento, reactividad y una separación clara de responsabilidades.

- **Frontend:** React 19 (con TypeScript).
- **Bundler / Build Tool:** Vite.
- **Enrutamiento:** React Router DOM (v7).
- **Manejo de Estado Global:** Zustand.
- **Backend-as-a-Service (BaaS) & Base de Datos:** Supabase (PostgreSQL + Supabase Auth).
- **Componentes y Estilos:** Diseño propio Mobile-First apoyado en CSS nativo e íconos de `lucide-react`.

### Estructura del Proyecto
El proyecto sigue una arquitectura orientada a "Features" (Funcionalidades) para escalar sin acoplamiento:
- `/src/core`: Lógica fundacional. Contiene servicios (`users.service.ts`, `classes.service.ts`), hooks globales, store de Zustand, y tipos base (`types/`).
- `/src/components/ui`: Sistema de diseño propio (Botones, Modales, Inputs, DataTables).
- `/src/features`: Componentes aislados que resuelven lógicas de negocio transversales (ej. `PlanForm.tsx`, `LoginForm.tsx`).
- `/src/pages`: Las vistas ruteables agrupadas por Rol (`admin`, `student`, `teacher`).

---

## 2. Modelo de Dominio y Base de Datos

Versatile utiliza **Supabase** como núcleo de datos. La filosofía de modelado favorece el rendimiento de lectura (Fast-Reads) por encima de la normalización estricta.

### Entidades Principales
- **Profiles (`profiles`)**: Extiende la tabla nativa de `auth.users` de Supabase. Almacena la data dura de cada usuario y su `role` (`admin`, `teacher`, `student`).
- **Student Details / Teacher Details**: Tablas auxiliares 1-a-1 con `profiles` para almacenar información específica de dominio tras el onboarding (ej. objetivos físicos, especialidades del profesor).
- **Planes (`plans`)**: Catálogo de suscripciones financieras y de acceso que definen el límite de clases por semana y el precio.
- **Clases (`classes`)**: El bloque físico en la grilla del calendario.
- **Inscripciones (`enrollments`)**: La relación NxM entre un Alumno y una Clase (para una fecha específica), gestionando el estado de asistencia (`pending`, `attended`, `absent`, `cancelled`).
- **Transacciones (`transactions`)**: Registro inmutable de cobros, aplicando descuentos, recargos por mora y métodos de pago.

---

## 3. ADRs (Architecture Decision Records)

Se documentan a continuación las decisiones técnicas críticas tomadas durante el desarrollo:

### ADR-001: El Modelo Plano de Grilla (Clases)
**Contexto:** ¿Cómo modelar la entidad "Clase"? (Ej. "Yoga con Karu los Lunes a las 10 AM").
**Decisión:** Se implementó un Modelo Plano (Desnormalizado). La tabla `classes` almacena el nombre de la actividad (`activity_name`) directamente como texto, en lugar de referenciar con una foreign key a una tabla diccionario estricta.
**Justificación:** En sistemas de reservas, el cuello de botella es la velocidad de lectura del calendario. Al guardar el nombre directamente en el bloque horario, evitamos un `JOIN` costoso cada vez que se renderiza la grilla móvil. Además, otorga al administrador libertad comercial para añadir "apellidos" a las clases ("Yoga Relax", "Yoga Power") de forma independiente.

### ADR-002: Parsing Financiero Local (Pesos Argentinos)
**Contexto:** El uso del `<input type="number">` nativo de HTML5 provocaba corrupción de datos en Supabase, ya que el motor norteamericano intercepta el punto (.) de los miles como un separador decimal (Ej. "34.700" se guardaba como 34 pesos con 70 centavos).
**Decisión:** Se descartaron los inputs numéricos nativos para campos financieros. Se utilizan inputs de texto (`<input type="text" inputMode="numeric">`) combinados con un parser de RegEx (`replace(/\./g, '')`) al momento de hacer el Submit.
**Justificación:** Garantiza que el usuario pueda escribir de forma natural para su geografía (AR) sin que el navegador altere la base de datos subyacente. A nivel UI, la visualización se delega siempre a `.toLocaleString('es-AR')`.

### ADR-003: Renderizado de Tablas en Dispositivos Móviles
**Contexto:** Las grillas de datos (`DataTable`) rompen los layouts en pantallas pequeñas.
**Decisión:** Se implementó una arquitectura CSS atómica Mobile-First. En anchos menores a 768px, el `DataTable` colapsa cada fila (`<tr>`) en una tarjeta individual (`display: block`). Se introdujo la clase `.mobile-card-header` para extraer la columna más importante (ej. Nombre del Usuario) y convertirla en el título dinámico de la tarjeta.

---

## 4. Módulos y Roles de la Plataforma

La lógica de negocio está fuertemente dividida por el `role` del usuario activo.

### Módulo: Administrador
- **Finanzas:** Registro manual de cobros, aplicación automática de "Mora" posterior al día 10 del mes, y descuentos dinámicos (15% off en Efectivo).
- **Calendario y Clases:** Vista general de la capacidad del gimnasio. Gestión de comisiones a nivel **Instancia de Clase** (no a nivel profesor individual).
- **ABMs (Alumnos, Profesores, Planes):** Ciclo completo CRUD, con modales que ejecutan `updateUser` para modificación in-situ sin necesidad de recargar la página.

### Módulo: Profesor
- **Dashboard y Asistencia:** Entorno simplificado para visualizar clases asignadas y pasar lista (modificar el estado de los `enrollments` de `pending` a `attended`).

### Módulo: Alumno
- **Autogestión:** Reserva de cupos en clases activas en base a la disponibilidad (`capacity`) y los créditos de su plan actual.

---

## 5. Estándares y Convenciones de Desarrollo

Cualquier nuevo desarrollo debe alinearse a las siguientes convenciones:

1. **Notificaciones UI:** Evitar `alert()` o modales de confirmación invasivos a menos que sea una acción destructiva (Delete). Utilizar el hook global `useAlert()` (`showSuccess`, `showError`) apoyado en el `GlobalAlertProvider`.
2. **Estilos:** Se utiliza Vanilla CSS puro y variables CSS (`var(--primary-color)`). No agregar librerías utility-first (como Tailwind) a menos que se realice una re-arquitectura global.
3. **Manejo de Moneda:** La Base de Datos almacena enteros puros o floats sanitizados. Nunca almacenar el símbolo `$`. El formato siempre es responsabilidad de la capa de Presentación (`toLocaleString`).
4. **Testing:** Todo componente crítico de lógica de negocio (ej. `PlanForm`, `ClassForm`) debe poseer su respectivo `.test.tsx` en Vitest, garantizando que los cálculos financieros y de estado no sufran regresiones.
