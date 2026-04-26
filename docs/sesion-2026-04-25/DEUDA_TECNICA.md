# Deuda Técnica — SHidalgo Kué'in
Detectada en QA del 2026-04-24. Ordenada por prioridad.

---

## PRIORIDAD ALTA — Resolver en 2 semanas

### DT-01 · Migración Google Maps: Marker → AdvancedMarkerElement
**App:** base-gps  
**Síntoma:** 30+ warnings en consola, 11 issues detectados por Chrome DevTools.  
`google.maps.Marker` fue deprecado en febrero 2024 y retirará soporte en 2026.  
**Impacto actual:** Funciona pero genera ruido; el día que Google retire el soporte el mapa de Base deja de mostrar marcadores.  
**Acción:** Reemplazar todas las instancias de `new google.maps.Marker({...})` por `new google.maps.marker.AdvancedMarkerElement({...})`. Requiere añadir `mapId` en la inicialización del mapa.  
**Archivos:** `base-gps/index.html` — función `upsertUnit()` (~línea 1939) y `createUnitIcon()` (~línea 1877).

---

### DT-02 · Migración Google Maps: Autocomplete → PlaceAutocompleteElement
**App:** base-gps  
**Síntoma:** `google.maps.places.Autocomplete` marcado como deprecado desde marzo 2025.  
**Impacto actual:** Funciona hoy; se romperá al retirar soporte.  
**Acción:** Reemplazar `new google.maps.places.Autocomplete(input)` por `new google.maps.places.PlaceAutocompleteElement()` con el nuevo API de Places.  
**Archivos:** `base-gps/index.html` — sección de búsqueda de direcciones.

---

### DT-03 · AudioContext bloqueado en alertas SOS
**App:** base-gps  
**Síntoma:** El audio de alerta SOS no suena en Chrome hasta que el usuario interactúa con la página. `AudioContext` es bloqueado por política de autoplay del browser.  
**Impacto actual:** Operador de base puede no escuchar la alerta SOS si acaba de cargar la página.  
**Acción:** Crear el `AudioContext` dentro de un evento de usuario (click en login o en cualquier botón), no en la inicialización. Guardar la referencia y usarla para reproducir alertas.  
**Archivos:** `base-gps/index.html` — función `playSOSAudio()`.

---

### DT-04 · Script de limpieza automática SOS zombies (TTL)
**Apps:** base-gps, functions  
**Síntoma:** Las alertas SOS en `/alertas_sos` no se auto-eliminan. Si un conductor no cierra el SOS manualmente (o pierde conexión), el banner en Base queda activo indefinidamente.  
**Impacto actual:** Banner SOS zombie ya ocurrió en QA; operadores no pueden confiar en que el banner refleja estado real.  
**Acción:** Añadir a `limpiarDatos` (Cloud Function, `functions/index.js`) una purga de nodos en `/alertas_sos` con más de N horas de antigüedad. Alternativamente, añadir campo `expiresAt` al escribir SOS y filtrar en el listener de Base.  
**Archivos:** `functions/index.js` — función `limpiarDatos()` (~línea 205).

---

## PRIORIDAD MEDIA — Resolver en 1 mes

### DT-05 · Inconsistencia de colores en mapa de Base (libre vs activo)
**App:** base-gps  
**Síntoma:** `createUnitIcon()` usa **verde** para estado `libre` y **naranja** para `activo`. El panel lateral y la leyenda usan **ámbar** para `libre` y **verde** para `activo`. Contradicción visual.  
**Impacto actual:** Operador ve marcadores de color incorrecto en el mapa de Google Maps.  
**Acción:** Invertir los colores en `createUnitIcon()`:
```js
// base-gps/index.html ~línea 1880
libre:   { bg: '#7a4e10', border: '#f59e0b' },  // ámbar = disponible
activo:  { bg: '#1a6b4a', border: '#2dd4a0' },  // verde = con servicio
```
**Archivos:** `base-gps/index.html` — función `createUnitIcon()` línea ~1881.

---

### DT-06 · APP_USUARIO no muestra conductores sin GPS activo
**App:** APP_USUARIO  
**Síntoma:** El filtro de la línea 559 requiere `c.lat && c.lng`. Un conductor que se logea pero no tiene GPS activo (o cuya señal tardó en llegar) no aparece en el mapa ni en el conteo, aunque su `status` sea `libre`.  
**Impacto actual:** En producción es mitigado porque los conductores usan teléfonos con GPS. En local no se puede validar.  
**Acción a evaluar:** Mostrar conductores sin coordenadas en el conteo pero no en el mapa, o añadir tolerancia de N minutos desde la conexión antes de filtrarlos.  
**Archivos:** `APP_USUARIO/index.html` líneas 527, 539, 559.

---

## NOTAS

- DT-01 y DT-02 pueden hacerse en un solo PR ya que están en el mismo archivo.
- DT-03 debe hacerse antes de depender de alertas SOS en turno nocturno.
- DT-04 es la solución permanente a los SOS zombie; la limpieza manual de hoy es un parche.
- DT-05 y DT-06 son cosméticos/UX y no bloquean operación.

## DT-08 � Color inconsistente unidad
- S�ntoma: unidad aparece verde en panel izquierdo y amarillo en dashboard
- App: :5005 conductor
- Prioridad: baja
- Detectado: 26/04/2026

## DT-09 � Chat usuario-conductor no funciona
- S�ntoma: mensajes no se entregan entre :5000 y :5005
- Prioridad: alta
- Detectado: 26/04/2026

## DT-10 � FirebaseError: Missing or insufficient permissions
- S�ntoma: error en consola :5000 al intentar chat
- Causa probable: Firestore rules no permiten escritura en colecci�n chat
- Prioridad: alta (relacionado DT-09)
- Detectado: 26/04/2026

## DT-11 � JSON inv�lido en reporte encabezado :5006
- S�ntoma: 'el valor JSON recibido no es v�lido' en consola base
- Prioridad: media
- Detectado: 26/04/2026
