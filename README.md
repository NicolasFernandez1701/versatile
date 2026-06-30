# Versatile

Plataforma SaaS/B2B para gestión integral de gimnasios, academias y centros de entrenamiento.

Centraliza administración de usuarios (alumnos, profesores), grilla de clases, control de asistencia, facturación y gestión de planes con cupos por actividad.

## Stack

- **Frontend:** React 19 + TypeScript 6 (strict) + Vite 8
- **Estado:** Zustand 5
- **Routing:** React Router DOM 7
- **Backend:** Supabase (PostgreSQL + Auth)
- **Estilos:** Vanilla CSS con custom properties (sin frameworks)
- **Testing:** Vitest 4 + React Testing Library (Strict TDD)

## Arquitectura

Screaming Architecture por features con Clean Architecture:

```
src/
├── core/           # Lógica fundacional
│   ├── services/   # Capa de acceso a datos (Supabase)
│   ├── store/      # Estado global (Zustand)
│   ├── hooks/      # Hooks reutilizables
│   ├── types/      # Interfaces y tipos
│   └── utils/      # Utilidades puras (quotaTracker, paymentCalculator)
├── components/ui/  # Sistema de diseño (Botones, Modales, Inputs)
├── features/       # Componentes de dominio (PlanForm, LoginForm)
└── pages/          # Vistas ruteables por rol (admin, student, teacher)
```

## Documentación

| Documento | Para quién |
|-----------|------------|
| [`BUSINESS_RULES.md`](./BUSINESS_RULES.md) | Dueños de negocio, Product Managers — reglas comerciales y decisiones de dominio |
| [`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md) | Arquitectos, Tech Leads — ADRs, modelo de datos, stack |
| [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) | Desarrolladores — filosofía de código, servicios, testing |
| [`AGENTS.md`](./AGENTS.md) | AI Agents — reglas de code review automatizado |

## Desarrollo

```bash
npm install
npm run dev        # Desarrollo
npm test           # Tests (Vitest)
npx tsc --noEmit   # Type check
```
