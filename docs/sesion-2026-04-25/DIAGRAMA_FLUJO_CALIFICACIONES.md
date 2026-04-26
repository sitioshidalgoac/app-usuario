# 📊 DIAGRAMA DE FLUJO: Sistema de Calificación

## 1. Flujo Principal de Calificación

```
┌─────────────────────────────────────────────────────────────────┐
│            FLUJO AUTOMÁTICO DE CALIFICACIÓN                    │
└─────────────────────────────────────────────────────────────────┘

[APP_USUARIO solicita taxi]
         ↓
[solicitarTaxi()] en app.js
  ├─ Valida destino
  ├─ Busca taxis libres
  ├─ Encuentra más cercano
  └─ Crea viaje
         ↓
[Viaje asignado] → activeViaje = {unitId, destino, conductor}
         ↓
[30 segundos después...]
         ↓
[setTimeout(() => _mostrarRating(), 30000)]
         ↓
[_mostrarRating()] en app.js
  ├─ Valida que activeViaje exista
  ├─ Guarda datos: rateData = {...activeViaje}
  ├─ Marca activeViaje = null
  ├─ Detiene compartir viaje
  ├─ Cierra banner de viaje
  └─ Llama: mostrarModalCalificacion(rateData)
         ↓
[mostrarModalCalificacion()] en rating.js
  ├─ Guarda viajeData en pendingRating
  ├─ Reset de variables (stars=5, comment="")
  ├─ Obtiene elemento #rate-unit
  ├─ Escribe: "Carlos — TAXI123"
  ├─ Obtiene elemento #rate-comment-input
  ├─ Limpia campo
  ├─ Llama: mostrarEstrellas(5)
  ├─ Llama: actualizarFeedback(5)
  ├─ Llama: inicializarCalificacion()
  │  └─ Crea 5 estrellas clickeables
  │  └─ Agrega listeners de hover/click
  └─ Abre modal con: modal.classList.add("open")
         ↓
[MODAL ABIERTO - Usuario interactúa]
```

---

## 2. Interacción del Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│             USUARIO SELECCIONA CALIFICACIÓN                     │
└─────────────────────────────────────────────────────────────────┘

ESCENARIO A: Hover sobre estrellas
───────────────────────────────────

Estrella 1 ← Mouse entra
         ↓
previewEstrellas(1)
  └─ Muestra 1 estrella brillante
         ↓
Mouse sale
         ↓
mostrarEstrellas(ratingState.stars)
  └─ Vuelve a mostrar selección anterior (ej: 5)


ESCENARIO B: Click en estrella
──────────────────────────────

Click en estrella 4
         ↓
onclick="window.setStar(4)"
         ↓
actualizarEstrellas(4)
  ├─ ratingState.stars = 4
  ├─ mostrarEstrellas(4)
  │  └─ Classes "on" a primeras 4 estrellas
  └─ actualizarFeedback(4)
     └─ scoreEl.textContent = "4/5"
     └─ feedbackEl.textContent = "Muy bueno, gracias 😊"
     └─ feedbackEl.class = "good" (verde)
         ↓
[4 estrellas visibles, feedback actualizado]


ESCENARIO C: Escribir comentario
─────────────────────────────────

Usuario escribe en textarea
         ↓
textarea#rate-comment-input onChange
  └─ Limita a 100 caracteres (maxlength HTML)
         ↓
[Comentario listo para enviar]
```

---

## 3. Envío de Calificación

```
┌─────────────────────────────────────────────────────────────────┐
│          ENVIAR CALIFICACIÓN - 3 PASOS CRÍTICOS                │
└─────────────────────────────────────────────────────────────────┘

Click en botón "ENVIAR CALIFICACIÓN"
         ↓
onclick="window.enviarCalif?.()"
         ↓
window.enviarCalif = window.enviarRating = async function() {
  await enviarCalificacion(db, myName, myPhone)
}
         ↓

═══════════════════════════════════════════════════════════════════
✅ PASO 1: GUARDAR EN COLECCIÓN GLOBAL
═══════════════════════════════════════════════════════════════════

[Preparar datos]
  ├─ comentario = document.getElementById("rate-comment-input").value.trim()
  ├─ rating = ratingState.stars
  ├─ unitId = pendingRating.unitId
  ├─ conductor = pendingRating.conductor
  └─ timestamp = Date.now()

calificacionData = {
  unitId, conductor, cliente: myName, telefono: myPhone,
  rating, comentario, ts: timestamp, destino: pendingRating.destino
}

[PUSH a Firebase]
  └─ push(ref(db, "calificaciones"), calificacionData)
     └─ Firebase genera ID automático
     └─ ✅ Guardado: /calificaciones/{-NnKLmOpQr3x5Z7Y2aB}
         └─ console.log("✅ Calificación guardada:", ref.key)

═══════════════════════════════════════════════════════════════════
✅ PASO 2: ACTUALIZAR PERFIL DEL CONDUCTOR
═══════════════════════════════════════════════════════════════════

actualizarPerfilConductor(db, unitId, conductor, rating, comentario, ts)
         ↓
[Obtener perfil actual]
  └─ const snapshot = await get(ref(db, `conductores/${unitId}`))
     ├─ Si existe: perfil = snapshot.val()
     └─ Si NO existe: perfil = { template vacío }

[Calcular nuevo promedio]
  ├─ perfil.totalCalificaciones = (anterior || 0) + 1
  │  └─ Ejemplo: 126 → 127
  │
  ├─ perfil.sumaRatings = (anterior || 0) + rating
  │  └─ Ejemplo: 630 + 5 = 635
  │
  └─ perfil.promedioRating = (635 / 127).toFixed(2)
     └─ ✨ RESULTADO: 5.00 ⭐

[Actualizar campos]
  ├─ perfil.nombre = conductor
  ├─ perfil.ultimaCalificacion = { rating, comentario, ts }
  ├─ Si comentario:
  │  ├─ perfil.comentarios.unshift({ texto, rating, ts })
  │  └─ perfil.comentarios = perfil.comentarios.slice(0, 10)
  │     (Mantener solo últimos 10)
  └─ perfil.atualizado = true

[SET en Firebase]
  └─ set(ref(db, `conductores/${unitId}`), perfil)
     └─ ✅ Actualizado: /conductores/TAXI123
         └─ console.log(`✅ Promedio: ${perfil.promedioRating}`)

═══════════════════════════════════════════════════════════════════
✅ PASO 3: GUARDAR EN HISTORIAL
═══════════════════════════════════════════════════════════════════

guardarEnHistorial(db, unitId, calificacionData)
         ↓
[PUSH a historial]
  └─ push(
       ref(db, `conductores/${unitId}/historialCalificaciones`),
       calificacionData
     )
     └─ ✅ Guardado: /conductores/TAXI123/historialCalificaciones/{id}
         └─ console.log("✅ Guardado en historial del conductor")

═══════════════════════════════════════════════════════════════════
✅ PASO 4: UI FEEDBACK
═══════════════════════════════════════════════════════════════════

[Cerrar modal]
  └─ modal.classList.remove("open")
     └─ Animación: translateY(100%) en 0.35s

[Mostrar toast]
  └─ mostrarToast(toast, "⭐ ¡Gracias por tu calificación!", 3000)
     └─ Toast autoanima desde arriba
     └─ Se oculta después de 3 segundos

[Reset de estado]
  ├─ pendingRating = null
  └─ ratingState = { stars: 5, comment: "", viajeData: null }

[Logs en consola]
  └─ ✅ Calificación completada exitosamente
       📊 Rating: 5
       💬 Comentario: "Excelente conductor"
       👤 Conductor: Carlos

         ↓
[✅ COMPLETADO EXITOSAMENTE]
```

---

## 4. Estructura Firebase Después del Envío

```
Firebase Realtime Database
│
├─ calificaciones/
│  └─ -NnKLmOpQr3x5Z7Y2aB/
│     ├─ unitId: "TAXI123"
│     ├─ conductor: "Carlos"
│     ├─ cliente: "Juan"
│     ├─ telefono: "..."
│     ├─ rating: 5
│     ├─ comentario: "Excelente conductor"
│     ├─ ts: 1699564800000
│     └─ destino: "Centro"
│
└─ conductores/
   └─ TAXI123/
      ├─ nombre: "Carlos"
      ├─ totalCalificaciones: 127  ← INCREMENTADO
      ├─ sumaRatings: 635         ← ACTUALIZADO
      ├─ promedioRating: 5.00     ← RECALCULADO ⭐
      ├─ ultimaCalificacion/
      │  ├─ rating: 5
      │  ├─ comentario: "Excelente conductor"
      │  └─ ts: 1699564800000
      ├─ comentarios/
      │  └─ [0]/
      │     ├─ texto: "Excelente conductor"
      │     ├─ rating: 5
      │     └─ ts: 1699564800000
      └─ historialCalificaciones/
         └─ -NnKLmOpQr3x5Z7Y2bC/
            └─ [Copia completa de calificación]
```

---

## 5. Cálculo del Promedio (Ejemplo Real)

```
═══════════════════════════════════════════════════════════════════
EJEMPLO: Carlos recibe 3 calificaciones
═══════════════════════════════════════════════════════════════════

[CALIFICACIÓN 1]
  Rating: 5
  └─ totalCalificaciones: 0 → 1
  └─ sumaRatings: 0 → 5
  └─ promedioRating: 5 / 1 = 5.00 ⭐⭐⭐⭐⭐

[CALIFICACIÓN 2]
  Rating: 4
  └─ totalCalificaciones: 1 → 2
  └─ sumaRatings: 5 → 9
  └─ promedioRating: 9 / 2 = 4.50 ⭐⭐⭐⭐

[CALIFICACIÓN 3]
  Rating: 5
  └─ totalCalificaciones: 2 → 3
  └─ sumaRatings: 9 → 14
  └─ promedioRating: 14 / 3 = 4.67 ⭐⭐⭐⭐

[RESULTADO FINAL en /conductores/TAXI123]
  nombre: "Carlos"
  totalCalificaciones: 3
  sumaRatings: 14
  promedioRating: 4.67
  
  En base de datos: promedioRating: 4.67
  En UI: "Promedio: 4.67/5" (si se muestra)
```

---

## 6. Estados Posibles del Sistema

```
ESTADO 1: SIN VIAJE ACTIVO
├─ Modal cerrado
├─ Botón no visible
└─ ratingState = null

ESTADO 2: VIAJE EN PROGRESO
├─ Modal cerrado
├─ Usuario en viaje
├─ 30 segundos contando...
└─ ratingState = null

ESTADO 3: ESPERANDO CALIFICACIÓN
├─ Modal abierto (animate: slideUp)
├─ 5 estrellas por defecto
├─ Campo comentario vacío
├─ ratingState.stars = 5
└─ pendingRating = viajeData

ESTADO 4: USUARIO INTERACTUANDO
├─ Modal abierto
├─ ratingState.stars = [seleccionadas por usuario]
├─ Feedback dinámico mostrado
├─ Comentario: [texto acumulado]
└─ Botón habilitado

ESTADO 5: ENVIANDO
├─ Botón deshabilitado
├─ En progreso: actualizarPerfilConductor()
└─ Esperando respuesta Firebase

ESTADO 6: COMPLETADO
├─ Modal cierra (animate: slideDown)
├─ Toast aparece
├─ ratingState reset = null
├─ Firebase actualizado
└─ Perfil conductor: promedio ✅
```

---

## 7. Validaciones y Errores

```
VALIDACIÓN 1: Viaje pendiente
  if (!pendingRating || !db) {
    console.warn("⚠️ No hay viaje pendiente")
    return ❌
  }

VALIDACIÓN 2: Rating en rango
  if (ratingState.stars < 1 || ratingState.stars > 5) {
    return ❌
  }

VALIDACIÓN 3: Comentario máximo
  comentario = textarea.value.trim()
  if (comentario.length > 100) {
    return ❌
  }

VALIDACIÓN 4: Firebase conectado
  try {
    push(ref(db, "calificaciones"), data)
  } catch (error) {
    console.error("❌ Error Firebase:", error)
    mostrarToast("Error al guardar")
    return ❌
  }

VALIDACIÓN 5: Promedio válido
  if (totalCalificaciones > 0) {
    promedioRating = (sumaRatings / totalCalificaciones).toFixed(2)
    ✅ Válido
  } else {
    promedioRating = 0
  }
```

---

## 8. Logs en Consola (Debug)

```
═══════════════════════════════════════════════════════════════════
LOGS ESPERADOS DURANTE EJECUCIÓN
═══════════════════════════════════════════════════════════════════

[CUANDO SE ABRE MODAL]
✅ Calificación completada exitosamente  (Falsa, pero es debug)

[CUANDO USUARIO SELECCIONA ESTRELLAS]
(Silencioso - solo estado interno)

[CUANDO ENVÍA CALIFICACIÓN]
✅ Calificación guardada: -NnKLmOpQr3x5Z7Y2aB
✅ Perfil actualizado: Carlos
   📊 Promedio: 5.00 (1 calificaciones)
✅ Guardado en historial del conductor

✅ Calificación completada exitosamente
   📊 Rating: 5
   💬 Comentario: "Excelente conductor"
   👤 Conductor: Carlos

[SI HAY ERROR]
❌ Error al enviar calificación: ...
❌ Error al actualizar perfil del conductor: ...
⚠️ No se pudo guardar en historial: ...
```

---

## 9. Timing de Eventos

```
[T=0s]      Usuario solicita taxi
[T=0.5s]    Taxi asignado
[T=30s]     _mostrarRating() automático
[T=30.3s]   Modal abre (animación 0.3s)
[T=30-60s]  Usuario interactúa
[T=65s]     Usuario presiona ENVIAR
[T=65.1s]   Envío inicia
[T=65.2s]   Calificación guardada global
[T=65.3s]   Perfil actualizado
[T=65.4s]   Historial guardado
[T=65.5s]   Modal cierra (animación 0.35s)
[T=65.85s]  Toast aparece
[T=68.85s]  Toast desaparece (3s)
```

---

## Conclusión: Ciclo Completo

```
USUARIO
  ↓
SOLICITA TAXI
  ↓
[30s espera]
  ↓
MODAL ABRE
  ↓
SELECCIONA RATING + COMENTARIO
  ↓
PRESIONA ENVIAR
  ↓
✅ CALIFICACIÓN GUARDADA
✅ PERFIL CONDUCTOR ACTUALIZADO
✅ PROMEDIO RECALCULADO
  ↓
MODAL CIERRA
TOAST CONFIRMACIÓN
  ↓
SISTEMA LISTO PARA PRÓXIMO VIAJE
```

El conductor ahora tiene su perfil con promedio de servicio actualizado automáticamente en cada calificación recibida.
