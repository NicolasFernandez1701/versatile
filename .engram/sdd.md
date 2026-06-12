# Spec-Driven Development (SDD) - Versatile

## 1. Visión General
- **Proyecto:** Versatile
- **Objetivo Principal:** Sistema de gestión para estudios/gimnasios chicos (clases, talleres) con costo de infraestructura cercano a cero.
- **Stack Tecnológico:** Web App (PWA Mobile-First) con React, Vite (SPA sin SSR) y TypeScript.

## 2. Dominio y Entidades (Core Business)
*Definición de las reglas de negocio puras, sin depender del framework.*
- **Perfiles (Roles):** Administrador, Profesor, Alumno.
- **Entidades Principales (Borrador):** Clases/Talleres, Reservas, Pagos/Cuotas (a confirmar).

## 3. Arquitectura y Reglas Técnicas
*Reglas inquebrantables del proyecto basadas en el stack actual:*
- **Backend / BaaS:** Supabase (Detectado).
- **Manejo de Estado Global:** Zustand.
- **UI / Componentes:** CSS Puro (Variables Nativas) para máximo rendimiento y control absoluto. Nada de frameworks UI pesados.
- **Navegación:** React Router DOM.
- **Estructura (Patrones):** Screaming Architecture (organización por `features/`). Patrón Container/Presentational para aislar la vista de la lógica. Capa de Servicios aislada para llamadas a Supabase.

## 4. Estado Actual y Siguientes Pasos
- [x] Inicializar estructura de Engram / SDD.
- [ ] Definir el dominio principal con el usuario.
- [ ] Crear la estructura de carpetas base en `src/`.
