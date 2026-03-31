# 🚀 GUÍA RÁPIDA DE VERIFICACIÓN

## 1️⃣ REVISAR LOGS EN CONSOLA

### App Usuario
1. Abre App Usuario en navegador
2. **F12** (abrir DevTools)
3. **Tab → Console**
4. Busca estas líneas (deberían aparecer instantáneamente):

```
🚖 Conductores recibidos desde Firebase: {TX52: {...}, TX53: {...}}
🔍 Total de unidades: 2
✅ Taxis LIBRES: 1 [{status: "LIBRE", ...}]
🔴 Taxis OCUPADOS: 0
```

✅ **Si ves esto:** Los datos están llegando correctamente
❌ **Si NO ves esto:** Problemas de conexión Firebase

---

## 2️⃣ VERIFICAR STATUS EN FIREBASE

### Opción A: Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona proyecto `sitios-hidalgo-gps`
3. **Realtime Database** → **unidades**
4. Expande y busca el ID del conductor (ej: TX52)
5. Verifica que el campo `status` tenga:
   - ✅ `"LIBRE"` (MAYÚSCULAS) 
   - NO `"libre"` (minúsculas)

Debe verse así:
```json
{
  "TX52": {
    "id": "TX52",
    "name": "Carlos López",
    "status": "LIBRE",    ← ⭐ DEBE SER MAYÚSCULAS
    "lat": 17.4572,
    "lng": -97.2311,
    "online": true
  }
}
```

### Opción B: Ver en Developer Tools del Conductor
1. Abre App Conductor
2. **F12** → **Console**
3. En la consola del navegador, ejecuta:
```javascript
firebase.database().ref('unidades').once('value', s => console.log(s.val()))
```
4. Expande el resultado y verifica que `status` sea MAYÚSCULAS

---

## 3️⃣ PRUEBA DE SINCRONIZACIÓN EN TIEMPO REAL

### Test: ¿Se sincroniza el status?

**En el Conductor:**
1. Abre App Conductor
2. Haz clic en **OCUPADO** (botón naranja)
3. Abre DevTools (F12) → Console

**En el Usuario (otra pestaña):**
1. Abre App Usuario
2. F12 → Console
3. Dentro de 1 segundo deberías ver este log:
```
🚖 Conductores recibidos desde Firebase: {TX52: {status: "OCUPADO", ...}}
```

✅ **Si cambia a OCUPADO:** La sincronización funciona
❌ **Si se queda en LIBRE:** Problema con escritura en Firebase

---

## 4️⃣ PRUEBA DE SOLICITUD DE TAXI

### Paso a paso:

1. **App Conductor:**
   - Inicia sesión
   - Haz clic en **LIBRE** (botón verde)
   - Espera 2-3 segundos

2. **App Usuario:**
   - Inicia sesión
   - Espera a que cargue el mapa
   - Abre F12 → Console
   - Busca:
   ```
   ✅ Taxis LIBRES: 1 (debe decir 1 o más)
   ```

3. **Solicitar Taxi:**
   - Haz clic en **SOLICITAR TAXI**
   - Escribe destino
   - Haz clic en **BUSCAR TAXI**

4. **Resultado esperado:**
   - En Console deberías ver:
   ```
   🔎 Buscando taxis LIBRES...
      Criterios: status='LIBRE', online=true, lat y lng válidos
      Taxis LIBRES encontrados: 1
      Detalles: [{id: "TX52", status: "LIBRE", ...}]
   ```
   - El taxi debería ser asignado ✅

**Si NO funciona:**
- Verifica que el conductor esté en LIBRE (no OCUPADO)
- Verifica que el status sea MAYÚSCULAS en Firebase
- Revisa si hay error en Console

---

## 5️⃣ CHECKLIST DE VALIDACIÓN

Marca cada uno que verifiques:

```
CONDUCTOR:
□ Estado inicial es LIBRE (minúsculas)
□ Botones tienen data-st="LIBRE" (MAYÚSCULAS)
□ Cada 5 segundos escribe a /unidades/{ID}
□ Status en Firebase es MAYÚSCULAS

USUARIO:
□ Listener en /unidades activo (onValue)
□ Console muestra "Conductores recibidos"
□ Filtra por status === "LIBRE" (MAYÚSCULAS)
□ Muestra contador correcto de taxis libres
□ Puede solicitar taxi sin error "no hay taxis"

MAPA:
□ Marcadores aparecen en mapa
□ Marcadores verdes = LIBRES
□ Marcadores grises = OCUPADOS
□ Pop-up muestra status correcto

FIREBASE:
□ /unidades tiene conductores registrados
□ status es MAYÚSCULAS (LIBRE, OCUPADO, etc)
□ lat y lng tienen valores válidos
□ online = true para conductores activos
```

---

## 6️⃣ TROUBLESHOOTING

| Problema | Causa | Solución |
|----------|-------|----------|
| "No hay taxis disponibles" | Status en minúsculas | Verificar que sea "LIBRE" no "libre" |
| Console vacía | Sin conexión Firebase | Revisar credenciales en config/firebase.js |
| Conductor no aparece en mapa | Sin lat/lng | Activar GPS en dispositivo |
| Números incorrectos de taxis | Conductor DESCONECTADO | Verificar que online=true |
| Cambios lentos | Sin refresh | Esperar 1-2s (listener es en tiempo real) |

---

## 7️⃣ RESET COMPLETO (Si todo falla)

1. **Limpiar datos locales:**
   - Alt+F12 → Application → LocalStorage → Clear All

2. **Recargar apps:**
   - Conductor: Recarga página (Ctrl+F5)
   - Usuario: Recarga página (Ctrl+F5)

3. **Verificar Firebase:**
   - Console → Realtime Database
   - Verifica que /unidades exista
   - Si está vacío, inicia sesión en Conductor primero

4. **Prueba de nuevo:**
   - Conductor: Iniciar sesión, seleccionar LIBRE
   - Usuario: Iniciar sesión, solicitar taxi
   - Debería funcionar ✅

---

## 📞 CONTACTO / ESCALADO

Si después de revisar esto **aún sigue sin funcionar**:

1. Comparte:
   - Logs de Console (F12)
   - Estado en Firebase Console (screenshot)
   - Versión de navegador

2. Verifica:
   - ✅ Firebase conectado (status 200)
   - ✅ Credenciales correctas
   - ✅ GPS activo en dispositivo

---

**Última actualización:** 30/03/2026
**Versión:** 1.0 — UNIFICADA
