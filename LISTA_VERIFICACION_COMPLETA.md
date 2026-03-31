# ✅ LISTA DE VERIFICACIÓN COMPLETA

## Pre-Deploy Testing

Antes de desplegar a producción, verifica que todos estos puntos funcionen:

---

## 1️⃣ TEST: Sincronización de Estado

### Test 1.1: Status se escribe en MAYÚSCULAS

**Pasos:**
1. Abre la app del conductor en el navegador
2. Inicia sesión (unit: TX01, nombre: Test, código: SitiosHidalgo2024)
3. Abre **Consola del navegador** (F12 → Console)
4. Presiona el botón **OCUPADO**
5. En la consola deberías ver: `✅ Status sincronizado en Firebase: OCUPADO`
6. Abre **Firebase Console** (projecte: sitios-hidalgo-gps)
   - Ve a Realtime Database → `unidades/TX01` → `status`
   - **Debe mostrar `"OCUPADO"` (string entre comillas)**

**Resultado esperado:** ✅ `"OCUPADO"` en Firebase (mayúsculas)

---

### Test 1.2: Status se sincroniza rápidamente

**Pasos:**
1. En la app, presiona **OCUPADO**
2. Anota la hora exacta
3. Abre Firebase Console y refresca `unidades/TX01`
4. Anota cuándo aparece el cambio
5. **Debe ser máximo 3-5 segundos**

**Resultado esperado:** ✅ Cambio visible en 3-5 segundos

---

### Test 1.3: El mapa de la Base cambia de color

**Pasos:**
1. En la app del conductor, presiona **OCUPADO**
2. Abre en otra pestaña la **App Usuario** o **Mapa Base**
3. Espera 3-5 segundos
4. En el mapa, el marcador de TX01 debe cambiar a color **NARANJA**

**Resultado esperado:** ✅ Marcador cambia a naranja

---

### Test 1.4: Status vuelve a LIBRE correctamente

**Pasos:**
1. Estando en estado OCUPADO, presiona **LIBRE**
2. En la consola: debe aparecer `✅ Status sincronizado en Firebase: LIBRE`
3. En Firebase Console, `unidades/TX01/status` debe ser `"LIBRE"`
4. En el mapa, el marcador debe volver a **VERDE**

**Resultado esperado:** ✅ Sincronización completa

---

### Test 1.5: Estado se mantiene consistente (Monitor)

**Pasos:**
1. Presiona OCUPADO y espera 30 segundos sin hacer nada
2. En pasos 25-35 segundos, en la consola deberías ver:
3. `⚠️ Desincronización detectada:` o `✅ Status resintonizado`
   - O simplemente nada si todo está bien
4. El estado debe permanecer OCUPADO todo el tiempo

**Resultado esperado:** ✅ Monitor trabaja silenciosamente

---

## 2️⃣ TEST: Registro de Bitácora

### Test 2.1: Viaje se guarda en Firebase

**Pasos:**
1. Presiona **OCUPADO** (inicia viaje)
2. Espera **5+ minutos** con GPS activo
3. Presiona **LIBRE** (termina viaje)
4. En la consola deberías ver: `📝 Viaje guardado en Firebase: historial/TX01/1`
5. Abre Firebase Console → Realtime DB → `historial/TX01/1`
6. **Debe existir con todos los datos del viaje**

**Resultado esperado:** ✅ Viaje aparece en Firebase

---

### Test 2.2: Viaje aparece en Historial local

**Pasos:**
1. Después de completar un viaje (test 2.1)
2. En la app, ve a la sección **📋 HISTORIAL**
3. **Debe aparecer un recuadro con el viaje recién completado**
4. Debe mostrar:
   - Número de viaje (#1, #2, etc.)
   - ✅ Estado (completado)
   - Fecha
   - Duración en minutos
   - Distancia en km
   - Hora inicio → Hora fin

**Resultado esperado:** ✅ Viaje visible inmediatamente

---

### Test 2.3: Datos de viaje son correctos en Firebase

**Pasos:**
1. Después de guardar un viaje (test 2.1)
2. Abre Firebase Console → `historial/TX01/1`
3. Verifica que contenga:
   ```json
   {
     "id": 1,
     "estado": "completado",
     "fecha": "31/03/2026",
     "horaIni": "14:30:45",
     "horaFin": "14:40:15",
     "duracion": 10,     // minutos
     "distancia": "2.5", // km
     "latIni": 17.4572,
     "lngIni": -97.2311,
     "latFin": 17.4650,
     "lngFin": -97.2280,
     "inicio": 1234567890000,  // timestamp
     "fin": 1234567950000
   }
   ```

**Resultado esperado:** ✅ Todos los campos presentes y correctos

---

### Test 2.4: Viajes múltiples se guardan

**Pasos:**
1. Repite test 2.1 pero 3 veces:
   - Primer viaje: 5 minutos
   - Segundo viaje: 8 minutos
   - Tercer viaje: 3 minutos
2. En Firebase Console → `historial/TX01`
3. **Debe haber 3 registros: `1`, `2`, `3`**
4. En Historial local debe mostrar "HOY · 3 VIAJES"

**Resultado esperado:** ✅ Todos los viajes guardados

---

### Test 2.5: Estadísticas se actualizan

**Pasos:**
1. Después de completar 3 viajes (test 2.4)
2. En la app, ve a **👤 PERFIL**
3. Debe mostrar:
   - En "VIAJES HOY": 3
   - En "KM TOTALES": suma de todas las distancias
4. Ejemplo: si viajes son 2.5km + 3.1km + 1.8km = 7.4km

**Resultado esperado:** ✅ Estadísticas correctas

---

## 3️⃣ TEST: Manejo de Errores

### Test 3.1: Sin GPS - Cambio de estado OCUPADO rechazado

**Pasos:**
1. Apaga el GPS del dispositivo (Settings → Location → OFF)
2. En la app, presiona **OCUPADO**
3. Debe aparecer toast: `⚠️ Requiere señal GPS para estado OCUPADO`
4. El botón debe seguir siendo **LIBRE** (no cambió)
5. En consola: `⚠️ Sin GPS disponible`

**Resultado esperado:** ✅ No permite OCUPADO sin GPS

---

### Test 3.2: Sin GPS - Viaje no se guarda

**Pasos:**
1. Enciende GPS de nuevo
2. Presiona **OCUPADO** con GPS (debe funcionar)
3. Apaga GPS rápidamente
4. Presiona **LIBRE**
5. Debe aparecerToast: `⚠️ Sin señal GPS — viaje no registrado`
6. En consola: `⚠️ Coordenadas GPS no disponibles`
7. **No debe haber nuevo viaje en Historial ni en Firebase**

**Resultado esperado:** ✅ Viaje rechazado sinGPS

---

### Test 3.3: Error de conexión muestra en UI

**Pasos:**
1. En Firebase, desactiva temporalmente write access en rules
2. En la app, presiona **OCUPADO**
3. Debe aparecer toast: `⚠️ Error conectando con Base: Permission denied`
4. En consola: `❌ Error sincronizando status: ...`
5. Reactiva los permisos Firebase

**Resultado esperado:** ✅ Error visible para el usuario

---

## 4️⃣ TEST: Monitor de Sincronización

### Test 4.1: Monitor detecta desincronización

**Pasos (simulación manual):**
1. En la app, presiona **OCUPADO** (status local = 'OCUPADO')
2. Abre Firebase Console y cambia manualmente `status` a `'LIBRE'`
3. Espera 30-35 segundos
4. En la consola del navegador deberías ver:
   - `⚠️ Desincronización: Firebase=LIBRE, Local=OCUPADO`
   - `🔄 Resintonizando...`
   - `✅ Status resintonizado`
5. En Firebase Console, `status` debe volver a `'OCUPADO'` automáticamente

**Resultado esperado:** ✅ Auto-corrección automática

---

## 5️⃣ TEST: Logout

### Test 5.1: Estado se guarda correctamente al cerrar

**Pasos:**
1. Después de completar viajes, presiona **CERRAR SESIÓN**
2. Confirma el diálogo
3. En consola debe aparecer: `✅ Sesión cerrada correctamente`
4. Abre Firebase Console → `unidades/TX01`
5. Debe tener:
   - `status`: `"OFFLINE"`
   - `online`: `false`
   - `ultimaTurno`: 3 (número de viajes)
   - `ultimosKm`: 7.4 (suma de km)
   - `desconectadoEn`: timestamp

**Resultado esperado:** ✅ Datos finales guardados

---

### Test 5.2: Monitor se detiene al logout

**Pasos:**
1. Después de logout (test 5.1)
2. Espera 5 segundos
3. En consola, no debe haber más mensajes del monitor
4. (Antes del fix, seguiría enviando mensajes)

**Resultado esperado:** ✅ Monitor detenido

---

## 6️⃣ TEST: Cambios Rápidos

### Test 6.1: Múltiples cambios de estado sin fallos

**Pasos:**
1. Presiona rápidamente: OCUPADO → LIBRE → OCUPADO → LIBRE → OCUPADO
2. En consola, cada cambio debe mostrar `✅ Status sincronizado`
3. No debe haber `❌ Error`
4. Todos deben llegar a Firebase
5. En Firebase Console, puedes ver el historial de cambios

**Resultado esperado:** ✅ 5 cambios sincronizados correctamente

---

### Test 6.2: Cambios mientras está ocupado

**Pasos:**
1. Presiona OCUPADO
2. Inmediatamente presiona DESCANSO (incluso antes de que Firebase responda)
3. Luego presiona LIBRE
4. En consola: todos deben sincronizar correctamente
5. Status final debe ser LIBRE
6. Un viaje debe registrarse (OCUPADO → LIBRE)

**Resultado esperado:** ✅ Manejo correcto de cambios rápidos

---

## 7️⃣ TEST: Sincronización con Base Central

### Test 7.1: Base recibe cambios correctamente

**Con dos dispositivos:**
1. En el conductor: presiona **OCUPADO**
2. En la Base Central (otra pestaña): refresca el panel
3. Debe mostrar TX01 como **OCUPADO** (naranja)
4. Si hay contador de "Ocupados", debe incrementarse

**Resultado esperado:** ✅ Base recibe cambios

---

### Test 7.2: Mapa de Base se actualiza en tiempo real

**Con dos dispositivos:**
1. En el conductor: presiona **OCUPADO**, **LIBRE**, **DESCANSO**, **LIBRE**
2. En la Base Central: mira el color del marcador en tiempo real
3. Debe cambiar: VERDE → NARANJA → VERDE → AZUL → VERDE

**Resultado esperado:** ✅ Mapa sync en vivo

---

## 8️⃣ CHECKLIST FINAL

- [ ] Test 1.1: Status en MAYÚSCULAS
- [ ] Test 1.2: Sincronización rápida (3-5s)
- [ ] Test 1.3: Mapa cambia de color
- [ ] Test 1.4: Estado LIBRE correcto
- [ ] Test 1.5: Monitor funciona
- [ ] Test 2.1: Viaje guardado en Firebase
- [ ] Test 2.2: Viaje en Historial local
- [ ] Test 2.3: Datos de viaje completos
- [ ] Test 2.4: Múltiples viajes
- [ ] Test 2.5: Estadísticas actualizadas
- [ ] Test 3.1: Sin GPS rechaza OCUPADO
- [ ] Test 3.2: Sin GPS no guarda viaje
- [ ] Test 3.3: Errores visibles en UI
- [ ] Test 4.1: Monitor auto-corrige
- [ ] Test 5.1: Logout guarda estado
- [ ] Test 5.2: Monitor se detiene
- [ ] Test 6.1: Cambios rápidos funcionan
- [ ] Test 6.2: Cambios superpuestos OK
- [ ] Test 7.1: Base recibe cambios
- [ ] Test 7.2: Mapa sincronizado

---

## 🚀 Si Todos Los Tests Pasan

✅ **El sistema está 100% funcional y listo para producción**

Puedes desplegar con confianza:
```bash
# En la carpeta conductor
netlify deploy --prod
```

---

## ⚠️ Si Algún Test Falla

1. Abre la **Consola del navegador** (F12 → Console)
2. Busca mensajes `❌ Error` o `⚠️ Warning`
3. Revisa **Firebase Console** → Realtime DB → Los datos afectados
4. Revisa las **Reglas de seguridad** en Firebase necesitan actualizar write access
5. Verifica que **Firebase esté inicializado** correctamente
6. Revisa el archivo de configuración: `firebase.js`

---

**DOCUMENTO DE VERIFICACIÓN COMPLETO**  
**Versión:** 2.0  
**Última actualización:** 31/03/2026  
