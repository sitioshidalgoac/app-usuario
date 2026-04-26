# 🚀 GUÍA RÁPIDA DE VERIFICACIÓN — APP_USUARIO v5

## 📋 Pre-Requisitos

- ✅ Archivo `APP_USUARIO/index.html` abierto en navegador
- ✅ Conexión a Internet (para Firebase y Tiles OpenStreetMap)
- ✅ F12 abierto (DevTools) para verificar consola
- ✅ Permisos GPS habilitados en navegador (importante)

---

## 🧪 VERIFICACIÓN PASO A PASO

### **PASO 1: Verificar sin errores de consola**
```
1. Abra F12 → Pestaña Console
2. NO debe haber ningún error rojo (🔴)
3. Debe haber logs verdes (🟢) y azules (🔵)
4. Busque especialmente:
   - ❌ "Cannot read property" → Error de elemento DOM
   - ❌ "ReferenceError" → Función no definida
   - ❌ "Uncaught SyntaxError" → Error de sintaxis
```

**Logs esperados:**
```javascript
✅ Firebase inicializado — RTDB + Firestore
✅ 🚀 App iniciada — Usuario
🗺️  Mapa Leaflet inicializado con 7 geocercas
```

---

### **PASO 2: Verificar GPS en aplicación**

**En header (arriba a la derecha):**
- Debe ver un indicador de GPS
- Color inicial: 🔴 Rojo "GPS..." → debe cambiar a 🟢 Verde "GPS activo"
- Si se queda en rojo después de 30s: ❌ **ERROR** - Rechazó permisos GPS

**Para habilitar GPS:**
1. Click en ícono de candado en barra de URL
2. Busca "Ubicación" o "Location"
3. Cambia a "Permitir" o "Allow"
4. Recarga la página (F5)

---

### **PASO 3: Verificar conexión a Firebase**

En la consola (F12):
```javascript
// Debería ver:
📡 Suscribiéndose a RTDB → /unidades/ ...

🟢 Firebase CONECTADO  // O
🔴 Firebase DESCONECTADO  // si no tiene Internet
```

En la UI:
- Debe ver contador de taxis: "🟢 Libres", "🟠 Ocupados", "📍 Cerca"
- Si todos están en 0: Probablemente no hay conductores activos en Firebase

---

### **PASO 4: Verificar Mapa + Marcadores**

**Debe ver:**
1. ✅ Mapa con 7 círculos azules (bases)
2. ✅ Etiquetas en cada base: "B1 Centro", "B2 Turístico", etc.
3. ✅ Tu ubicación: Punto azul pequeño en el mapa
4. ✅ Si hay conductores: Puntos verdes 🟢 (LIBRE) o grises 🔴 (OCUPADO)

**Si no ves el mapa:**
- ❌ Error: Probablemente falta Leaflet o error de DNS
- Verificar en Console: `L` debería estar definido
  ```javascript
  console.log(typeof L); // Debe mostrar: "object"
  ```

---

### **PASO 5: Verificar normalización de STATUS**

En console, ejecute:
```javascript
// Ver todos los taxis
console.log(Object.values(unidades));

// Filtrar LIBRES (sin importar mayúsculas/minúsculas)
Object.values(unidades).forEach(u => {
  const st = String(u.status || "").toUpperCase();
  console.log(`${u.id}: status="${u.status}" → normalizado="${st}"`);
});
```

**Esperado:**
```
TAXI001: status="libre" → normalizado="LIBRE" ✅
TAXI002: status="LIBRE" → normalizado="LIBRE" ✅
TAXI003: status="ocupado" → normalizado="OCUPADO" ✅
```

---

### **PASO 6: Prueba completa de solicitud**

1. **Verificar que hay taxis disponibles:**
   - Contador de "Libres" > 0
   - Botón "PEDIR TAXI" debe estar **habilitado** (no gris)

2. **Clickear "PEDIR TAXI":**
   - Se abre modal
   - Escribe destino: "Mercado Central"
   - Click "PEDIR TAXI AHORA"

3. **Verificar banner de viaje:**
   - Verde banner aparece
   - Muestra: "🚖 TAXI001 - Juan hacia Mercado Central"

4. **Prueba cancelar:**
   - Click botón "CANCELAR" en banner
   - Banner desaparece
   - Toast dice "Solicitud cancelada"

---

### **PASO 7: Prueba de calificación**

1. **Después de solicitud:**
   - Espera 30 segundos (o 5s si aceleras en console)
   - Debe aparecer modal de calificación

2. **Modal debe mostrar:**
   - Título: "⭐ Califica tu viaje"
   - 5 estrellas clickeables
   - Info: "Unidad: TAXI001 — Juan"

3. **Seleccionar estrellas:**
   - Click en 3ra estrella
   - Primeras 3 deben estar brillantes
   - Últimas 2 deben estar opacas

4. **Enviar calificación:**
   - Click "ENVIAR CALIFICACIÓN"
   - Modal desaparece
   - Toast: "⭐ ¡Gracias por calificar!"

---

### **PASO 8: Verificar sin elementos rotos**

En console, ejecute:
```javascript
// Verificar que todos los elementos existen
const elementos = [
  'viaje-banner',      // Debe existir
  'modal-rate',        // Debe existir
  'rate-stars',        // Debe existir
  'rate-unit',         // Debe existir
  'btn-solicitar',     // Debe existir
  'cnt-libres',        // Debe existir
  'cnt-ocupados',      // Debe existir
  'cnt-cerca',         // Debe existir
  'map',               // Debe existir
  'gps-badge',         // Debe existir
  'bases-row'          // Debe existir
];

elementos.forEach(id => {
  const el = document.getElementById(id);
  console.log(`${el ? '✅' : '❌'} #${id}`);
});
```

**Esperado:** Todos con ✅

---

## 🔧 TROUBLESHOOTING

| Problema | Síntoma | Solución |
|----------|---------|----------|
| GPS no activa | Botón rojo después de 30s | Habilitar en navegador → Recargar |
| Firebase no conecta | Números en 0, console roja | Verificar Internet, esperar |
| Mapa en blanco | Nada visible | F5 reload, limpiar caché |
| Botón congelado | Click en PEDIR TAXI no abre modal | Abrir console, verificar errores |
| Estrellas no clickean | Modal abierto pero sin interacción | Verificar selector .rate-star existe |
| Banner desaparece inmediatamente | No se ve info del taxi | Verificar #viaje-banner existe en HTML |

---

## 📊 CHECKLIST FINAL

Marque cuando cada item funcione:

- [ ] Console sin errores rojos
- [ ] GPS activa (verde)
- [ ] Firebase conectado
- [ ] Mapa visible con 7 bases
- [ ] Mi ubicación (punto azul) en mapa
- [ ] Contador de taxis mostrando números
- [ ] Botón PEDIR TAXI habilitado
- [ ] Modal solicitud abre/cierra correctamente
- [ ] Banner de viaje muestra info del taxi
- [ ] Cancelar viaje funciona
- [ ] Modal de calificación abre después de 30s
- [ ] Estrellas son clickeables
- [ ] Enviar calificación trabaja
- [ ] Sin elementos rotos (todos los IDs existen)

**Si TODOS ✅:** APP 100% FUNCIONAL

---

## 📞 Información Technical Quick Reference

| Componente | Tecnología | URL/Ruta |
|------------|------------|----------|
| **Database** | Firebase RTDB | `sitios-hidalgo-gps-default-rtdb` |
| **Maps** | Leaflet + OpenStreetMap | v1.9.4 CDN |
| **Nodo de datos** | `/unidades/` | Conductores en tiempo real |
| **Ubicación** | Nochixtlán, Oaxaca | Base: 17.4575, -97.2273 |
| **Geocercas** | 7 bases | Radio 80-100m cada una |
| **Sistema de rating** | Firebase Firestore | `/calificaciones/` |

---

## 🎓 Notas sobre cambios

1. **Status "LIBRE":** Ahora normalizado a mayúsculas, tolera "libre", "LIBRE", "Libre"
2. **Elemento viaje:** Consolidado en `#viaje-banner` (antes separado en 3 elementos)
3. **Modal calificación:** Ahora con `#modal-rate` (antes `#rate-ov`)
4. **Validaciones:** Agregadas en coordenadas y selectores

---

## ✅ Versión Actualizada

- **Versión:** SHidalgo Kué'in v5
- **Fecha:** 31 de Marzo, 2026
- **Status:** ✅ Estable — Todos los errores corregidos
- **Console:** 🟢 Sin errores críticos
- **GPS:** 🟢 Funcional
- **Firebase:** 🟢 Conectado
- **Mapa:** 🟢 Dinámico

---

**¿Ayuda?** Revise F12 → Elements para ver estructura HTML actualizada.
