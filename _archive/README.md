# _archive/ — Archivos huérfanos preservados

Movidos el 2026-04-16 durante la FASE 2 (auditoría y limpieza) del proyecto
SHidalgo Kué'in. Ningún archivo activo los referencia. Se guardan aquí por
si se necesitan como referencia o para una futura integración.

---

## conductor/

| Archivo | Por qué está aquí |
|---------|------------------|
| `main_block.js` | Extracto de desarrollo: contiene estado global y login de conductor (153 líneas). El código equivalente ya existe inline en `conductor/index.html`. No es cargado por ningún `<script src>`. |
| `conductor_inline.js` | Variante de `main_block.js` con suppress de `console.warn` añadido (168 líneas). Tampoco referenciado desde `index.html`. |
| `sw.js` | Service Worker duplicado. `conductor/index.html` registra `sw-conductor.js`, no este archivo. Quedó sin uso tras renombrar el SW activo. |

---

## APP_USUARIO/

### APP_USUARIO/js/ — 7 módulos ES6 no integrados

Refactorización modular iniciada pero nunca conectada al HTML.
`APP_USUARIO/index.html` no tiene ningún `<script type="module">` ni
`<script src="js/...">` — toda su lógica está inline.

Los módulos usan Firebase Modular SDK v10.8.0 mientras el HTML activo
usa Firebase Compat SDK v10.12.0. Son arquitecturas incompatibles sin
un paso de build.

| Archivo | Función documentada |
|---------|-------------------|
| `app.js` | Entry point ES6: init Firebase, GPS tracking, solicitud de taxi, listeners RTDB |
| `mapa.js` | Leaflet map, marcadores bases/taxis, actualización tiempo real |
| `utils.js` | Haversine, formateo fechas, localStorage, showToast |
| `notifications.js` | FCM + Web Notifications API, permisos, proximidad |
| `sos.js` | Alerta SOS con GPS, vibración, escritura en Firestore |
| `share.js` | Compartir viaje por WhatsApp con coords Google Maps |
| `rating.js` | Modal calificación post-viaje, envío a Firestore/calificaciones |

### APP_USUARIO/config/

| Archivo | Por qué está aquí |
|---------|------------------|
| `firebase.js` | Exporta `FIREBASE_CONFIG` para los módulos de `js/`. Como esos módulos no se usan, este archivo tampoco. La config real está inline en `APP_USUARIO/index.html`. |
| `bases.js` | Exporta `BASES`, `CENTRO`, `RADIO_CERCA` para los módulos. Misma situación. Las geocercas activas están inline en `base-gps/index.html` y en `config/bases.js` (raíz). |

### APP_USUARIO/sw-usuario.js

Service Worker alternativo. `APP_USUARIO/index.html` registra `./sw.js`,
no este archivo. Quedó huérfano.

---

## base/ — Despliegue legacy Netlify

Deployment anterior del panel de base, alojado en Netlify antes de migrar
a Firebase Hosting. Reemplazado por `base-gps/index.html`.

| Archivo | Descripción |
|---------|------------|
| `geocercas.js` | 7 geocercas calibradas + funciones Haversine. La misma data vive ahora inline en `base-gps/index.html` (líneas ~1562+) y en `config/bases.js`. |
| `sos-base.js` | Listener SOS para panel base (requería `rtdb`, `S.map`, `S.sosActivos` del contexto antiguo). Funcionalidad equivalente integrada en `base-gps/index.html`. |
| `panel-calificaciones-base.js` | Panel de calificaciones para base. No hay evidencia de uso activo. |
| `BASE_netlify_v2.zip` | Snapshot del build Netlify v2. |
| `_redirects`, `_headers`, `.htaccess` | Archivos de configuración Netlify/Apache del despliegue anterior. |

---

## Código activo (NO está aquí)

El código en producción es:

```
APP_USUARIO/index.html          — App usuario (Firebase Compat, todo inline)
conductor/index.html            — App conductor (Vanilla JS, scripts externos)
conductor/js/                   — Módulos activos del conductor
conductor/sw-conductor.js       — Service Worker activo del conductor
base-gps/index.html             — Panel base (Google Maps, todo inline, 2873 líneas)
config/firebase.js              — Config Firebase raíz
config/bases.js                 — Geocercas raíz
functions/index.js              — 7 Cloud Functions producción
```
