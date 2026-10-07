# Melodix v1

PWA + API FastAPI + Capacitor (Android). **Continúa el trabajo aquí.**

Contrato de producto: [`docs/PROMPT.md`](./docs/PROMPT.md)

## Qué hay ya

- `server/` — FastAPI (resolve, charts, catalog proxy, track_match)
- `apps/web/` — PWA con UI salvaje:
  - **Full Player** tal cual
  - **Home / Search / Library** layout del v1
  - **Settings** solo tema · acento · EQ
  - **User** vacío (rediseño pendiente)
- `packages/shared/` — stub para código compartido

## Arranque

```bash
npm install
npm run dev:server:install
npm run dev:all
```

Abre **http://localhost:5173** (usa `localhost`, no `127.0.0.1`).

Para móvil en la misma Wi‑Fi: `npm run dev:all:mobile` (API + Vite en `0.0.0.0`).

## Variables

- Frontend: copia `apps/web/.env.example` → `apps/web/.env`
- Backend: copia `server/.env.example` → `server/.env`
- Android: `apps/web/.env.android.example` (requiere `VITE_API_URL`)
