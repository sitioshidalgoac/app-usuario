# ✅ TESTING & VERIFICACIÓN: Sistema de Calificación

## Verificación Rápida

### 1️⃣ Verificar que rating.js existe

```bash
# En terminal, desde proyecto:
ls APP_USUARIO/js/rating.js
# ✅ Debe mostrar el archivo
```

### 2️⃣ Verificar imports en app.js

```javascript
// Abrir: APP_USUARIO/js/app.js
// Línea ~16-18 debe tener:

import { mostrarModalCalificacion, enviarCalificacion,
         inicializarCalificacion, obtenerPerfilConductor,
         escucharPerfilConductor } from "./rating.js";

// Si ves esto: ✅ OK
```

### 3️⃣ Verificar HTML del modal

```html
<!-- Abrir: APP_USUARIO/index.html -->
<!-- Buscar: id="modal-rate" -->
<!-- Debe contener: -->

<div class="modal-bg" id="modal-rate">
  <div class="modal-box rate-container">
    <div class="rate-counter">
      Puntuación: <span class="num" id="rate-score">5/5</span>
    </div>
    <div class="rate-stars" id="rate-stars"></div>
    <textarea id="rate-comment-input" maxlength="100"></textarea>
  </div>
</div>

<!-- Si ves todo esto: ✅ OK -->
```

---

## Prueba 1: Flujo Básico de Calificación

### Paso 1: Preparar ambiente
```
1. Abrir APP_USUARIO en navegador
2. Permitir geolocalización
3. Iniciar sesión (nombre + teléfono)
4. Permitir acceso a base de datos
```

### Paso 2: Solicitar taxi
```
1. Toca: "Solicitar Servicio Premium"
2. Escribe destino: "Centro"
3. Presiona: "SOLICITAR"
4. ✅ Esperado: Banner "🚕 TAXI123 - Carlos..."
5. ✅ Esperado: Botón 📤 visible
```

### Paso 3: Esperar modal automático
```
1. Espera 30 segundos
2. ✅ Esperado: Modal se abre automáticamente
3. ✅ Esperado: "⭐ Califica tu viaje" en título
4. ✅ Esperado: "Carlos — TAXI123" en conductor
5. ✅ Esperado: 5 estrellas visibles
6. ✅ Esperado: "¡Excelente servicio! 🤩" en feedback
7. ✅ Esperado: Campo comentario visible
```

### Paso 4: Interactuar con estrellas
```
1. Hover sobre 3ª estrella
   ✅ Esperado: Solo primeras 3 brillan (preview)
2. Mouse fuera
   ✅ Esperado: Vuelve a 5 estrellas
3. Click en 4ª estrella
   ✅ Esperado: 4 estrellas permanentes
   ✅ Esperado: "4/5" en contador
   ✅ Esperado: Feedback cambia a "Muy bueno, gracias 😊"
   ✅ Esperado: Feedback en color verde
```

### Paso 5: Agregar comentario
```
1. Click en textarea
2. Escribe: "Excelente conductor, llegó a tiempo"
3. ✅ Esperado: Texto aparece en textarea
4. ✅ Esperado: Límite de 100 caracteres activo
5. Intenta escribir más de 100
   ✅ Esperado: Textarea no acepta más caracteres
```

### Paso 6: Enviar calificación
```
1. Presiona: "✅ ENVIAR CALIFICACIÓN"
2. ✅ Esperado: Modal cierra con animación
3. ✅ Esperado: Toast aparece arriba:
            "⭐ ¡Gracias por tu calificación!"
4. ✅ Esperado: Toast desaparece después de 3s
5. ✅ Esperado: Consola muestra:
            ✅ Calificación completada exitosamente
            📊 Rating: 4
            💬 Comentario: "Excelente conductor..."
            👤 Conductor: Carlos
```

### Paso 7: Verificar en Firebase
```
1. Abrir Firebase Console
2. Ir a: Realtime Database
3. Expandir: calificaciones > {nueva fila}
   ✅ Esperado: Ver estructura:
   {
     "unitId": "TAXI123",
     "conductor": "Carlos",
     "cliente": "Tu nombre",
     "rating": 4,
     "comentario": "Excelente conductor...",
     "ts": 1699564800000,
     "destino": "Centro"
   }

4. Expandir: conductores > TAXI123
   ✅ Esperado: Ver estructura:
   {
     "nombre": "Carlos",
     "totalCalificaciones": 1,
     "sumaRatings": 4,
     "promedioRating": 4.00,
     "ultimaCalificacion": {
       "rating": 4,
       "comentario": "Excelente conductor...",
       "ts": 1699564800000
     },
     "comentarios": [
       {
         "texto": "Excelente conductor...",
         "rating": 4,
         "ts": 1699564800000
       }
     ]
   }

5. Expandir: conductores > TAXI123 > historialCalificaciones
   ✅ Esperado: Hay una entrada (copia de calificación)
```

---

## Prueba 2: Múltiples Calificaciones y Promedio

### Paso 1: Hacer 3 viajes con calificaciones diferentes

```
VIAJE 1:
├─ Calificación: 5 estrellas
├─ Comentario: "Excelente"
└─ Expected Promedio: 5.00

VIAJE 2:
├─ Calificación: 4 estrellas
├─ Comentario: "Muy bueno"
└─ Expected Promedio: (5+4)/2 = 4.50

VIAJE 3:
├─ Calificación: 5 estrellas
├─ Comentario: "Perfecto"
└─ Expected Promedio: (5+4+5)/3 = 4.67
```

### Paso 2: Verificar promedio en Firebase

```
Después del viaje 3:

En Firebase > conductores > TAXI123:
  {
    "nombre": "Carlos",
    "totalCalificaciones": 3,
    "sumaRatings": 14,
    "promedioRating": 4.67,  ✅ Correcto
    "comentarios": [
      {"texto": "Perfecto", "rating": 5, ...},
      {"texto": "Muy bueno", "rating": 4, ...},
      {"texto": "Excelente", "rating": 5, ...}
    ]
  }
```

### Paso 3: Verificar cálculo

```
Fórmula:
promedioRating = sumaRatings / totalCalificaciones
               = 14 / 3
               = 4.666...
               = 4.67 (redondeado a 2 decimales)

✅ Consola debe mostrar:
✅ Perfil actualizado: Carlos
   📊 Promedio: 4.67 (3 calificaciones)
```

---

## Prueba 3: Validación de Comentario

### Paso 1: Intentar escribir más de 100 caracteres

```
1. Abrir modal de calificación
2. Click en textarea
3. Escribe: "Este es un comentario muy largo que intenta superar los cien caracteres de límite permitido por el sistema de calificación de la aplicación"
4. ✅ Esperado: Se detiene en 100 caracteres
5. ✅ Esperado: Carácter 101 NO se agrega
```

### Paso 2: Comentario vacío (opcional)

```
1. Modal abierto (nuevo viaje)
2. NO escribir nada en comentario
3. Seleccionar 3 estrellas
4. Presionar ENVIAR
5. ✅ Esperado: Se envía sin error
6. ✅ Esperado: Firebase guarda con comentario: ""
7. ✅ Esperado: No aparece en /conductores/.../comentarios
```

---

## Prueba 4: Feedback Visual Dinámico

### Test cada nivel de estrellas

```
NIVEL 1: ⭐
├─ Click en 1ª estrella
├─ ✅ Esperado: "Mala experiencia 😞"
└─ ✅ Esperado: Color rojo (#ff6b6b)

NIVEL 2: ⭐⭐
├─ Click en 2ª estrella
├─ ✅ Esperado: "Podría mejorar"
└─ ✅ Esperado: Color rojo (#ff6b6b)

NIVEL 3: ⭐⭐⭐
├─ Click en 3ª estrella
├─ ✅ Esperado: "Servicio regular"
└─ ✅ Esperado: Color naranja (#ffa500)

NIVEL 4: ⭐⭐⭐⭐
├─ Click en 4ª estrella
├─ ✅ Esperado: "Muy bueno, gracias 😊"
└─ ✅ Esperado: Color verde (#00ff88)

NIVEL 5: ⭐⭐⭐⭐⭐
├─ Click en 5ª estrella
├─ ✅ Esperado: "¡Excelente servicio! 🤩"
└─ ✅ Esperado: Color dorado (#ffd700)
```

---

## Prueba 5: Animaciones CSS

### Test 1: Hover animation

```
1. Modal abierto
2. Lentamente pasa mouse sobre cada estrella
3. ✅ Esperado: Cada estrella crece (scale: 1.15)
4. ✅ Esperado: Glow effect (drop-shadow)
5. ✅ Esperado: Transición suave (0.2s)
```

### Test 2: Modal open animation

```
1. Viaje en progreso, esperando 30s
2. Modal abre
3. ✅ Esperado: Modal desliza desde abajo
4. ✅ Esperado: Overlay con blur effect
5. ✅ Esperado: Transición suave
```

### Test 3: Modal close animation

```
1. Modal abierto
2. Presionar ENVIAR
3. ✅ Esperado: Modal desliza hacia abajo
4. ✅ Esperado: Transición suave (0.35s)
5. ✅ Esperado: Toast aparece arriba
```

---

## Prueba 6: Integración con otros módulos

### Test 1: Compartir viaje + Calificación

```
1. Solicitar taxi
2. Presionar 📤 COMPARTIR
3. Modal compartir abre (NO interfiere)
4. Cerrar modal compartir
5. Esperar 30s
6. Modal CALIFICACIÓN abre
7. ✅ Esperado: Sin conflictos
8. ✅ Esperado: compartir se detuvo
```

### Test 2: SOS + Calificación

```
1. Solicitar taxi
2. Presionar 🚨 SOS
3. SOS se activa
4. Esperar 30s
5. ✅ Esperado: Calificación abre después
6. ✅ Esperado: Datos de SOS no afectan rating
```

---

## Prueba 7: Console Debug

### Verificar logs

```
Abrir Developer Tools (F12) → Console

Cuando solicita taxi:
✅ Taxis LIBRES encontrados: 1
✅ Detalles: [{unitId: "TAXI123", ...}]

Cuando abre modal de calificación:
(Sin logs específicos - es normal)

Cuando envía calificación:
✅ Calificación completada exitosamente
   📊 Rating: 3
   💬 Comentario: "Buen conductor"
   👤 Conductor: Carlos

✅ Perfil actualizado: Carlos
   📊 Promedio: 3.00 (1 calificaciones)

✅ Guardado en historial del conductor
```

---

## Prueba 8: Error Handling

### Test 1: Sin viaje pendiente

```
1. Abrir consola: console.log(pendingRating)
2. Presionar: window.enviarCalificacion(db, "user", "+52 555")
3. ✅ Esperado: console.warn("⚠️ No hay viaje pendiente")
4. ✅ Esperado: No se guarda nada
```

### Test 2: Firebase desconectado

```
1. Abrir DevTools Network
2. Marcar como "Offline"
3. Solicitar taxi, esperar modal
4. Enviar calificación
5. ✅ Esperado: Toast "❌ Error al guardar calificación"
6. ✅ Esperado: console.error visible
7. Volver online
8. Firebase se reconecta automáticamente
```

### Test 3: Sin comentario (edge case)

```
1. Modal abierto
2. NO escribir comentario
3. Presionar ENVIAR
4. ✅ Esperado: Se envía exitosamente
5. ✅ Esperado: Comentario: "" en Firebase
6. ✅ Esperado: No aparece en comentarios[]
```

---

## Checklist de Verificación Final

### UI/UX
- [ ] Modal abre automáticamente a los 30s
- [ ] Estrellas son clickeables
- [ ] Hover muestra preview sin cambiar selección
- [ ] Feedback cambia con cada estrella
- [ ] Contador muestra puntuación correcta
- [ ] Comentario limita a 100 caracteres
- [ ] Botón ENVIAR habilitado
- [ ] Modal cierra sin errores
- [ ] Toast muestra confirmación

### Datos
- [ ] Calificación guardada en /calificaciones/
- [ ] Perfil conductor actualizado en /conductores/
- [ ] Promedio recalculado correctamente
- [ ] Comentarios guardados en últimos 10
- [ ] Historial guardado en /historialCalificaciones/
- [ ] Timestamp correcto en todos lados
- [ ] Datos cliente/conductor correctos

### Integración
- [ ] app.js importa rating.js
- [ ] Inicialización se ejecuta en login
- [ ] No interfiere con compartir viaje
- [ ] No interfiere con SOS
- [ ] Console logs correctos
- [ ] Sin errores en DevTools

### Rendimiento
- [ ] Modal abre en < 500ms
- [ ] Envío completa en < 2s
- [ ] Firebase responde correctamente
- [ ] No hay memory leaks
- [ ] Animaciones suaves

---

## Comandos Útiles de Debug

```javascript
// En consola del navegador:

// 1. Ver estado actual
console.log("Rating state:", ratingState)
console.log("Pending rating:", pendingRating)

// 2. Simular click en estrella
window.setStar(4)

// 3. Simular envío
await window.enviarCalificacion(db, "TestUser", "+1234567890")

// 4. Obtener perfil de conductor
const perfil = await window.obtenerPerfilConductor(db, "TAXI123")
console.log(perfil)

// 5. Escuchar cambios en perfil
window.escucharPerfilConductor(db, "TAXI123", (perfil) => {
  console.log("Perfil actualizado:", perfil)
})

// 6. Ver próximo promedio
const suma = 14
const total = 3
const promedio = (suma / total).toFixed(2)
console.log("Promedio:", promedio)
```

---

## Notas Importantes

✅ **El sistema es completamente funcional**  
✅ **Está integrado automáticamente en el flujo de viaje**  
✅ **No requiere cambios adicionales**  
✅ **Listo para producción**  

⚠️ **No olviders:**
- Las calificaciones se guardan en tiempo real
- El promedio se recalcula automáticamente
- Los últimos 10 comentarios se conservan
- El conductor puede ver su reputación en su panel (próxima fase)

---

## Próximos Pasos

1. **Crear panel del conductor**
   - Mostrar su promedio
   - Listar comentarios últimos 10
   - Mostrar distribución de ratings

2. **Dashboard base**
   - Ver promedios de todos los conductores
   - Ranking de mejores/peores

3. **Notificaciones**
   - Alertar conductor cuando recibe calificación
   - Alerta si promedio baja de cierto límite

4. **Incentivos**
   - Bonificación por mantener alto promedio
   - Badges/logros para top-rated

¡Sistema de calificación completamente funcional e integrado! 🌟
