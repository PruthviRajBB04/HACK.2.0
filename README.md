# MineSaksham

MineSaksham is a Phase 1 prototype for AI-powered governance and compliance intelligence across coal mining operations in India. It provides a professional landing experience, provider-ready authentication interfaces, temporary role-based Demo Mode, and a responsive governance dashboard backed by centralized synthetic data.

This is a Smart India Hackathon prototype and is not presented as an official government platform.

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Tailwind CSS 4
- Lucide icons
- Netlify deployment adapter

## Included Workflows

- Landing, sign in, registration request, and password reset interfaces
- Temporary Demo Mode with five selectable roles
- Role-aware desktop and mobile navigation
- Dashboard, mines, mine details, compliance, notifications, and profile pages
- Honest planned-feature states for future modules
- Centralized configuration, domain types, demo records, and authentication service contract

## Local Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

The standard development server runs on port 3000. Netlify feature emulation can be started with:

```bash
netlify dev --port 8889
```

## Environment

Phase 1 requires no secrets or external service credentials. Copy `.env.example` when future integrations are introduced and configure real values through Netlify environment variables rather than source files.

## Extending the Foundation

Keep organization-owned values out of page components. Add replaceable records through the data or service layer, preserve the shared domain types, and implement future modules behind the existing application shell and route structure.
