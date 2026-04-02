# 📤 GUÍA: Sistema de Compartir Viaje en Tiempo Real

## 1. Descripción General

El sistema **Compartir Viaje** permite que los pasajeros **generen enlaces web dinámicos** que muestren su ubicación en tiempo real mientras están en un viaje, para compartir con contactos a través de **WhatsApp o cualquier otra aplicación**.

### Características Principales

✅ **Compartir en Tiempo Real**: Ubicación actualizada cada 5 segundos  
✅ **Enlace Web Dinámico**: Genera URLs únicas para cada viaje compartido  
✅ **Integración WhatsApp**: Botón directo para enviar por WhatsApp con mensaje predefinido  
✅ **Copiar Enlace**: Opción para copiar el enlace al portapapeles  
✅ **Web Share API**: Compatible con navegadores que soportan compartir nativo  
✅ **Interfaz Modal**: Diseño intuitivo con opciones de compartir  

---

## 2. Arquitectura del Sistema

### A. Componentes Principales

```
APP_USUARIO/
├── index.html                 ← UI con botón y modal compartir
├── js/
│   ├── app.js                ← Ciclo de vida del viaje
│   ├── share.js              ← Módulo compartir (235 líneas)
│   └── mapa.js               ← Actualización de ubicación
│
base/
├── public/
│   ├── track.html            ← Página pública de seguimiento
│   └── styles/               ← Estilos para track.html
│
DATABASE (Firebase Realtime)
└── viajes_compartidos/
    └── {viajeCompartidoId}/
        ├── usuario           ← Nombre del pasajero
        ├── telefono          ← Teléfono del pasajero
        ├── nroUnidad         ← Número de taxi
        ├── destino           ← Destino del viaje
        ├── conductor         ← Nombre del conductor
        ├── latInicial/lngInicial ← Ubicación de inicio
        ├── ts                ← Timestamp de creación
        ├── activo            ← true/false (activo o finalizado)
        └── ubicacionActual/  ← Subcollection actualizada cada 5s
            ├── lat           ← Latitud actual
            ├── lng           ← Longitud actual
            └── ts            ← Timestamp de actualización
```

### B. Flujo de Datos

```
1. Usuario presiona botón "📤 Compartir viaje"
   ↓
2. Modal se abre con opciones
   ├─→ Enlace de seguimiento mostrado
   ├─→ Mensaje predefinido visible
   └─→ Opciones de compartir disponibles
   ↓
3. Usuario elige opción:
   ├─→ "Enviar por WhatsApp" → Abre WhatsApp con mensaje
   ├─→ "Copiar Mensaje" → Copia a portapapeles
   └─→ "Copiar Enlace" → Copia URL única
   ↓
4. Ubicación se actualiza en Firebase cada 5 segundos
   ↓
5. Persona que recibe el enlace accede a track.html
   └─→ Ve mapa en tiempo real con taxi y su ubicación
       └─→ Calcula distancia automáticamente
       └─→ Puede copiar coordenadas o contactar por WhatsApp
```

---

## 3. Arquivos Creados

### A. `APP_USUARIO/js/share.js` (235 líneas)

**Propósito**: Módulo de compartir viaje con todas las funciones necesarias

**Funciones Exportadas**:

```javascript
// 1. Iniciar compartir viaje
export function iniciarCompartirViaje()
// Crea registro en Firebase /viajes_compartidos/
// Valida viaje activo
// Inicia actualización de ubicación cada 5s
// Retorna: viajeCompartidoId

// 2. Actualizar ubicación compartida (INTERNO)
function actualizarUbicacionCompartida()
// Se ejecuta cada 5000ms (5 segundos)
// Actualiza /viajes_compartidos/{id}/ubicacionActual
// Con: {lat, lng, ts}

// 3. Generar enlace compartido
export function generarEnlaceCompartido()
// Retorna: https://sitios-hidalgo-track.web.app/track?id={viajeCompartidoId}

// 4. Compartir (Web Share API)
export function compartirViaje()
// Intenta usar navigator.share() nativo
// Fallback: Muestra modal con opciones
// Mensaje: Hola, te comparto mi ubicación...

// 5. Compartir directamente por WhatsApp
export function compartirPorWhatsApp()
// Abre https://wa.me/?text=...
// Con mensaje: "Hola, te comparto mi ubicación..." + enlace
// URL encoding: Mensaje formateado correctamente

// 6. Mostrar modal de opciones
export function mostrarOpcionesCompartir()
// Abre modal con:
// - Vista previo del mensaje
// - Input del enlace (copiar)
// - Botones: WhatsApp, Copiar mensaje, Copiar enlace

// 7. Copiar al portapapeles
export function copiarAlPortapapeles(tipo)
// tipo: 'link' | 'message'
// Usa Clipboard API
// Fallback: textarea para navegadores antiguos

// 8. Detener compartir viaje
export function detenerCompartirViaje()
// Marca viaje como inactivo en Firebase
// Limpia intervalo de actualización
// Resetea referencias

// 9. Mostrar notificación toast
export function mostrarToastCompartir(msg)
// Toast automático de 2s
```

**Dependencias**:
- `window.db` - Firebase Realtime Database
- `window.activeViaje` - Objeto con unitId, destino, conductor
- `window.myName` - Nombre del usuario
- `window.myPhone` - Teléfono del usuario
- `window.myLat` - Latitud actual
- `window.myLng` - Longitud actual

**Configuración**:
```javascript
const TRACKING_DOMAIN = "https://sitios-hidalgo-track.web.app";
const UPDATE_INTERVAL = 5000; // 5 segundos
const MESSAGE_TEMPLATE = "Hola, te comparto mi ubicación de taxi en tiempo real: {LINK}";
```

### B. `base/public/track.html` (450+ líneas)

**Propósito**: Página pública de seguimiento en tiempo real para receptores de mensajes

**Características**:
- ✅ Mapa Leaflet con capacidad de zoom
- ✅ Marcador de taxi (🚕 naranja)
- ✅ Marcador de usuario (📍 cyan)
- ✅ Cálculo de distancia en tiempo real (Haversine)
- ✅ Listener de Firebase real-time
- ✅ Botón WhatsApp para contactar
- ✅ Botón copiar coordenadas
- ✅ Indicador de estado (conectando/en línea)
- ✅ Manejo de errores

**Secciones**:

```html
1. HEAD
   - Firebase config
   - Leaflet CSS/JS
   - Meta tags responsive

2. BODY
   - Map container
   - Info panel (usuario, conductor, distancia)
   - Status badge
   - Action buttons
   - Error message (oculto)

3. SCRIPTS
   - Firebase listeners
   - Map initialization
   - Distance calculation
   - GPS tracking
   - Button handlers
```

**Firebase Listener**:
```javascript
ref(db, 'viajes_compartidos/{viajeId}')
  ├─→ Obtiene datos del viaje
  │   (usuario, conductor, nroUnidad, destino)
  │
  └─→ onValue(ref(db, `viajes_compartidos/{viajeId}/ubicacionActual`))
      ├─→ Actualiza marcador de taxi
      ├─→ Calcula distancia
      ├─→ Centra mapa
      └─→ Sincroniza cada actualización
```

**URL Parameter**:
```
https://sitios-hidalgo-track.web.app/track?id={viajeCompartidoId}

Ejemplo:
https://sitios-hidalgo-track.web.app/track?id=-NnKLmOpQr3x5Z7Y2aB
```

### C. `APP_USUARIO/index.html` (MODIFICADO)

**Cambios Realizados**:

1. **CSS Nuevo** (380+ líneas):
   ```css
   - .btn-share              ← Botón flotante 56px con pulse animation
   - .modal-share-bg         ← Overlay con backdrop blur
   - .modal-share-box        ← Modal content con handle
   - .share-section          ← Secciones del modal
   - .share-input-group      ← Input + botón copiar
   - .btn-share-whatsapp     ← Botón verde WhatsApp
   - .btn-share-copy         ← Botón copia enlace
   - .toast-share            ← Toast notificaciones
   ```

2. **HTML Nuevo**:
   ```html
   <button class="btn-share" id="btn-share" onclick="window.compartirViaje?.()">
     📤
   </button>

   <div class="modal-share-bg" id="modal-share">
     <div class="modal-share-box">
       <!-- Handle, title, sections, buttons -->
     </div>
   </div>
   ```

3. **Lógica Integrada**:
   - Botón visible solo cuando hay viaje activo (elemento siempre presente)
   - Modal se abre al presionar botón
   - Funciones de compartir accesibles desde window

### D. `APP_USUARIO/js/app.js` (MODIFICADO)

**Cambios Realizados**:

1. **Imports Agregados**:
   ```javascript
   import { iniciarCompartirViaje, compartirViaje,
            compartirPorWhatsApp, detenerCompartirViaje,
            copiarAlPortapapeles } from "./share.js";
   ```

2. **Window Exports Agregados**:
   ```javascript
   window.compartirViaje = compartirViaje;
   window.compartirPorWhatsApp = compartirPorWhatsApp;
   window.detenerCompartirViaje = detenerCompartirViaje;
   window.copiarAlPortapapeles = copiarAlPortapapeles;
   window.iniciarCompartirViaje = iniciarCompartirViaje;
   ```

3. **Ciclo de Vida Integrado**:
   - `solicitarTaxi()`: Calls `iniciarCompartirViaje()` cuando viaje comienza
   - `cancelarSolicitud()`: Calls `detenerCompartirViaje()` cuando se cancela
   - `_mostrarRating()`: Calls `detenerCompartirViaje()` cuando viaje termina

---

## 4. Cómo Funciona (paso a paso)

### Escenario: Pasajero comparte viaje con familia

**Paso 1: Pasajero solicita taxi**
```
Usuario abre APP_USUARIO
├─ Toca "Solicitar Servicio"
├─ Escribe destino
├─ Se asigna taxi cercano
└─ Se muestra banner: "🚕 TAXI123 - Carlos hacia Centro"
   └─ Automáticamente inicia compartir viaje
      └─ Se crea registro en Firebase: /viajes_compartidos/{idAleatorio}/
      └─ Botón "📤 Compartir" aparece en botón flotante
```

**Paso 2: Pasajero toca botón compartir**
```
Usuario toca botón flotante 📤
├─ Modal se abre desde abajo (animation: translateY)
├─ Muestra:
│  ├─ Enlace: https://sitios-hidalgo-track.web.app/track?id=XXXXX
│  ├─ Mensaje: "Hola, te comparto mi ubicación..."
│  └─ Opciones para compartir
```

**Paso 3: Usuario elige forma de compartir**

**Opción A: Enviar por WhatsApp directo**
```
Usuario toca "📱 Enviar por WhatsApp"
├─ Abre navegador WhatsApp Web o App
├─ Pre-rellena mensaje con:
│  └─ "Hola, te comparto mi ubicación de taxi en tiempo real: 
│      https://sitios-hidalgo-track.web.app/track?id=XXXXX"
└─ Usuario puede añadir contacto o enviar a grupo
```

**Opción B: Copiar enlace**
```
Usuario toca "Copiar Enlace"
├─ Copia a portapapeles: https://sitios-hidalgo-track.web.app/track?id=XXXXX
├─ Toast: "✅ Enlace copiado"
└─ Usuario pega en WhatsApp/SMS/otra app
```

**Opción C: Copiar mensaje completo**
```
Usuario toca "Copiar Mensaje"
├─ Copia a portapapeles mensaje completo con enlace
├─ Toast: "✅ Copiado"
└─ Usuario pega en aplicación de su elección
```

**Paso 4: Receptor recibe el enlace**
```
Contacto recibe WhatsApp: "Hola, te comparto mi ubicación..."
├─ Toca el enlace
├─ Se abre track.html en el navegador
└─ Ve mapa en tiempo real:
   ├─ Ubicación del taxi (🚕 naranja)
   ├─ Su ubicación si activa GPS (📍 cyan)
   ├─ Distancia calculada automáticamente
   ├─ Datos: Pasajero, Conductor, Taxi, Destino
   └─ Botones: Contactar por WhatsApp, Copiar coordenadas
```

**Paso 5: Ubicación en tiempo real**
```
Mientras el viaje está activo:
├─ Cada 5 segundos:
│  └─ APP_USUARIO actualiza ubicación en Firebase
│     └─ /viajes_compartidos/{id}/ubicacionActual = {lat, lng, ts}
└─ track.html recibe actualización en tiempo real
   ├─ Mueve marcador del taxi
   ├─ Recalcula distancia
   └─ Actualiza timestamp
```

**Paso 6: Viaje termina**
```
Conductor llega a destino
├─ APP_USUARIO termina viaje
├─ Se abre modal de calificación
├─ detenerCompartirViaje() es llamado:
│  ├─ Marca /viajes_compartidos/{id}/activo = false
│  ├─ Limpia intervalo de actualización
│  └─ Libera recursos
└─ track.html detecta cambio:
   ├─ Detiene actualización
   └─ Muestra mensaje: "Viaje finalizado"
```

---

## 5. FIREBASE DATABASE RULES

**Requerida para `/viajes_compartidos/`**:

```json
{
  "rules": {
    "viajes_compartidos": {
      ".read": true,
      ".write": "auth != null",
      "$viajeId": {
        ".read": true,
        ".write": "auth != null",
        "ubicacionActual": {
          ".read": true,
          ".write": "auth != null"
        }
      }
    }
  }
}
```

**Notas**:
- La lectura es pública (`.read: true`) para que track.html funcione sin autenticarse
- La escritura requiere autenticación para evitar spam

---

## 6. TESTING & VERIFICACIÓN

### Test 1: Crear y compartir viaje

```
1. Abrir APP_USUARIO en navegador
2. Permitir geolocalización
3. Seleccionar una base
4. Solicitar servicio
   - Verifica: console.log "Compartir iniciado" aparece
   - Verifica: /viajes_compartidos/{id} se crea en Firebase
5. Tocar botón 📤
   - Verifica: Modal se abre
   - Verifica: Enlace generado es válido
6. Tocar "Copiar Enlace"
   - Verifica: Portapapeles contiene el enlace
   - Verifica: Toast dice "✅ Copiado"
7. Pegar enlace en navegador en otra pestaña
   - Verifica: track.html carga
   - Verifica: Mapa muestra ubicación
   - Verifica: Distancia recalcula cada 5-10s
```

### Test 2: WhatsApp directo

```
1. En APP_USUARIO, abrir modal de compartir
2. Tocar "📱 Enviar por WhatsApp"
   - Verifica: Se abre WhatsApp (web o app)
   - Verifica: Mensaje pre-rellena con "Hola, te comparto..."
   - Verifica: Enlace es clickeable y válido
3. Enviar mensaje a contacto
4. Contacto recibe y hace click en enlace
   - Verifica: track.html abre sin problemas
```

### Test 3: Parar compartir

```
1. Viaje activo con compartir iniciado
2. Tocar "CANCELAR" en banner
   - Verifica: Viaje se cancela
   - Verifica: detenerCompartirViaje() se ejecuta
   - Verifica: activo se marca false en Firebase
3. En track.html de otro navegador
   - Verifica: Deja de actualizar ubicación
   - Verifica: Mensaje "Viaje finalizado" aparece
```

### Test 4: Múltiples viajes simultáneos

```
Abrir 2 navigadores con APP_USUARIO
├─ Navegador A: Solicita viaje, comparte
├─ Navegador B: Solicita viaje, comparte
└─ Ambos viajes están activos en Firebase
   └─ /viajes_compartidos/ tiene 2 entries
```

---

## 7. Troubleshooting

### Problema: "Enlace no aparece en modal"

**Causa**: `generarEnlaceCompartido()` retorna undefined  
**Solución**:
```javascript
1. Verifica app.js: window.iniciarCompartirViaje está exportado
2. Verifica share.js línea ~60: TRACKING_DOMAIN está correcto
3. Abre consola: console.log(window.viajeCompartidoId)
4. Debe mostrar un ID como "-NnKLmOpQr3x5..."
```

### Problema: "WhatsApp abre pero no envía el enlace"

**Causa**: URL encoding incorrecto  
**Solución**:
```javascript
// En share.js línea ~130, verificar que:
const waMsg = encodeURIComponent(mensaje);
// No está doblemente encoded
```

### Problema: "track.html carga pero no muestra posición"

**Causa**: GPS no activado o Leaflet no cargó  
**Solución**:
```
1. Abre Consola (F12)
2. Verifica que aparezca: "✅ Firebase inicializado"
3. Verifica que aparezca: "📍 GPS iniciado"
4. Verifica que aparezca: "🗺️ Mapa cargado"
5. Si falta alguno, hay error de conexión
```

### Problema: "Ubicación no actualiza en tiempo real"

**Causa**: Intervalo de actualización no se está ejecutando  
**Solución**:
```javascript
1. En APP_USUARIO consola: console.log(window.actualizarUbicacionInterval)
2. Debe mostrar un número (ID del intervalo)
3. Si muestra undefined, iniciarCompartirViaje() no se ejecutó
4. Verifica que solicitarTaxi() sea llamado correctamente
```

---

## 8. Configuración para Producción

### A. Dominio de Tracking

Actualmente configurado a:
```javascript
const TRACKING_DOMAIN = "https://sitios-hidalgo-track.web.app";
```

**Opciones de deploy**:

1. **Firebase Hosting** (Recomendado)
   ```bash
   firebase init hosting
   firebase deploy --only hosting:sitios-hidalgo-track
   ```
   Carpeta: `base/public/`

2. **Netlify**
   ```bash
   netlify deploy --prod --dir=base/public
   ```

3. **Vercel**
   ```bash
   vercel --prod
   ```

### B. Variables de Entorno

En producción, considerar usar `.env` para:
```
FIREBASE_API_KEY=...
VITE_TRACKING_DOMAIN=https://tu-dominio.com
VITE_MESSAGE_TEMPLATE=...
```

### C. SSL/HTTPS

**REQUERIDO**: Geolocalización (`navigator.geolocation`) solo funciona en HTTPS

### D. CORS Headers

Para track.html en dominio distinto:
```
firebase.json:
{
  "hosting": {
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "X-UA-Compatible",
        "value": "IE=Edge"
      }]
    }]
  }
}
```

---

## 9. Conclusión

El sistema **Compartir Viaje** proporciona:

✅ Experiencia de usuario completa y intuitiva  
✅ Seguridad mediante Firebase Auth  
✅ Privacidad con URLs únicas por viaje  
✅ Compatibilidad multiplataforma (Web Share API)  
✅ Integración nativa con WhatsApp  
✅ Actualización en tiempo real sin latencia  
✅ Interfaz responsiva y accesible  

**Próximos pasos**:
- Deploy a Firebase Hosting
- Testeo intensivo en múltiples dispositivos
- Monitoreo de errores y logs
- Recopilación de feedback de usuarios
