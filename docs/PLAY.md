# Melodix → Google Play (Capacitor)

Camino acordado: **web actual + Capacitor Android**, no React Native todavía.

## Requisitos en el PC

- Node 20+
- [Android Studio](https://developer.android.com/studio) + SDK
- JDK 17 recomendado para Gradle (Java 24 a veces falla; si el build truena, instala Temurin 17)

## Flujo diario

```bash
# 1) API en marcha (local o desplegada)
npm run dev:server

# 2) Build web + sync a android/
cd apps/web
# Define API alcanzable desde el móvil:
#   set VITE_API_URL=http://192.168.x.x:8000   (PowerShell: $env:VITE_API_URL=...)
npm run build:android
npm run cap:open   # Android Studio
```

En Android Studio: Run en emulador/dispositivo, o **Build → Generate Signed Bundle / APK** (AAB para Play).

## Scripts (`apps/web`)

| Script | Qué hace |
|--------|----------|
| `build:android` | `vite build` + `cap sync android` |
| `cap:sync` | Solo sync (si `dist/` ya existe) |
| `cap:open` | Abre Android Studio |
| `cap:run` | Sync + run en dispositivo conectado |

## Play Console (checklist)

1. Cuenta de desarrollador (~25 USD).
2. Privacidad en HTTPS (`privacy.html` del hosting).
3. Iconos / feature graphic / capturas.
4. Data safety (sin login cloud por ahora → declarar en consecuencia).
5. Subir **AAB** a pista **Internal testing** primero.
6. Revisar políticas de contenido musical / embeds antes de Production.

## API en el dispositivo

`VITE_API_URL` vacío = rutas `/api` → en Capacitor **no hay proxy**.  
Siempre poner URL absoluta de la API al build de Android.

## Más adelante

Si el audio en background o iOS lo exigen: valorar **Expo/RN** reusando `@melodix/shared` + la misma API. No hace falta ahora.
