## CONTEXTO DEL PROYECTO

Sistema GPS de taxi "SHidalgo Kué'in" con 3 apps web (HTML single-file) que comparten Firebase:

- **App Usuario:** `C:\Users\LapHP\Desktop\Proyecto\APP_USUARIO\index.html`
- **App Conductor:** `C:\Users\LapHP\Desktop\Proyecto\conductor\index.html`
- **App Base Central:** `C:\Users\LapHP\Desktop\Proyecto\base-gps\index.html`

Firebase project: `sitios-hidalgo-gps`
RTDB: `sitios-hidalgo-gps-default-rtdb.firebaseio.com`
API Key: `AIzaSyDEu6dOk9mUqXp52lyY6vBEm4GAsgU0ESU`

## PROBLEMA: Las 3 apps NO se comunican correctamente

Hay 5 desajustes de datos entre App Usuario y App Conductor que impiden que el flujo de viaje funcione:

### BUG 1 — Estado incorrecto
- App Usuario escribe: `estado: 'pendiente'`
- App Conductor escucha: `.where('estado', '==', 'enviado')`
- **FIX:** Cambiar en App Usuario a `estado: 'enviado'`

### BUG 2 — Falta unidadId (campo crítico)
- App Usuario NO incluye `unidadId` en la solicitud
- App Conductor filtra: `.where('unidadId', '==', driverUnit)`
- **FIX:** App Usuario debe encontrar el conductor más cercano de RTDB y escribir su `unidadId` en la solicitud. Los conductores están en RTDB nodo `/unidades/{unitId}` con campos `lat`, `lng`, `estado`. El conductor más cercano con `estado !== 'inactivo'` y `estado !== 'ocupado'` es el que se asigna.

### BUG 3 — Falta clienteNombre
- App Usuario NO incluye `clienteNombre`
- App Conductor espera `sol.clienteNombre` para mostrar en el modal
- **FIX:** Obtener de `localStorage.getItem('usuarioNombre')` y agregarlo a la solicitud

### BUG 4 — Estado de respuesta no coincide
- App Usuario espera: `d?.estado === 'aceptada'`
- App Conductor escribe: `estado: 'aceptado'`
- **FIX:** Cambiar en App Usuario a `d?.estado === 'aceptado'`

### BUG 5 — Nodo RTDB incorrecto para taxis en mapa
- App Usuario lee: `rtdb.ref('conductores')`
- App Conductor escribe en: `rtdb.ref('unidades/' + unitId)`
- **FIX:** Cambiar en App Usuario a `rtdb.ref('unidades')` y ajustar el parsing

## INSTRUCCIONES

1. Lee los 3 archivos index.html de las 3 apps para entender la estructura exacta de datos
2. Corrige SOLO la App Usuario (`APP_USUARIO/index.html`) para que:
   - La solicitud use `estado: 'enviado'`
   - Incluya `unidadId` del conductor más cercano (calcular distancia haversine desde los conductores en RTDB `/unidades`)
   - Incluya `clienteNombre` desde localStorage
   - Escuche la respuesta con `estado === 'aceptado'` (no 'aceptada')
   - Lea los taxis en mapa desde `rtdb.ref('unidades')` en vez de `rtdb.ref('conductores')`
3. NO modifiques la App Conductor ni la App Base — solo la App Usuario
4. Mantén todo el diseño visual y CSS intacto
5. Mantén el Service Worker registration intacto al final del archivo

## FLUJO CORRECTO QUE DEBE QUEDAR

```
Usuario pulsa "SOLICITAR VIAJE"
  → getCurrentPosition (GPS)
  → Lee RTDB /unidades para encontrar conductor más cercano libre
  → Escribe en Firestore solicitudes/{id}:
      {
        usuarioId: uid,
        clienteNombre: localStorage.getItem('usuarioNombre') || 'Usuario',
        unidadId: conductorMasCercano.id,
        lat: userLat,
        lng: userLng,
        estado: 'enviado',
        timestamp: serverTimestamp()
      }
  → Escucha onSnapshot en solicitudes/{id}:
      if estado === 'aceptado' → mostrar "Conductor en camino"
      if estado === 'completado' → mostrar calificación
      if estado === 'cancelada' → mostrar "Viaje cancelado"
```

## DATOS QUE ESCRIBE EL CONDUCTOR AL ACEPTAR (referencia, no modificar)

```javascript
// Batch atómico en App Conductor:
batch.update(solicitudes/{id}, { estado: 'aceptado' })
batch.set(viajes/{id}, { estado: 'en_camino', ... })
batch.update(unidades/{id}, { estado: 'ocupado' })
```

Haz los cambios y explícame qué modificaste.
