<p align="center">
  <img src="apps/web/public/logo.png" alt="Melodix" width="120" height="120" />
</p>

# Melodix

**Aplicación web de música plenamente funcional** (PWA + API), mantenida como **prototipo / boceto** de referencia para construir más adelante una app **React Native** como **TFG (Trabajo de Fin de Grado)**.

Este repositorio no es un esqueleto vacío: incluye reproducción, búsqueda, biblioteca, charts, ajustes y empaquetado Android vía Capacitor. La intención es validar producto y arquitectura en web antes del salto nativo.

> **Estado:** boceto funcional · base para el TFG en React Native  
> **Marca:** logo, favicon, iconos PWA y splash de carga ya integrados en `apps/web`

---

## Qué es (y qué no es)

| Es | No es (aún) |
|----|-------------|
| App web de música operativa (Vite + React + FastAPI) | La app final del TFG en React Native |
| Prototipo / boceto con UI, API y Android (Capacitor) | Un producto cerrado para producción masiva |
| Fuente de verdad de flujos, branding y dominio musical | Un dump descartable |

Contrato / notas de producto móvil: [`docs/PLAY.md`](./docs/PLAY.md)

---

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Zustand, `vite-plugin-pwa`
- **Backend:** FastAPI (Python) — resolve, charts, catálogo, track match
- **Compartido:** `packages/shared` (helpers de dominio)
- **Móvil:** Capacitor 8 (Android) — splash nativo + iconos launcher
- **Branding:** `apps/web/public/logo.png`, `favicon.png`, `icons/icon-192.png`, `icons/icon-512.png`

---

## Arranque (desarrollo)

Requisitos: **Node 20+**, **Python 3.11+** (recomendado).

```bash
npm install
npm install --prefix apps/web
npm run dev:server:install
npm run dev:all
```

Abre **http://localhost:5173** (usa `localhost`, no `127.0.0.1`).

### Scripts útiles (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev:all` | API + web en paralelo |
| `npm run dev:web` / `dev` | Solo frontend (Vite) |
| `npm run dev:server` | Solo API (`127.0.0.1:8000`) |
| `npm run dev:server:lan` | API en `0.0.0.0` (móvil en la misma Wi‑Fi) |
| `npm run build` | Build de la PWA |
| `npm run build:android` | Build web + `cap sync` Android |
| `npm run cap:open` | Abre el proyecto en Android Studio |
| `npm run smoke` | Smoke test rápido |

### Android (Capacitor)

```bash
# API alcanzable desde el dispositivo (ejemplo LAN)
# PowerShell: $env:VITE_API_URL="http://192.168.x.x:8000"
npm run build:android
npm run cap:open
```

Detalle: [`docs/PLAY.md`](./docs/PLAY.md)

---

## Variables de entorno

**No subas secretos.** Copia los ejemplos:

| Archivo | Destino |
|---------|---------|
| `.env.example` | `.env` (raíz / frontend) |
| `server/.env.example` | `server/.env` |
| `apps/web/.env.android.example` | build Android (`VITE_API_URL`, etc.) |

`.env`, claves de API y firmas quedan fuera del repo (ver `.gitignore`).

---

## Estructura

```
Melodix/
├── apps/web/          # PWA React + Capacitor Android
│   └── public/        # logo, favicon, iconos PWA, privacy
├── packages/shared/   # utilidades compartidas
├── server/            # FastAPI
├── docs/              # notas (Play / Capacitor)
└── scripts/           # utilidades (smoke, etc.)
```

### Branding y carga

- Splash in-app: `AppSplash` + `MelodixMark` → `/logo.png`
- Favicon / Apple touch / PWA manifest: configurados en `index.html` y `vite.config.js`
- Splash / launcher Android: recursos en `apps/web/android/app/src/main/res/`

---

## Roadmap TFG (orientativo)

1. **Ahora:** consolidar este boceto web funcional (UX, API, branding).
2. **Después:** portar a **React Native** reutilizando dominio (`packages/shared`) y la misma API.
3. Documentar decisiones de arquitectura partiendo de este prototipo.

---

## Licencia / uso académico

Proyecto personal académico (TFG). El código se publica como referencia de prototipo; respeta los términos de las APIs y servicios de terceros que uses en local.
