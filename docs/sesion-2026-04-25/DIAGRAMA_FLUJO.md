# 🔄 DIAGRAMA VISUAL DEL FLUJO DE DATOS

## ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE REALTIME DATABASE                   │
│              sitios-hidalgo-gps (Proyecto Central)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /unidades                                               │   │
│  │  TX52:                                                  │   │
│  │    id: "TX52"                                           │   │
│  │    name: "Carlos López"                                 │   │
│  │    status: "LIBRE"          ⭐ ESTÁNDAR UNIFICADO     │   │
│  │    lat: 17.4572                                         │   │
│  │    lng: -97.2311                                        │   │
│  │    online: true                                         │   │
│  │    timestamp: 1711782450000                             │   │
│  │                                                         │   │
│  │  TX53:                                                  │   │
│  │    id: "TX53"                                           │   │
│  │    status: "OCUPADO"                                    │   │
│  │    ...                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│        ↑                          ↑                    ↑        │
│        │ (WRITE)                  │ (READ)            │ (READ) │
│        │                          │                   │        │
└────────┼──────────────────────────┼───────────────────┼────────┘
         │                          │                   │
         │                          │                   │
    ┌────▼────┐              ┌──────▼─────┐      ┌─────▼──────┐
    │ Conductor│              │ App Usuario │      │ Base Central
    │          │              │             │      │             │
    │ 📱       │              │ 📱          │      │ 🖥️         │
    │   TX52   │              │  Usuario    │      │  Control    │
    │   Online │              │  Online     │      │  Panel      │
    └────┬────┘              └──────┬─────┘      └─────┬──────┘
         │                          │                   │
         │ Cada 5s:                 │ Listener Real    │ Listener Real
         │ Escribe:                 │ Time (onValue)  │ Time
         │ {                        │                   │
         │   status: "LIBRE"  ✅    │ Recibe:          │
         │   lat, lng               │ [unidades]       │
         │   online: true           │                   │
         │ }                        │ Filtra:          │
         │                          │ status="LIBRE"   │
         │                          │ && online=true   │
         │                          │                   │
         │                          │ Dibuja mapa:     │
         │                          │ [Marcadores🚖]   │
         └──────────────────────────────────────────────┘


## FLUJO DE DATOS SINCRONIZADOS

ANTES (❌ INCORRECTO):
┌─────────────────────────────────────────────────────────┐
│  Conductor escribe:                                     │
│  status: "libre"  (MINÚSCULAS)                         │
│            ↓                                            │
│  Firebase almacena:                                    │
│  {"TX52": {status: "libre"}}                          │
│            ↓                                            │
│  Usuario filtra por: status === "LIBRE" (MAYÚSCULAS)│
│            ↓                                            │
│  ❌ NUNCA COINCIDE → No encuentra taxis              │
│            ↓                                            │
│  Usuario ve: "😔 No hay taxis disponibles"           │
└─────────────────────────────────────────────────────────┘

AHORA (✅ CORRECTO):
┌─────────────────────────────────────────────────────────┐
│  Conductor escribe:                                     │
│  status: "LIBRE"  (MAYÚSCULAS) ⭐                      │
│            ↓                                            │
│  Firebase almacena:                                    │
│  {"TX52": {status: "LIBRE"}}                           │
│            ↓                                            │
│  Usuario filtra por: status === "LIBRE" (MAYÚSCULAS)│
│            ↓                                            │
│  ✅ COINCIDE PERFECTAMENTE                            │
│            ↓                                            │
│  Usuario ve: "1 taxi disponible" + Mapa con 🚖       │
└─────────────────────────────────────────────────────────┘


## CICLO DE VIDA DE UNA SOLICITUD DE TAXI

┌──────────────────────────────────────────────────────────────┐
│                   USUARIO ABRE APP USUARIO                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │ _initFirebase()             │
           │ - Escucha /unidades         │
           │ - onValue listener activo   │
           └────────────┬────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ Firebase emite cambios en tiempo │
        │ real de /unidades                │
        │                                  │
        │ console.log("🚖 Conductores"...) │
        └─────────────┬────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────┐
        │ Filtra: status === "LIBRE"       │
        │ && online !== false              │
        │ && lat && lng                    │
        │                                  │
        │ console.log("✅ Taxis LIBRES"...) │
        └─────────────┬────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────┐
        │ actualizarMarcadores()           │
        │ - Dibuja 🚖 verde en mapa        │
        │ - console.log("🗺️ Unidad...")   │
        └─────────────┬────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────┐
        │ Muestra:                         │
        │ - "1 taxi disponible"            │
        │ - Botón SOLICITAR habilitado     │
        │ - Mapa con marcador              │
        └─────────────┬────────────────────┘
                      │
            ┌─────────┴──────────┐
            │                    │
            ▼                    ▼
    ┌──────────────┐    ┌──────────────────┐
    │ Usuario hace │    │ Conductor cambia │
    │ clic en      │    │ status a OCUPADO │
    │ "Solicitar"  │    │ (actualiza en    │
    │              │    │ tiempo real)     │
    └────────┬─────┘    └────────┬─────────┘
             │                   │
             ▼                   ▼
    ┌──────────────┐    ┌──────────────────┐
    │ Crea request │    │ Firebase notifica│
    │ en BD        │    │ cambio a Usuario │
    │              │    │                  │
    │ Asigna taxi: │    │ status ahora es  │
    │ unitId: TX52 │    │ "OCUPADO"        │
    └────────┬─────┘    └────────┬─────────┘
             │                   │
             └───────────┬───────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Usuario recibe cambio  │
            │ en tiempo real         │
            │                        │
            │ Filtra: status="OCUPADO│
            │ ya no entra en LIBRES  │
            │                        │
            │ Marcador cambia a gris │
            └────────────────────────┘


## ESTADOS DEL SISTEMA

┌─────────────────────────────────────────────────────────────┐
│                          ESTADOS VÁLIDOS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LIBRE                                                     │
│  ├─ Significado: Unidad disponible para viajes             │
│  ├─ En mapa: ✅ Visible (marcador VERDE, 28px)             │
│  ├─ Para usuario: Se puede solicitar                       │
│  ├─ Base ve: Disponible                                    │
│  └─ Escrito por: Conductor (botón LIBRE)                   │
│                                                             │
│  OCUPADO                                                   │
│  ├─ Significado: Con pasajero a bordo                      │
│  ├─ En mapa: ❌ Visible (marcador GRIS, 20px)              │
│  ├─ Para usuario: NO se puede solicitar                    │
│  ├─ Base ve: En viaje                                      │
│  └─ Escrito por: Conductor (botón OCUPADO)                 │
│                                                             │
│  DESCANSO                                                  │
│  ├─ Significado: No en servicio (descanso)                 │
│  ├─ En mapa: ❌ Visible (marcador GRIS, 20px)              │
│  ├─ Para usuario: NO se puede solicitar                    │
│  ├─ Base ve: Inactivo pero conectado                       │
│  └─ Escrito por: Conductor (botón DESCANSO)                │
│                                                             │
│  SOS                                                       │
│  ├─ Significado: Emergencia/Peligro                        │
│  ├─ En mapa: ❌ Visible (marcador RED, parpadea)           │
│  ├─ Para usuario: NO se puede solicitar                    │
│  ├─ Base ve: ¡¡¡ ALERTA CRÍTICA !!!                        │
│  └─ Escrito por: Conductor (botón SOS)                     │
│                                                             │
│  OFFLINE                                                   │
│  ├─ Significado: Desconectado / Fin de turno               │
│  ├─ En mapa: ❌ NO visible (removido)                       │
│  ├─ Para usuario: NO se puede solicitar                    │
│  ├─ Base ve: Fuera de línea                                │
│  └─ Escrito por: Sistema (logout)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘


## LOGS DE DEBUGGING EN CONSOLA

CONDUCTOR:
┌────────────────────────────────────────────┐
│ ✅ Firebase OK                             │
│ 🛰️ GPS activo                             │
│ 📍 Lat: 17.4572, Lng: -97.2311            │
│ 🚕 Unidad: TX52 — LIBRE                   │
│ 💾 Datos enviados a /unidades/TX52        │
└────────────────────────────────────────────┘

USUARIO (Console):
┌──────────────────────────────────────────────────┐
│ 🚖 Conductores recibidos desde Firebase: {  }   │
│ 🔍 Total de unidades: 1                         │
│ ✅ Taxis LIBRES: 1 [{...}]                      │
│ 🔴 Taxis OCUPADOS: 0                           │
│ 📍 Taxis cercanos (radio 500m): 1              │
│                                                │
│ 🔎 Buscando taxis LIBRES...                    │
│    Criterios: status='LIBRE', online=true...  │
│    Taxis LIBRES encontrados: 1                 │
│    Detalles: [{id: "TX52", status: "LIBRE"}]   │
│                                                │
│ 🗺️  Actualizando marcadores en mapa...         │
│   ✅ Unidad TX52 LIBRE en mapa                 │
│   ✅ Unidad TX52 LIBRE en mapa - Lat...       │
└──────────────────────────────────────────────────┘


## CHECKLIST DE INFORMACIÓN EN FIREBASE

Cada conductor debe tener esta estructura EXACTA:

{
  "TX52": {
    "id": "TX52",
    "name": "Carlos López",
    "conductor": "Carlos López",
    "lat": 17.4572,
    "lng": -97.2311,
    "speed": 45,
    "accuracy": 15,
    "status": "LIBRE",              ⭐ MAYÚSCULAS (LIBRE, OCUPADO, DESCANSO)
    "online": true,                 ⭐ Boolean, no string
    "ultimoReporte": 1711782450000,
    "timestamp": 1711782450000,
    "lastSeen": 1711782450000,
    "viaje": null
  }
}

VALIDACIÓN:
✅ status es STRING en MAYÚSCULAS
✅ online es BOOLEAN (true/false, no "true"/"false")
✅ lat y lng son NUMBER (no string)
✅ timestamp es NUMBER (milisegundos)
❌ status NO contiene minúsculas: "libre" ← INCORRECTO
❌ status NO contiene espacios: " LIBRE " ← INCORRECTO
❌ online NO es string: "true" ← INCORRECTO
