# Spec-Driven Development (SDD) - Versatile

## 1. Visión General

- **Proyecto:** Versatile Studio
- **Objetivo Principal:** Sistema de gestión para estudios/gimnasios chicos (clases, talleres) con costo de infraestructura cercano a cero (Servicios Gratuitos Serverless).
- **Stack Tecnológico:** Web App (PWA Mobile-First) con React, Vite (SPA sin SSR), TypeScript y desplegado en Vercel.

## 2. Dominio y Entidades (Core Business)

- **Perfiles (Roles):** Administrador, Profesor, Alumno.
- **Planes:** Sistemas de pases libres o cupos semanales.
- **Entidades Principales:** Clases, Reservas (Attendances), Finanzas (Pagos), Comisiones de Profesores.

## 3. Arquitectura y Reglas Técnicas

- **Backend / BaaS:** Supabase (Auth + PostgreSQL).
- **Manejo de Estado Global:** Zustand (Stores por feature).
- **UI / Componentes:** CSS Puro (Variables Nativas) para máximo rendimiento. Nada de Tailwind ni frameworks pesados.
- **Navegación:** React Router DOM (Protección por Roles).
- **Estructura:** Screaming Architecture (`features/`, `pages/`, `core/`). Capa de Servicios aislada para interactuar con Supabase.

## 4. Estado Actual de Desarrollo

- [x] Inicializar base del proyecto y repositorio.
- [x] Definir estructura BD completa (schema.sql).
- [x] Configurar sistema de Autenticación y Perfiles.
- [x] Desarrollar Dashboard Administrativo (Profesores, Alumnos, Clases, Finanzas).
- [x] Desarrollar Flujo de Onboarding.
- [x] Desarrollar Portal de Alumnos (Reservas de clases con validación de límite de cupos).
- [x] Despliegue productivo automatizado en Vercel (CI/CD).
- [x] Configurar linter/reglas para GGA.

## 5. Siguientes Pasos

- [ ] Testing de extremo a extremo de las reservas en entorno productivo.
- [ ] Refinamiento UI/UX para versión móvil.
- [ ] Recolección de feedback de usuarios reales.
