# 🔄 Diagrama del Sistema SOS

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        FIREBASE RTDB                             │
│                    /alertas_sos/{sosId}                         │
│                                                                   │
│  ┌────────────────────────────────────┐                         │
│  │ estado: "ACTIVO" | "ATENDIDO"      │                         │
│  │ usuario: string                    │   ◄──────────┐          │
│  │ telefono: string                   │              │          │
│  │ lat: number                        │              │          │
│  │ lng: number                        │              │          │
│  │ nroUnidad: string                  │              │          │
│  │ ts: timestamp                      │              │          │
│  └────────────────────────────────────┘              │          │
│                                                       │          │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                                                    PUSH/UPDATE
                                                        │
                    ┌───────────────────────────────────┴───────────────────┐
                    │                                                       │
        ┌───────────▼──────────┐                            ┌──────────────▼────┐
        │  APP USUARIO         │                            │  PANEL BASE        │
        │  (Pasajero)          │                            │  (Operadores)      │
        │                      │                            │                    │
        │ ┌──────────────────┐ │                            │ ┌────────────────┐ │
        │ │  Botón SOS 🚨    │ │                            │ │  Listener SOS  │ │
        │ │  (por pulsar)    │ │                            │ │  (escuchando)  │ │
        │ └────────┬─────────┘ │                            │ └────────┬───────┘ │
        │          │           │                            │          │        │
        │    ┌─────▼─────┐     │                            │   ┌──────▼──────┐ │
        │    │ Validar   │     │                            │   │  Recibir    │ │
        │    │ - GPS ✓   │     │                            │   │  alerta     │ │
        │    │ - coords  │     │                            │   └──────┬──────┘ │
        │    │ - usuario │     │                            │          │        │
        │    └─────┬─────┘     │                            │   ┌──────▼──────┐ │
        │          │           │                            │   │  Acciones:  │ │
        │   ┌──────▼──────┐    │                            │   │             │ │
        │   │  PUSH a     │    │                            │   │ 1. Marcador │ │
        │   │  Firebase   │ ──────────────────────────────► │   │    🚨 rojo  │ │
        │   └──────┬──────┘    │   (PUSH)                   │   │ 2. Parpadea │ │
        │          │           │                            │   │ 3. Centra   │ │
        │   ┌──────▼──────┐    │                            │   │    mapa     │ │
        │   │ UI Feedback │    │                            │   │ 4. Alarma   │ │
        │   │             │    │                            │   │    sonora   │ │
        │   │ • Banner    │    │                            │   │ 5. Popup    │ │
        │   │   rojo      │    │                            │   │    info     │ │
        │   │ • Alarma    │    │                            │   └──────┬──────┘ │
        │   │   (bips)    │    │                            │          │        │
        │   │ • Botón     │    │                            │   ┌──────▼──────┐ │
        │   │   "Atender" │    │                            │   │   Operador  │ │
        │   └─────────────┘    │                            │   │  presiona:  │ │
        │                      │                            │   │  "ATENDIDO" │ │
        └──────────────────────┘                            │   └──────┬──────┘ │
                                                            │          │        │
                                                            └──────────┼────────┘
                                                                       │
                                                                  UPDATE
                                                                  estado:
                                                                  "ATENDIDO"
                                                                       │
                    ┌──────────────────────────────────────────────────┘
                    │
        ┌───────────▼──────────┐                            ┌──────────────────┐
        │  APP USUARIO         │                            │  PANEL BASE      │
        │  (Pasajero)          │                            │  (Operadores)    │
        │                      │                            │                  │
        │ ┌──────────────────┐ │                            │ ┌──────────────┐ │
        │ │  Banner          │ │                            │ │  Limpiar:    │ │
        │ │  desaparece      │ │                            │ │ - Marcador   │ │
        │ │                  │ │                            │ │ - Alarma     │ │
        │ │  SOS finalizado  │ │                            │ │ - Popup      │ │
        │ │  ✓               │ │                            │ │ - Notif      │ │
        │ └──────────────────┘ │                            │ └──────────────┘ │
        │                      │                            │                  │
        └──────────────────────┘                            └──────────────────┘
```

---

## Flujo de Eventos Detallado

### 1. Inicialización del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  STARTUP - App Usuario                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Cargar app.js                                                │
│    ├─ Inicializar Firebase                                      │
│    ├─ Importar módulo sos.js                                    │
│    ├─ Exponer window.db                                         │
│    ├─ Exponer variables globales                                │
│    └─ Renderizar botón SOS 🚨                                   │
│                                                                  │
│ 2. Iniciar GPS listener                                         │
│    └─ watchPosition() en tiempo real                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STARTUP - Panel Base                                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Cargar base/index.html                                       │
│    ├─ Inicializar Firebase (SDK legacy)                         │
│    ├─ Cargar sos-base.js (defer)                                │
│    ├─ Inicializar mapa Leaflet                                  │
│    └─ Iniciar listeners (incluido SOS)                          │
│                                                                  │
│ 2. initListenerSOS()                                            │
│    ├─ rtdb.ref('alertas_sos').on('child_added', ...)           │
│    ├─ rtdb.ref('alertas_sos').on('child_changed', ...)         │
│    └─ rtdb.ref('alertas_sos').on('child_removed', ...)         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Activación SOS (Usuario presiona botón)

```
┌─────────────────────────────────────────────────────────────────┐
│  EVENT: Usuario presiona botón 🚨                               │
├─────────────────────────────────────────────────────────────────┤
│  window.activarSOS()                                             │
│    │                                                             │
│    ├─► [VALIDACIÓN]                                             │
│    │   ├─ if (sosActivo) → ABORT "ya está activo"              │
│    │   ├─ if (!window.gpsOk) → ALERT "GPS no disponible"       │
│    │   └─ if (!myLat || !myLng) → ABORT                        │
│    │                                                             │
│    ├─► [CAPTURA DE DATOS]                                       │
│    │   ├─ nroUnidad = activeViaje?.unitId || "USUARIO_"+ts     │
│    │   ├─ usuario = window.myName                               │
│    │   ├─ telefono = window.myPhone                             │
│    │   ├─ lat = window.myLat                                    │
│    │   ├─ lng = window.myLng                                    │
│    │   └─ ts = Date.now()                                       │
│    │                                                             │
│    ├─► [FIREBASE PUSH]                                          │
│    │   ├─ ref(db, "alertas_sos")                                │
│    │   ├─ push({tipo, usuario, telefono, lat, lng, ...})       │
│    │   └─ sosId = result.key                                    │
│    │                                                             │
│    ├─► [UI FEEDBACK]                                            │
│    │   ├─ mostrarSOSActivo()                                    │
│    │   │  └─ Crear/mostrar banner rojo parpadeante             │
│    │   └─ reproducirSonidoSOS()                                 │
│    │      └─ Web Audio: Alarma (bips 500ms)                    │
│    │                                                             │
│    └─► [CONSOLE LOG]                                            │
│        ├─ "🚨 SOS ACTIVADO"                                     │
│        └─ "✅ SOS guardado en BD con ID: ..."                   │
│                                                                  │
│  RESULTADO: Alerta en /alertas_sos/{sosId} "ACTIVO"            │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Recepción en Panel Base (Listener child_added)

```
┌─────────────────────────────────────────────────────────────────┐
│  FIREBASE EVENT: /alertas_sos/{sosId} ← PUSH                    │
├─────────────────────────────────────────────────────────────────┤
│  rtdb.ref('alertas_sos').on('child_added', (snap) => {          │
│    │                                                             │
│    ├─► [PARSE DATA]                                             │
│    │   ├─ sosId = snap.key                                      │
│    │   └─ data = snap.val()                                     │
│    │                                                             │
│    ├─► [STATE UPDATE]                                           │
│    │   └─ S.sosActivos[sosId] = data                            │
│    │      └─ console.log("🚨 NUEVA ALERTA SOS")                │
│    │                                                             │
│    ├─► [CREAR MARCADOR]                                         │
│    │   ├─ L.marker([data.lat, data.lng])                        │
│    │   ├─ buildUnitIcon() → 🚨 rojo parpadeante                │
│    │   ├─ sosMarkers[sosId] = marcador                          │
│    │   └─ addTo(map)                                            │
│    │                                                             │
│    ├─► [ABRIR POPUP]                                            │
│    │   ├─ Mostrar: usuario, tel, unidad, coords                 │
│    │   ├─ Botón: "MARCAR COMO ATENDIDA"                         │
│    │   └─ bindPopup(content).openPopup()                        │
│    │                                                             │
│    ├─► [CENTER MAPA]                                            │
│    │   ├─ S.map.flyTo([lat, lng], 18)                           │
│    │   ├─ duration: 1000ms                                      │
│    │   └─ easing: ease-in-out                                   │
│    │                                                             │
│    ├─► [ALARMA SONORA]                                          │
│    │   ├─ activarAlarmaSOS()                                    │
│    │   ├─ setInterval(() => playBeep(), 300ms)                  │
│    │   ├─ Freq: 850Hz → 750Hz (decaying)                        │
│    │   └─ Gain: 0.5 → 0.01 en 200ms                             │
│    │                                                             │
│    ├─► [NOTIFICACIÓN VISUAL]                                    │
│    │   ├─ mostrarNotificacionSOS(sosId, data)                   │
│    │   ├─ Crear div top-right (position: fixed)                 │
│    │   ├─ innerHTML: usuario, tel, coords                       │
│    │   ├─ Botón verde: "MARCAR COMO ATENDIDA"                   │
│    │   ├─ Animation: slideIn 0.4s                               │
│    │   └─ setTimeout(() => slideOut, 30000ms)                   │
│    │                                                             │
│    └─► [CONSOLE LOG]                                            │
│        ├─ "🚨 NUEVA ALERTA SOS: [sosId]"                        │
│        └─ Datos completos de la alerta                          │
│                                                                  │
│  }) // FIN listener                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Atención SOS (Operador presiona botón)

```
┌─────────────────────────────────────────────────────────────────┐
│  EVENT: Operador presiona "MARCAR COMO ATENDIDA"                │
├─────────────────────────────────────────────────────────────────┤
│  atenderSOS(sosId)                                               │
│    │                                                             │
│    ├─► [UPDATE EN FIREBASE]                                     │
│    │   ├─ rtdb.ref(`alertas_sos/${sosId}/estado`)               │
│    │   ├─ .set('ATENDIDO')                                      │
│    │   └─ console.log("✅ Atendiendo SOS")                       │
│    │                                                             │
│    └─► Result: Firebase event "child_changed"                   │
│        (ver siguiente flujo)                                    │
│                                                                  │
│  RESULTADO: Alerta en Firebase estado = "ATENDIDO"              │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Limpieza después de Atención (Listener child_changed)

```
┌─────────────────────────────────────────────────────────────────┐
│  FIREBASE EVENT: /alertas_sos/{sosId} estado = "ATENDIDO"       │
├─────────────────────────────────────────────────────────────────┤
│  rtdb.ref('alertas_sos').on('child_changed', (snap) => {        │
│    │                                                             │
│    ├─► [CHECK ESTADO]                                           │
│    │   ├─ if (data.estado === 'ATENDIDO') {                     │
│    │   │  └─ atenderSOS(sosId)                                  │
│    │   └─ }                                                      │
│    │                                                             │
│    └─► Llamar: removerSOS(sosId)                                │
│        │                                                         │
│        ├─► [REMOVER DEL MAPA]                                   │
│        │   ├─ S.map.removeLayer(sosMarkers[sosId])              │
│        │   └─ delete sosMarkers[sosId]                          │
│        │                                                         │
│        ├─► [DETENER ALARMA]                                     │
│        │   ├─ if (no hay más alertas SOS)                       │
│        │   └─ detenerAlarmaSOS() → clearInterval()              │
│        │                                                         │
│        ├─► [CERRAR NOTIFICACIÓN]                                │
│        │   ├─ notifEl.style.animation = 'slideOut'              │
│        │   └─ setTimeout(() => notifEl.remove(), 400ms)         │
│        │                                                         │
│        ├─► [STATE UPDATE]                                       │
│        │   └─ delete S.sosActivos[sosId]                        │
│        │                                                         │
│        └─► [CONSOLE LOG]                                        │
│            └─ "🗑️ SOS removido del mapa"                        │
│                                                                  │
│  }) // FIN listener                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  EFECTO EN APP USUARIO (después de UPDATE)                      │
├─────────────────────────────────────────────────────────────────┤
│  El módulo sos.js NO escucha changes (solo pushes)               │
│  → Usuario puede presionar "ATENDIDO" en su banner OR           │
│  → Esperar timeout del listener                                 │
│                                                                  │
│  RESULTADO:                                                      │
│  ✓ Banner desaparece                                            │
│  ✓ Alarma se detiene                                            │
│  ✓ SOS completado                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estados y Transiciones

```
┌────────────────┐
│   INICIO       │
│ (sin SOS)      │
└────────┬───────┘
         │
    [usuario presiona 🚨]
         │
         ▼
┌─────────────────────────┐
│   ACTIVO                │
│ (SOS enviado a FB)      │
│ - Banner rojo           │
│ - Alarma en usuario     │
│ - Marcador en base      │
│ - Alarma en base        │
│ - Notificación en base  │
└────────┬────────────────┘
         │
    [operador presiona]
    ["MARCAR COMO ATENDIDA"]
         │
         ▼
┌──────────────────────────┐
│   ATENDIDO               │
│ (en transición)          │
│ - Firebase estado UPDATE │
└────────┬─────────────────┘
         │
    [removerSOS]
         │
         ▼
┌────────────────┐
│   COMPLETADO   │
│ (limpieza)     │
│ - Marcador off │
│ - Alarma off   │
│ - Notif off    │
│ - Banner off   │
└────────┬───────┘
         │
    [volver a INICIO]
     (si es necesario)
         │
         ▼
     (loop)
```

---

## Componentes de Audio (Web Audio API)

```
┌─ Audio Context
│
├─ Oscillator (Freq: var)
│  └─ Connects to Gain
│
├─ Gain Node (0.5 → 0.01)
│  └─ Connects to Destination
│
└─ Destination (altavoz)

Cronología de un beep (200ms):
├─ 0ms:    start(now)
├─ 0ms:    frequency = 850Hz
├─ 100ms:  frequency → 750Hz (exponentialRamp)
├─ 0ms:    gain = 0.5
├─ 200ms:  gain → 0.01 (exponentialRamp)
└─ 200ms:  stop(now + 0.2)

Repetición: cada 300-500ms
```

---

## Validaciones y Guard Clauses

```
activarSOS() {
  ✓ if (sosActivo) → early return
  ✓ if (!gpsOk) → alert + return
  ✓ if (!myLat || !myLng) → alert + return
  ✓ try-catch en push() a Firebase
  ✓ try-catch en Web Audio
}

crearMarcadorSOS() {
  ✓ if (!S.map) → return
  ✓ if (!data.lat || !data.lng) → return
  ✓ try-catch en Audio Context
}

atenderSOS() {
  ✓ try-catch en Firebase update
}

removerSOS() {
  ✓ if (!sosMarkers[sosId]) → return
  ✓ if (S.map) → removeLayer()
  ✓ if (no más SOS) → detenerAlarmaSOS()
}
```

---

## Performance y Optimizaciones

```
┌─ Latencia esperada por componente:
│
├─ Validación GPS: 1-5ms
├─ Push a Firebase: 50-200ms
├─ Recepción en base (listener): 0-100ms
├─ Crear marcador: 10-50ms
├─ Animar mapa (flyTo): 1000ms (visible)
├─ Primer bip de audio: 200ms
├─ Mostrar notificación: 50-100ms
│
└─ Total latencia: ~100-150ms (+ network) ≈ 0.1s

┌─ CPU/RAM durante SOS:
│
├─ Alarma sonora: 1-2% CPU (intermitente)
├─ Animación marcador: <1% CPU (CSS3)
├─ Listener Firebase: <0.5% CPU (idle)
├─ Mapa Leaflet: 2-5% CPU (con zoom)
│
└─ RAM total: +5-15MB durante SOS
    (baja después de limpieza)
```

---

## Casos de Error y Recuperación

```
ERROR 1: GPS no disponible
├─ Validación: !window.gpsOk
├─ Acción: alert("GPS no disponible")
└─ Resultado: No se envía SOS

ERROR 2: Firebase auth == null
├─ Validación: usuario no autenticado
├─ Acción: Firebase rechaza PUSH
└─ Resultado: catch → alert("Error conexión")

ERROR 3: Web Audio no soportado
├─ Validación: AudioContext no existe
├─ Acción: catch → console.warn
└─ Resultado: SOS funciona SIN audio

ERROR 4: Marcador en coords inválidas
├─ Validación: !data.lat || !data.lng
├─ Acción: if (!data.lat) return
└─ Resultado: Marcador no aparece (log)

ERROR 5: Volumen silenciado del dispositivo
├─ Usuario: responsable
├─ Acción: Revisar volumen del sistema
└─ Resultado: Audio inaudible (pero activo)
```

---

**Versión del Diagrama**: 1.0
**Generado**: Abril 2, 2026

