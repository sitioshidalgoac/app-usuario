# 📊 DIAGRAMA DE FLUJO: Sistema Compartir Viaje

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    SITIOS HIDALGO GPS ECOSYSTEM                │
│                  Compartir Viaje en Tiempo Real                 │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────┐         ┌──────────────────┐
│  APP_USUARIO      │         │   Firebase      │
│  (Pasajero)       │────────▶│   Realtime DB   │
│                   │◀────────│                  │
│ • Solicita viaje  │         │ • viajes_       │
│ • Comparte viaje  │         │   compartidos    │
│ • Actualiza GPS   │         │ • Escucha       │
└───────────────────┘         │   cambios       │
         ▲                     └──────────────────┘
         │                             ▲
         │                             │
         │ ┌───────────────────┐      │
         └─┤   track.html      │──────┘
           │  (Receptor)       │
           │                   │
           │ • Ve mapa en TiR  │
           │ • Calcula distancia
           │ • Recibe actualizac
           └───────────────────┘
```

---

## 2. Flujo Principal: Compartir Viaje

```
START: Usuario solicita taxi
│
├─ [solicitarTaxi()]
│  ├─ Valida destino
│  ├─ Busca taxis libres cercanos
│  ├─ Encuentra taxi más cercano
│  └─ Crea registro en Firebase: unidades/{unitId}/viaje
│
├─ [activeViaje asignado]
│  └─ {unitId, destino, conductor}
│
├─ [iniciarCompartirViaje()] ◀── AUTOMÁTICO
│  ├─ Valida activeViaje
│  ├─ CREATE: /viajes_compartidos/{viajeCompartidoId}
│  │  ├─ usuario: window.myName
│  │  ├─ telefono: window.myPhone
│  │  ├─ nroUnidad: activeViaje.unitId
│  │  ├─ destino: activeViaje.destino
│  │  ├─ conductor: activeViaje.conductor
│  │  ├─ latInicial: window.myLat
│  │  ├─ lngInicial: window.myLng
│  │  ├─ ts: Date.now()
│  │  └─ activo: true
│  │
│  ├─ Inicia setInterval(actualizarUbicacionCompartida, 5000)
│  │  └─ Cada 5 segundos:
│  │     └─ UPDATE: /viajes_compartidos/{id}/ubicacionActual
│  │        ├─ lat: window.myLat (actual)
│  │        ├─ lng: window.myLng (actual)
│  │        └─ ts: Date.now()
│  │
│  └─ Retorna: viajeCompartidoId
│
├─ [Botón 📤 visible en pantalla]
│  └─ Usuario puede presionar para compartir
│
├─ [Usuario toca botón 📤]
│  └─ [compartirViaje()]
│
└─ Continúa en: "Flujo Modal Compartir"

END (cuando viaje termina)
```

---

## 3. Flujo Modal Compartir

```
START: Usuario toca botón 📤
│
├─ [compartirViaje()]
│  │
│  ├─ [generarEnlaceCompartido()]
│  │  └─ Retorna: 
│  │     https://sitios-hidalgo-track.web.app/track?id={viajeCompartidoId}
│  │
│  ├─ Intenta navigator.share()
│  │  ├─ Si ÉXITO:
│  │  │  └─ Se abre selector nativo de apps (WhatsApp, SMS, etc)
│  │  │     └─ END: Usuario comparte desde ahí
│  │  │
│  │  └─ Si FALLA (no soportado):
│  │     └─ Continúa...
│  │
│  └─ [mostrarOpcionesCompartir()]
│
├─ Modal se abre (translateY animation)
│  │
│  ├─ Muestra:
│  │  ├─ Título: "📤 Compartir Viaje"
│  │  ├─ Mensaje preview:
│  │  │  "Hola, te comparto mi ubicación de taxi en tiempo real: [Enlace]"
│  │  ├─ Input: Enlace copiable
│  │  │  └─ Botón "Copiar"
│  │  ├─ Divider: "ó"
│  │  ├─ [WhatsApp Directo]
│  │  ├─ [Copiar Mensaje]
│  │  └─ [Cerrar]
│  │
│  └─ Usuario elige opción:
│
├─ OPCIÓN A: Button "📱 Enviar por WhatsApp"
│  │
│  └─ [compartirPorWhatsApp()]
│     ├─ Construye URL: https://wa.me/?text={MESSAGE_ENCODED}
│     │  └─ MESSAGE = "Hola, te comparto..." + "{ENLACE}"
│     │  └─ Encoded con encodeURIComponent()
│     ├─ Abre URL en nueva tab
│     └─ END: WhatsApp Web/App abre con mensaje prefill
│
├─ OPCIÓN B: Botón "📋 Copiar Mensaje"
│  │
│  └─ [copiarAlPortapapeles('message')]
│     ├─ Mensaje = "Hola, te comparto mi ubicación..." + enlace
│     ├─ navigator.clipboard.writeText(mensaje)
│     │  ├─ Éxito: Toast "✅ Copiado"
│     │  └─ Falla: Fallback textarea
│     └─ END: Usuario pega en app de elección
│
├─ OPCIÓN C: Botón "Copiar" (input de enlace)
│  │
│  └─ [copiarAlPortapapeles('link')]
│     ├─ Copia solo: https://sitios-hidalgo-track.web.app/track?id=...
│     ├─ navigator.clipboard.writeText(enlace)
│     │  ├─ Éxito: Toast "✅ Enlace copiado"
│     │  └─ Falla: Fallback textarea
│     └─ END: Usuario pega en app de elección
│
└─ OPCIÓN D: Cerrar modal
   └─ Viaje sigue activo, actualizando ubicación cada 5s
```

---

## 4. Flujo Ubicación Real-Time

```
¿Cada cuándo actualiza?
│
├─ setInterval(actualizarUbicacionCompartida, 5000)
│  │
│  └─ Cada 5 segundos:
│     │
│     ├─ Lee: window.myLat, window.myLng
│     │  └─ Proviene de: navigator.geolocation.watchPosition()
│     │     (actualizado cada tiempo que el GPS envía)
│     │
│     ├─ Valida: lat != null && lng != null
│     │
│     ├─ UPDATE Firebase:
│     │  └─ /viajes_compartidos/{viajeId}/ubicacionActual
│     │     ├─ lat: número
│     │     ├─ lng: número
│     │     └─ ts: timestamp
│     │
│     ├─ [Firebase procesa actualización]
│     │  └─ Dispara eventos en todos los listeners
│     │
│     └─ [track.html recibe actualización]
│        ├─ Actualiza marcador de taxi en mapa
│        ├─ Calcula distancia (Haversine)
│        └─ Actualiza info panel (distancia, hora)
│
├─ Mientras viaje está activo:
│  └─ Este ciclo se repite cada 5 segundos
│
└─ Cuando viaje termina:
   └─ clearInterval() detiene el ciclo
```

---

## 5. Flujo Receptor: Seguimiento en track.html

```
START: Receptor recibe WhatsApp con enlace
│
├─ ["Hola, te comparto mi ubicación... https://sitios-hidalgo-track.web.app/track?id=XXXXX"]
│  └─ Receptor toca enlace
│
├─ [Navegador abre track.html]
│  └─ URL param: ?id=XXXXX (viajeCompartidoId)
│
├─ [window.onload]
│  │
│  ├─ [initFirebase()]
│  │  └─ Conecta a Firebase config
│  │
│  ├─ [initMap() con Leaflet]
│  │  ├─ Crea contenedor #map
│  │  ├─ Centro inicial: [18.1, -102.5] (México)
│  │  ├─ Zoom: 13
│  │  └─ Tiles: OpenStreetMap
│  │
│  ├─ [Extrae viajeId]
│  │  └─ viajeId = new URLSearchParams(window.location.search).get('id')
│  │
│  ├─ [Listener 1: Datos del viaje]
│  │  └─ onValue(/viajes_compartidos/{viajeId})
│  │     ├─ Lee: usuario, conductor, nroUnidad, destino
│  │     ├─ Valida: activo == true
│  │     │  ├─ Sí: Mostrar info
│  │     │  └─ No: Mostrar "Viaje finalizado"
│  │     └─ Actualiza info panel:
│  │        ├─ Conductor: Carlos
│  │        ├─ Taxi: TAXI123
│  │        ├─ Destino: Centro
│  │        └─ Pasajero: Juan
│  │
│  └─ [Listener 2: Ubicación actual]
│     └─ onValue(/viajes_compartidos/{viajeId}/ubicacionActual)
│        └─ Se ejecuta cada 5 segundos:
│           │
│           ├─ Lee: {lat, lng, ts}
│           │  └─ Ubicación ACTUAL del taxi
│           │
│           ├─ Actualiza marcador en mapa
│           │  └─ 🚕 naranja en posición (lat, lng)
│           │
│           ├─ Si GPS del receptor activo:
│           │  ├─ Calcula distancia (Haversine)
│           │  ├─ Distancia = dist(myLat, myLng, taxiLat, taxiLng)
│           │  └─ Muestra: "Taxi está a 500m"
│           │
│           ├─ Auto-center mapa a taxi
│           │  └─ mapa.flyTo([lat, lng], 17)
│           │
│           ├─ Actualiza timestamp:
│           │  └─ "Última actualización: hace 2 segundos"
│           │
│           └─ Status: "En línea" (pulsing green dot)
│
├─ [Receptor interactúa]
│  │
│  ├─ Botón "📱 Contactar"
│  │  └─ Abre WhatsApp: wa.me/{numeroTaxi}
│  │
│  ├─ Botón "📍 Copiar Coordenadas"
│  │  └─ Copia: "25.123456, -103.456789"
│  │
│  └─ Zoom/Pan mapa libremente
│
├─ [Viaje termina en app.js]
│  │
│  └─ [detenerCompartirViaje()]
│     ├─ UPDATE: /viajes_compartidos/{viajeId}/activo = false
│     └─ Firebase notifica listeners
│        └─ track.html detecta cambio:
│           ├─ Limpia interval de actualización
│           ├─ Muestra badge: "Viaje finalizado"
│           └─ Botones deshabilitados
│
└─ END: Receptor ve información final del viaje
```

---

## 6. Diagrama Firebase Nodes

```
Firebase Realtime Database
└─ viajes_compartidos/
   │
   ├─ -NnKLmOpQr3x5Z7Y2aB/  ◀── viajeCompartidoId (PUSH generado)
   │  │
   │  ├─ usuario: "Juan"
   │  ├─ telefono: "+52 1234567890"
   │  ├─ nroUnidad: "TAXI123"
   │  ├─ destino: "Centro Comercial"
   │  ├─ conductor: "Carlos"
   │  ├─ latInicial: 25.123456
   │  ├─ lngInicial: -103.456789
   │  ├─ ts: 1699564800000
   │  ├─ activo: true
   │  │
   │  └─ ubicacionActual/  ◀── Se actualiza cada 5s
   │     ├─ lat: 25.124567    (cambió)
   │     ├─ lng: -103.457890  (cambió)
   │     └─ ts: 1699564805000 (actualizado)
   │
   └─ -NnKLmOpQr3x5Z7Y2bC/  ◀── Otro viaje simultáneo
      ├─ usuario: "María"
      ├─ nroUnidad: "TAXI456"
      ├─ ... (similar)
      └─ ubicacionActual/
         └─ ...
```

---

## 7. Ciclo de Vida Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    LÍNEA DE TIEMPO DE VIAJE                     │
└─────────────────────────────────────────────────────────────────┘

[T=0s]     Usuario solicita taxi
           ├─ solicitarTaxi() llamado
           └─ iniciarCompartirViaje() automático
              └─ /viajes_compartidos/{id} created ✓
                 activo: true

[T=5s]     Ubicación 1 actualizada
           └─ /viajes_compartidos/{id}/ubicacionActual
              └─ track.html listener recibe (si está abierto)

[T=10s]    Ubicación 2 actualizada
           └─ track.html recibe

[T=15s]    Usuario presiona 📤
           ├─ Modal abre
           ├─ Muestra enlace
           └─ Usuario elige: WhatsApp

[T=20s]    Contacto recibe WhatsApp
           ├─ Toca enlace
           └─ track.html abre
              └─ Listener se subscribe a ubicacionActual

[T=25s]    Ubicación 3 actualizada
           ├─ APP: /viajes_compartidos/{id}/ubicacionActual
           └─ track.html: Actualiza mapa (+ 5 segundos de latencia típica)

...

[T=3min]   Taxi llega a destino
           ├─ Usuario califica
           └─ enviarRating() llamado
              └─ _mostrarRating() → detenerCompartirViaje()
                 └─ /viajes_compartidos/{id}/activo = false
                    └─ clearInterval() detiene GPS polling

[T=3min+1s] track.html detecta cambio
           ├─ activo: false
           ├─ Detiene listener
           ├─ Muestra "Viaje finalizado"
           └─ Botones deshabilitados

[T=9999s]  Viaje archivado en historial
           └─ Visible en APP_USUARIO > Historial de viajes
```

---

## 8. Estados Posibles

```
┌────────────────────────────────────────────┐
│      ESTADOS DEL VIAJE COMPARTIDO          │
└────────────────────────────────────────────┘

1. NO_INICIADO
   ├─ No hay viaje activo
   └─ Botón 📤 no visible

2. INICIANDO
   ├─ solicitarTaxi() en progreso
   ├─ Buscando taxi
   └─ Botón 📤 deshabilitado

3. COMPARTIENDO_INACTIVO
   ├─ Viaje asignado
   ├─ Compartir iniciado (registro en Firebase)
   ├─ Ubicación actualiza q 5s
   └─ Usuario puede compartir (botón activo)

4. COMPARTIENDO_ACTIVO_COMPARTIDO
   ├─ Viaje compartido
   ├─ Modal abierto o receptor viendo
   ├─ Ubicación actualiza q 5s
   └─ Usuarios viendo track.html

5. FINALIZANDO
   ├─ Taxi llegó o usuario canceló
   ├─ Modal rating abierto
   ├─ detenerCompartirViaje() ejecutándose
   └─ Botón 📤 deshabilitado

6. FINALIZADO
   ├─ activo: false en Firebase
   ├─ Viaje archivado
   ├─ track.html muestra "Finalizado"
   └─ Ningún usuario puede compartir

7. ERROR
   ├─ Fallo GPS
   ├─ Fallo Firebase
   ├─ Viaje inválido
   └─ Mostrar toast de error
```

---

## 9. Manejo de Errores

```
┌─────────────────────────────────────────┐
│         ESCENARIOS DE ERROR             │
└─────────────────────────────────────────┘

ERROR 1: Sin GPS
├─ Causa: navigator.geolocation no disponible
├─ Dónde: iniciarCompartirViaje()
├─ Acción: showToast("❌ GPS no disponible")
└─ Resultado: Compartir no inicia

ERROR 2: Firebase desconectado
├─ Causa: .read/.write permission denied
├─ Dónde: SET ubicacionActual
├─ Acción: console.error("Firebase error")
└─ Resultado: Ubicación no actualiza

ERROR 3: Viaje no encontrado en track.html
├─ Causa: viajeId inválido o viaje no existe
├─ Dónde: onValue(/viajes_compartidos/{viajeId})
├─ Acción: Mostrar "Viaje no encontrado"
└─ Resultado: Mostrar botón "Reintentar"

ERROR 4: WhatsApp no disponible
├─ Causa: No hay WhatsApp instalado o URL malformada
├─ Dónde: compartirPorWhatsApp()
├─ Acción: window.open() fallback
└─ Resultado: Abre navegador WhatsApp Web

ERROR 5: Clipboard no disponible
├─ Causa: No HTTPS o navigator.clipboard undefined
├─ Dónde: copiarAlPortapapeles()
├─ Acción: Fallback textarea + execCommand
└─ Resultado: Copia igual funciona

ERROR 6: Geolocalización lenta en track.html
├─ Causa: GPS tarda en obtener ubicación
├─ Dónde: navigator.geolocation.getCurrentPosition()
├─ Acción: Mostrar spinner "Obteniendo ubicación..."
└─ Resultado: Distancia se calcula cuando está disponible
```

---

## 10. Secuencia Típica Completa

```
┌─────────────────────────────────────────────────┐
│       SECUENCIA: "Usuario Comparte Viaje         │
│        con Hermana por WhatsApp"                │
└─────────────────────────────────────────────────┘

1.  Juan abre APP_USUARIO
    ├─ GPS enabled
    └─ Selecciona base

2.  Juan presiona "Solicitar Servicio"
    ├─ Abre modal
    └─ Escribe destino: "Centro"

3.  Juan presiona "SOLICITAR SERVICIO PREMIUM"
    ├─ app.js: solicitarTaxi()
    ├─ Busca taxis libres
    ├─ Encuentra TAXI123 a 200m
    ├─ Crea en Firebase: unidades/TAXI123/viaje
    ├─ activeViaje = {unitId: "TAXI123", destino: "Centro", conductor: "Carlos"}
    └─ AUTOMÁTICO: iniciarCompartirViaje()
       ├─ Crea: /viajes_compartidos/-NnKLmOpQr3x5Z7Y2aB/
       ├─ con todos los datos
       ├─ activo: true
       └─ Inicia setInterval() cada 5s para ubicacion

4.  APP_USUARIO muestra banner
    ├─ "🚖 TAXI123 - Carlos hacia Centro"
    ├─ Botón ❌ CANCELAR
    └─ Botón 📤 COMPARTIR visible

5.  Juan espera 10 segundos (mientras taxi viene)

6.  Juan presiona botón 📤
    ├─ app.js: window.compartirViaje?.()
    ├─ share.js: compartirViaje()
    ├─ Intenta navigator.share() (no soportado)
    └─ Muestra modal compartir
       ├─ Título: "📤 Compartir Viaje"
       ├─ Enlace: https://sitios-hidalgo-track.web.app/track?id=-NnKLmOpQr3x5Z7Y2aB
       ├─ Mensaje preview
       └─ Botones: [WhatsApp] [Copiar] [Cerrar]

7.  Juan presiona "📱 Enviar por WhatsApp"
    ├─ share.js: compartirPorWhatsApp()
    ├─ Construye: https://wa.me/?text=Hola%2C%20te%20comparto...%0A%0Ahttps%3A%2F%2Fsitios-hidalgo-track...
    └─ window.open(url) abre WhatsApp Web

8.  WhatsApp Web abre
    ├─ Juan busca y selecciona "Hermana"
    ├─ Mensaje ya está pre-relleno:
    │  "Hola, te comparto mi ubicación de taxi en tiempo real:
    │   https://sitios-hidalgo-track.web.app/track?id=-NnKLmOpQr3x5Z7Y2aB"
    └─ Juan presiona ENVIAR

9.  Hermana recibe WhatsApp
    ├─ Notificación push en teléfono
    └─ Lee: "Hola, te comparto mi ubicación..."

10. Hermana toca el enlace
    ├─ Navegador abre track.html
    ├─ URL param: ?id=-NnKLmOpQr3x5Z7Y2aB
    └─ Script inicia:
       ├─ Carga mapa (Leaflet)
       ├─ Listener 1: Obtiene datos del viaje
       │  └─ usuario: "Juan"
       │  └─ conductor: "Carlos"
       │  └─ nroUnidad: "TAXI123"
       │  └─ destino: "Centro"
       │  └─ activo: true ✓
       ├─ Listener 2: Obtiene ubicación actual
       │  └─ lat: 25.124567
       │  └─ lng: -103.457890
       │  └─ ts: 1699564805000
       └─ Muestra:
          ├─ Mapa con marcador 🚕 taxi en ubicación actual
          ├─ Info: "Juan - TAXI123 - Carlos - Destino: Centro"
          ├─ Distancia: "Taxi está a 800m (calculado por GPS)"
          ├─ Status: "En línea" (pulsing)
          └─ Botones: [📱 Contactar] [📍 Copiar coords]

11. Hermana ve taxi acercándose en mapa
    ├─ Cada 5 segundos (sincronizado con Juan):
    ├─ track.html recibe actualización de ubicación
    ├─ Marcador se mueve
    ├─ Distancia se recalcula
    └─ "Taxi está a 400m... 200m... 50m..."

12. Juan llega a destino
    ├─ Taxi se estaciona
    ├─ Ubicación final en track.html

13. APP_USUARIO muestra rating
    ├─ _mostrarRating()
    ├─ Llama: detenerCompartirViaje()
    │  └─ UPDATE: /viajes_compartidos/{id}/activo = false
    ├─ clearInterval() detiene GPS polling
    └─ Firebase notifica listeners

14. track.html (Hermana) detecta cambio
    ├─ Firebase listener recibe: activo: false
    ├─ Detiene actualizaciones
    ├─ Limpia interval
    └─ Muestra: "Viaje finalizado"

15. Juan califica viaje
    ├─ Selecciona estrellas
    ├─ Presiona "ENVIAR"
    ├─ Viaje archivado en historial

FIN: Viaje completado exitosamente
```

---

## 11. Diagrama de Componentes

```
┌────────────────────────────────────────────────────────┐
│            COMPONENTES DEL SISTEMA                    │
└────────────────────────────────────────────────────────┘

APP_USUARIO
├─ index.html
│  ├─ Botón compartir (📤)
│  ├─ Modal compartir (overlay + box)
│  └─ Estilos CSS (380+ líneas)
│
├─ js/app.js
│  ├─ Imports de share.js
│  ├─ solicitarTaxi() → iniciarCompartirViaje()
│  ├─ cancelarSolicitud() → detenerCompartirViaje()
│  ├─ _mostrarRating() → detenerCompartirViaje()
│  └─ Window exports de funciones
│
├─ js/share.js (235 líneas)
│  ├─ iniciarCompartirViaje()
│  ├─ actualizarUbicacionCompartida() [internal]
│  ├─ generarEnlaceCompartido()
│  ├─ compartirViaje()
│  ├─ compartirPorWhatsApp()
│  ├─ mostrarOpcionesCompartir() [internal]
│  ├─ copiarAlPortapapeles()
│  ├─ detenerCompartirViaje()
│  ├─ mostrarToastCompartir() [internal]
│  └─ Firebase refs & listeners
│
├─ js/mapa.js
│  └─ actualizarMiPosicion() → window.myLat/myLng
│
└─ js/utils.js
   └─ showToast() para notificaciones


base/public/
├─ track.html (450+ líneas)
│  ├─ Firebase config
│  ├─ Leaflet initialization
│  ├─ Listeners 1 & 2
│  ├─ GPS tracking
│  ├─ Distance calculation
│  ├─ Handlers para botones
│  └─ Error handling
│
└─ index.html (para base)


Firebase Realtime
├─ /viajes_compartidos/
│  ├─ Crear datos de viaje
│  ├─ Actualizar ubicacionActual cada 5s
│  ├─ Marcar activo = false cuando termina
│  └─ Listeners en app.js y track.html
│
└─ /unidades/{id}/viaje (existente)
   └─ Ya creado por solicitarTaxi()
```

---

## 12. Matriz de Responsabilidades

```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│   Componente     │  Crear Viaje │  Compartir   │ Recibir/Track
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ app.js           │      ✓       │   Llamar     │      —       │
│ share.js         │      ✓       │      ✓       │      —       │
│ track.html       │      —       │      —       │      ✓       │
│ Firebase DB      │      ✓       │   Escuchar   │   Escuchar   │
│ Geolocation API  │      ✓       │      ✓       │      ✓       │
│ Web Share API    │      —       │      ✓       │      —       │
│ Clipboard API    │      —       │      ✓       │      ✓       │
│ Leaflet Map      │      —       │      —       │      ✓       │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Conclusión: Flujo Exitoso

✅ **Viaje Creado** → ✅ **Compartido Automático** → ✅ **Enlace Generado**  
→ ✅ **Usuario Elige Compartir** → ✅ **Receptor Recibe** → ✅ **Seguimiento Real-Time**  
→ ✅ **Viaje Completado** → ✅ **Rastreabilidad Total**

El sistema está completamente integrado y listo para producción.
