# 🚨 Sistema de SOS — Sitios Hidalgo GPS

## Descripción General

El sistema de SOS permite a los pasajeros solicitar ayuda de emergencia directamente desde la app del usuario. Cuando se activa:

1. **En la app del pasajero**: Se envía la ubicación exacta y datos del usuario a la base de datos en tiempo real
2. **En el panel de la Base**: Se recibe la alerta, se centra el mapa, se muestra un marcador parpadeante y se dispara una alarma sonora continua

---

## Componentes del Sistema

### 1. App Usuario (SHidalgo Kué'in)

#### Archivos Involucrados:
- **[APP_USUARIO/js/sos.js](../APP_USUARIO/js/sos.js)** - Lógica de SOS del lado del pasajero
- **[APP_USUARIO/index.html](../APP_USUARIO/index.html)** - UI con botón de SOS
- **[APP_USUARIO/js/app.js](../APP_USUARIO/js/app.js)** - Integración del módulo SOS

#### Funcionalidades:

##### Botón SOS
- **Ubicación en pantalla**: Esquina inferior derecha del mapa
- **Estilo**: Botón circular rojo pulsante (🚨)
- **Comportamiento**: Al hacer clic, envía la ubicación del usuario a Firebase

##### Datos Enviados a Firebase
```json
{
  "tipo": "SOS",
  "usuario": "Nombre del Usuario",
  "telefono": "XXX-XXX-XXXX",
  "lat": 17.459468,
  "lng": -97.225268,
  "nroUnidad": "T-001" | "USUARIO_timestamp",
  "ts": 1704067200000,
  "estado": "ACTIVO"
}
```

**Todos los campos son obligatorios** - GPS debe estar activo antes de activar SOS

##### Ubicación en Firebase
```
alertas_sos/
├── [sosId1]/
│   ├── tipo: "SOS"
│   ├── usuario: "..."
│   ├── telefono: "..."
│   ├── lat: 17.459468
│   ├── lng: -97.225268
│   ├── nroUnidad: "T-001"
│   ├── ts: 1704067200000
│   └── estado: "ACTIVO" | "ATENDIDO"
```

##### UI durante SOS Activo
- **Banner en la parte inferior**: Notificación roja parpadeante indicando "¡SOS ACTIVO!"
- **Botón "ATENDIDO"**: Permite desactivar el SOS cuando la base lo atiende
- **Alarma sonora**: Bips continuos cada 500ms (se detiene al desactivar o cuando recibe confirmación de la base)

---

### 2. Panel de la Base

#### Archivos Involucrados:
- **[base/sos-base.js](../base/sos-base.js)** - Listener y lógica de SOS en el panel
- **[base/index.html](../base/index.html)** - Integración del script

#### Funcionalidades:

##### Listener en Tiempo Real (Firebase)
El script `sos-base.js` se suscribe a `/alertas_sos/` y reacciona a:
- **child_added**: Nueva alerta SOS
- **child_changed**: Estado de alerta modificado (ej: ATENDIDO)
- **child_removed**: Alerta removida

##### Almacenamiento en Estado Global
```javascript
S.sosActivos = {
  [sosId]: {
    tipo: "SOS",
    usuario: "...",
    telefono: "...",
    lat: 17.459468,
    lng: -97.225268,
    nroUnidad: "T-001",
    ts: 1704067200000,
    estado: "ACTIVO"
  }
}
```

##### Marcador en el Mapa
- **Color**: Rojo (#ef4444)
- **Ícono**: 🚨 (parpadeante)
- **Animación**: Escala entre 0.8x y 1x cada 0.8 segundos
- **Popup**: Información detallada del SOS con botón "MARCAR COMO ATENDIDA"

##### Comportamiento al Recibir Alerta
1. ✅ Crear marcador rojo parpadeante en ubicación del SOS
2. ✅ Centrar automáticamente el mapa en la ubicación (zoom 18)
3. ✅ Abrir popup con información del pasajero
4. ✅ Reproducir alarma sonora continua
5. ✅ Mostrar notificación visual en esquina superior derecha
6. ✅ Mantener alarma hasta que se marque como "ATENDIDA"

##### Alarma Sonora
- **Frecuencia**: 850Hz (decayendo a 750Hz)
- **Duración del bip**: 200ms
- **Intervalo entre bips**: 300ms
- **Detención**: Automática cuando no hay más alertas SOS activas

##### Notificación Visual
- **Ubicación**: Esquina superior derecha
- **Color**: Gradiente rojo (#ef4444 → #dc2626)
- **Contenido**: 
  - Ícono parpadeante 🚨
  - "¡ALERTA SOS!" en rojo
  - Nombre del usuario
  - Teléfono del usuario
  - Número de unidad
  - Coordenadas GPS
  - Botón verde "MARCAR COMO ATENDIDA"
- **Duración**: 30 segundos (o hasta descartar)
- **Auto-cierre**: Slide-out animation después de 30s

---

## Flujo Completo de Uso

### Escenario: Pasajero en Emergencia

1. **Pasajero presiona botón SOS** en app
   ```
   ✓ GPS activo
   ✓ Ubicación: 17.459468, -97.225268
   ✓ Usuario: "Juan Pérez"
   ✓ Teléfono: "951-234-5678"
   ```

2. **Datos se envían a Firebase** en `/alertas_sos/`
   ```
   Alerta guardada con ID: "-NZX5Qa1..."
   ```

3. **Panel Base recibe alerta** (listener activo)
   ```
   ✓ Marcador rojo parpadeante aparece en mapa
   ✓ Mapa centra automáticamente en ubicación
   ✓ Alarma sonora comienza a sonar
   ✓ Notificación popup aparece en esquina
   ✓ Popup del marcador abre con detalles
   ```

4. **Operador de Base atiende la alerta**
   ```
   Botón: "MARCAR COMO ATENDIDA"
   ↓
   Estado en Firebase: "ATENDIDO"
   ```

5. **Sistema se limpia**
   ```
   ✓ Alarma sonora se detiene
   ✓ Marcador SOS se remueve del mapa
   ✓ Notificación se cierra
   ✓ En pasajero: Banner SOS desaparece
   ```

---

## Reglas de Firebase

El sistema requiere que exista el nodo `alertas_sos` en la base de datos con permisos:

```json
{
  "rules": {
    "alertas_sos": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$sosId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

**Nota**: Las reglas actuales permiten que cualquier usuario autenticado lea/escriba. Para producción, considerar restricciones más específicas.

---

## Pruebas

### Test 1: SOS desde la App Usuario

```javascript
// Simular en consola de navegador (App Usuario)
window.myLat = 17.459468;
window.myLng = -97.225268;
window.gpsOk = true;
window.myName = "Test User";
window.myPhone = "999-999-9999";
window.activarSOS();
```

**Resultado esperado**:
- ✅ Banner SOS aparece en parte inferior
- ✅ Console log: "SOS ACTIVADO"
- ✅ Alarma sonora (si audio está disponible)
- ✅ Datos guardados en Firebase `/alertas_sos/`

### Test 2: Recepción en Panel Base

```javascript
// Verificar en consola del Panel Base
console.log(S.sosActivos);  // Debe mostrar la alerta
```

**Resultado esperado**:
- ✅ Marcador rojo parpadeante en mapa
- ✅ Mapa centrado en ubicación
- ✅ Notificación en esquina superior derecha
- ✅ Alarma sonora reproducida
- ✅ Popup del marcador con datos del usuario

### Test 3: Desactivación

```javascript
// En Panel Base
window.atenderSOS(sosId);  // sosId de la alerta
```

**Resultado esperado**:
- ✅ Alarm se detiene
- ✅ Marcador SOS desaparece
- ✅ Notificación se cierra con animación slide-out
- ✅ En App Usuario: Banner desaparece

---

## Limitaciones y Consideraciones

### Limitaciones Técnicas
1. **Web Audio API**: No funciona en todos los navegadores/dispositivos
2. **GPS**: Requiere que el usuario haya dado permiso y esté activo
3. **Conexión**: Necesita conexión internet confiable
4. **Navegadores antiguos**: Algunos navegadores no soportan AudioContext

### Mejoras Futuras
1. Permitir múltiples alertas SOS simultáneas
2. Historial de alertas SOS
3. Notificaciones push a múltiples operadores
4. Archivo de audio MP3/WAV en lugar de síntesis
5. Tracking de ubicación en tiempo real durante SOS
6. QR code para compartir ubicación
7. Escalada automática a teléfono si no se atiende en X segundos

---

## Troubleshooting

### "SOS ya está activo"
- **Causa**: El usuario ya tiene un SOS activo
- **Solución**: Presionar "ATENDIDO" para desactivar

### "GPS no disponible"
- **Causa**: GPS no está activo o no hay permiso
- **Solución**: Activar GPS en dispositivo y dar permisos a la app

### No se escucha alarma en Panel Base
- **Causa**: 
  - Volumen silenciado
  - Navegador no permite Web Audio
  - Dispositivo no tiene audio
- **Solución**: 
  - Revisar volumen del sistema
  - Usar navegador moderno (Chrome, Firefox)
  - Verificar conexión de audio

### Marcador no aparece en mapa
- **Causa**: 
  - Mapa no está inicializado
  - Coordenadas inválidas
  - Script sos-base.js no cargó
- **Solución**:
  - Verificar que mapa está visible
  - Revisar valores de lat/lng
  - Verificar consola por errores

---

## API Pública

### Funciones en App Usuario

```javascript
// Activar SOS
activarSOS()

// Desactivar SOS
desactivarSOS()
```

### Funciones en Panel Base

```javascript
// Marcar alerta como atendida
atenderSOS(sosId)

// Acceso a alertas activas
console.log(S.sosActivos)

// Acceso a marcadores SOS
console.log(window.sosMarkers)
```

---

## Archivos Generados

```
APP_USUARIO/
├── js/
│   ├── sos.js (278 líneas) - Módulo SOS del usuario
│   ├── app.js (modificado) - Integración de SOS
│   └── ...
└── index.html (modificado) - Botón y estilos SOS

base/
├── sos-base.js (449 líneas) - Sistema SOS base
├── index.html (modificado) - Integración script
└── ...
```

---

**Versión**: 1.0
**Última actualización**: Abril 2, 2026
**Autor**: Asistente IA
**Estado**: ✅ Producción lista

