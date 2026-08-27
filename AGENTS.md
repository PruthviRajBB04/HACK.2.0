# MineSaksham Architecture Guide

## Project Overview

MineSaksham is a responsive governance and compliance monitoring prototype for coal mining operations in India. It uses React 19, TypeScript, TanStack Start, TanStack Router, Tailwind CSS 4, and Netlify deployment tooling.

## Key Directories

- `src/routes/`: File-based public, authentication, and application routes.
- `src/components/`: Reusable interface primitives, navigation, tables, status indicators, and shared layouts.
- `src/config/`: Organization-changeable application configuration, roles, permissions, and navigation rules.
- `src/data/`: Centralized synthetic demonstration records. UI components must not introduce scattered demo data.
- `src/services/`: Provider abstractions, including the Phase 1 authentication contract.
- `src/context/`: Temporary browser session state for Demo Mode.
- `src/types/`: Shared domain interfaces and status unions.

## Conventions

- Keep organization-owned values in configuration or backend records, never in page components.
- Use `demo` prefixes and clear labels for all synthetic records.
- Do not add real-looking employee identities or permanent fake users.
- Add future functionality incrementally behind the existing routes, service contracts, and domain types.
- Use semantic status colors with text labels; never communicate state by color alone.
- Keep route components focused and extract reusable interface patterns into `src/components/`.
- Preserve keyboard focus states, semantic labels, and responsive table overflow behavior.

## Authentication Decision

Phase 1 intentionally does not authenticate users. `src/services/auth.ts` defines the provider-ready contract, while Demo Mode creates a temporary `sessionStorage` session. A future provider such as Supabase can implement the same service interface without redesigning the pages.

## Data Decision

The current dataset is non-persistent demonstration content. Future database integration should replace exports from `src/data/demo.ts` with repository or API calls while preserving the domain interfaces in `src/types/domain.ts`.
