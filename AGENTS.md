# Reglas de Code Review para GGA (Gentleman Guardian Angel)

Este archivo define las reglas inquebrantables de arquitectura y código para el proyecto **Versatile**. El Agente (GGA) debe usar estas reglas para revisar cada Pull Request y rechazar cualquier código que las incumpla.

## 1. Arquitectura Limpia y Abstracción (Screaming Architecture)

- **Módulos por Feature:** El código debe estar organizado por dominio/feature bajo `src/pages/{rol}/` (ej. `src/pages/admin/classes`, `src/pages/admin/students`).
- **Separation of Concerns:** Componentes de UI no deben contener lógica de negocio dura ni llamadas directas a APIs. Toda la lógica compleja debe estar abstraída en hooks customizados o en la capa Core.
- **Aislamiento de Supabase (Pattern Enforcements):** NINGÚN componente de React (`.tsx`) tiene permitido importar `supabase` directamente. Utilizar obligatoriamente la capa de servicios (`src/core/services/`) para formatear y limpiar los datos que vienen de la DB antes de inyectarlos en la aplicación.

## 2. Frontend & React Clean Code

- **TypeScript Strictness:** Prohibido usar tipos `any`. Cada prop, estado o respuesta de API debe tener su interfaz o tipo explícito definidos en `*.types.ts`.
- **Performance:** Evitar re-renders innecesarios. Componentes puros o lógica pesada debe estar modularizada correctamente.

## 3. UI y Estilos (Vanilla CSS)

- **Cero Frameworks CSS:** Está ESTRICTAMENTE PROHIBIDO usar TailwindCSS, Bootstrap, MUI o cualquier framework similar.
- **Vanilla CSS:** Todos los estilos deben hacerse con CSS puro usando el sistema de variables de diseño global (`var(--primary-color)`, etc) definido en `src/core/styles/index.css`.

## 4. Estado y Formularios

- **Estado Global:** Usar exclusivamente **Zustand** (`src/core/store/`). Prohibido usar Redux o Context API para estado global de datos.
- **Formularios:** Validar en el cliente antes de enviar. Manejar estados de carga (`loading`) para deshabilitar botones.

## 5. Base de Datos y Autenticación

- **Supabase Auth:** Los usuarios de Auth están sincronizados con la tabla pública `profiles` mediante un trigger. Nunca modificar `profiles.id` directamente sin pasar por Auth.

---

**Instrucción para el Agente GGA:**
Si el PR detecta un componente de UI importando `supabase` directo, o alguien metiendo clases de Tailwind, o usando tipos `any`, RECHAZÁ EL PR de inmediato explicando la regla arquitectónica violada.
