# 🔍 GUÍA DE REFERENCIA RÁPIDA — Cambios por Línea

## Archivo Principal
- `conductor/index.html`

---

## CAMBIOS POR SECCIÓN

### 1. LOGIN — Inicializar Status (Líneas 440-456)

**ANTES:**
```javascript
requestWakeLock();
startGPS();
subscribeMessages();
```

**AHORA:**
```javascript
requestWakeLock();
initializeDriverStatus();  // ← NUEVA LLAMADA
startGPS();
subscribeMessages();
```

**Razón:** Asegurar que el conductor inicie con status LIBRE en Firebase

---

### 2. NUEVAS FUNCIONES — Monitoreo (Líneas 470-630)

#### A) `initializeDriverStatus()` (Línea 555)
```javascript
function initializeDriverStatus() {
  if (!db || !driverUnit) return;
  
  const ref = db.ref('unidades/' + driverUnit);
  const now = firebase.database.ServerValue.TIMESTAMP;
  
  ref.set({
    id: driverUnit,
    name: driverName,
    status: 'LIBRE',  // ← SIEMPRE MAYÚSCULAS
    online: true,
    lat: 0,
    lng: 0,
    speed: 0,
    accuracy: 0,
    conectadoEn: now,
    timestamp: now,
    ultimoReporte: now
  }).then(() => {
    console.log('✅ Estado inicial sincronizado en Firebase — LIBRE');
    startStatusMonitor();  // ← Inicia monitor
  }).catch(err => {
    console.error('❌ Error inicializando estado:', err);
    toast('⚠️ Error de conexión inicial', 'warn');
  });
}
```

**¿Qué hace?** Inicializa el estado en Firebase como LIBRE con confirmación

---

#### B) `startStatusMonitor()` (Línea 586)
```javascript
let statusMonitorInt = null;  // ← Variable global para el intervalo

function startStatusMonitor() {
  if (statusMonitorInt) clearInterval(statusMonitorInt);  // Limpiar anterior
  
  statusMonitorInt = setInterval(() => {
    if (!db || !driverUnit) return;
    
    db.ref('unidades/' + driverUnit + '/status').once('value', snap => {
      const fbStatus = String(snap.val() || '').toUpperCase();
      const localStatus = String(myStatus).toUpperCase();
      
      if (fbStatus !== localStatus && fbStatus !== 'SOS' && localStatus !== 'SOS') {
        console.warn(`⚠️ Desincronización: Firebase=${fbStatus}, Local=${localStatus}`);
        
        // Auto-resincronizar
        db.ref('unidades/' + driverUnit).update({
          status: localStatus,
          lastResync: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          console.log('✅ Status resintonizado');
        }).catch(err => {
          console.error('❌ Error en resintonización:', err);
        });
      }
    });
  }, 30000);  // ← Cada 30 segundos
}
```

**¿Qué hace?** Verifica cada 30 segundos que Firebase tenga el status correcto y lo corrige si hay error

---

#### C) `stopStatusMonitor()` (Línea 614)
```javascript
function stopStatusMonitor() {
  if (statusMonitorInt) {
    clearInterval(statusMonitorInt);
    statusMonitorInt = null;
  }
}
```

**¿Qué hace?** Detiene el monitor (se llama en logout)

---

### 3. FUNCIÓN `sendPos()` MEJORADA (Línea 662)

**ANTES:**
```javascript
function sendPos() {
  if (!db || !driverUnit || !lat) return;
  const now = firebase.database.ServerValue.TIMESTAMP;
  const ref = db.ref('unidades/' + driverUnit);
  
  ref.onDisconnect().remove();  // ← Borra TODO al desconectar
  
  ref.set({  // ← .set() sobrescribe todo
    id: driverUnit, name: driverName,
    lat, lng, speed: spd, accuracy: acc,
    status: myStatus,  // ← Sin garantía de mayúsculas
    online: true,
    ultimoReporte: now, timestamp: now, lastSeen: now
  });
}
```

**AHORA:**
```javascript
function sendPos() {
  if (!db || !driverUnit || lat === null) return;
  
  const now = firebase.database.ServerValue.TIMESTAMP;
  const ref = db.ref('unidades/' + driverUnit);
  
  // Configurar presencia: al desconectar, marcar como offline
  ref.child('online').onDisconnect().set(false);  // ← Más específico
  ref.child('status').onDisconnect().set('OFFLINE');
  
  // Actualizar datos de GPS y estado (usar update para no sobrescribir)
  ref.update({  // ← .update() preserva otros campos
    id: driverUnit,
    name: driverName,
    lat: lat,
    lng: lng,
    speed: spd,
    accuracy: acc,
    status: String(myStatus).toUpperCase(),  // ← MAYÚSCULAS garantizadas
    online: true,
    ultimoReporte: now,
    timestamp: now,
    lastSeen: now,
    'sync-check': firebase.database.ServerValue.TIMESTAMP  // ← Para debugging
  }).catch(err => {
    console.error('❌ Error actualizando posición en Firebase:', err);
  });
  
  document.getElementById('conn-txt').textContent = 'EN LÍNEA';
  document.getElementById('conn-txt').style.color = '#00FF88';
}
```

**Cambios clave:**
- ✅ `.update()` en lugar de `.set()` (no sobrescribe otros campos)
- ✅ `.onDisconnect()` más específico (solo los campos necesarios)
- ✅ `String(myStatus).toUpperCase()` garantiza mayúsculas
- ✅ Manejo de errores con `.catch()`

---

### 4. FUNCIÓN `setStatus()` COMPLETAMENTE REESCRITA (Línea 709)

**ANTES:** (31 líneas, sin validación)
```javascript
function setStatus(s) {
  const prev = myStatus;

  if (s === 'OCUPADO' && prev !== 'OCUPADO') {
    viajeActivo = { startTime: Date.now(), startLat: lat, startLng: lng };
  }
  // ... guardar viaje sin validación ...
  
  myStatus = s;  // ← Sin validación
  document.getElementById('gc-st').textContent = s.toUpperCase();
  document.querySelectorAll('.st-btn').forEach(b => {
    b.classList.toggle('on', b.dataset.st === s);
  });
  if (db && driverUnit) db.ref('unidades/' + driverUnit + '/status').set(s);  // ← Sin confirmación
}
```

**AHORA:** (116 líneas, con validación completa)
```javascript
function setStatus(s) {
  const prev = myStatus;
  const statusUpperCase = String(s).trim().toUpperCase();
  
  // ═══ VALIDAR STATUS ═══
  if (!['LIBRE', 'OCUPADO', 'DESCANSO', 'SOS'].includes(statusUpperCase)) {
    console.error('❌ Status inválido:', s);
    toast('⚠️ Status inválido', 'warn');
    return;
  }

  // ═══ CAPTURAR FIN DE VIAJE ═══
  if (prev === 'OCUPADO' && statusUpperCase !== 'OCUPADO' && viajeActivo) {
    if (lat !== null && lng !== null) {  // ← Validar GPS
      const inicio = viajeActivo.startTime;
      const fin = Date.now();
      const durMinutos = Math.max(1, Math.round((fin - inicio) / 60000));
      const distancia = calcDist(viajeActivo.startLat, viajeActivo.startLng, lat, lng);

      const viaje = {
        id: historial.length + 1,
        inicio: firebase.database.ServerValue.TIMESTAMP,  // ← Server timestamp
        fin: firebase.database.ServerValue.TIMESTAMP,
        fecha: new Date(inicio).toLocaleDateString('es-MX'),
        horaIni: new Date(inicio).toLocaleTimeString('es-MX', { 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        }),
        horaFin: new Date(fin).toLocaleTimeString('es-MX', { 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        }),
        duracion: durMinutos,
        distancia: Math.max(0, distancia).toFixed(1),  // ← Nunca negativa
        latIni: viajeActivo.startLat,
        lngIni: viajeActivo.startLng,
        latFin: lat,
        lngFin: lng,
        estado: 'completado'
      };

      // Guardar localmente
      historial.unshift(viaje);
      tripViajes++;
      totalKm += parseFloat(viaje.distancia);
      document.getElementById('pf-viajes').textContent = tripViajes;
      document.getElementById('pf-km').textContent = totalKm.toFixed(1);
      renderHistorial();

      // ═══ GUARDAR EN FIREBASE CON CONFIRMACIÓN ═══
      if (db && driverUnit) {
        const viajePath = 'historial/' + driverUnit + '/' + viaje.id;
        db.ref(viajePath).set(viaje)  // ← Confirmación
          .then(() => {
            console.log('📝 Viaje guardado en Firebase:', viajePath);
            toast('✅ Viaje registrado en bitácora', 'ok');
          })
          .catch(err => {
            console.error('❌ Error guardando viaje:', err);
            toast('⚠️ Error guardando viaje: ' + err.message, 'warn');
          });
      }

      viajeActivo = null;
    } else {  // ← Sin GPS
      console.warn('⚠️ Coordenadas GPS no disponibles, viaje no guardado');
      toast('⚠️ Sin señal GPS — viaje no registrado', 'warn');
      viajeActivo = null;
    }
  }

  // ═══ INICIAR NUEVO VIAJE ═══
  if (statusUpperCase === 'OCUPADO' && prev !== 'OCUPADO') {
    if (lat !== null && lng !== null) {  // ← Requerir GPS
      viajeActivo = {
        startTime: Date.now(),
        startLat: lat,
        startLng: lng
      };
      console.log('🚖 Viaje iniciado:', viajeActivo);
    } else {  // ← Sin GPS, rechazar cambio de estado
      console.warn('⚠️ Sin GPS disponible — no se puede iniciar viaje');
      toast('⚠️ Requiere señal GPS para estado OCUPADO', 'warn');
      return;  // ← NO cambiar estado
    }
  }

  // ═══ ACTUALIZAR LOCALMENTE ═══
  myStatus = statusUpperCase;
  document.getElementById('gc-st').textContent = statusUpperCase;
  document.querySelectorAll('.st-btn').forEach(b => {
    b.classList.toggle('on', b.dataset.st === statusUpperCase);
  });

  // ═══ SINCRONIZAR EN FIREBASE ═══
  if (db && driverUnit) {
    const statusRef = db.ref('unidades/' + driverUnit);
    
    statusRef.update({  // ← .update() NO sobrescribe
      status: statusUpperCase,  // ← MAYÚSCULAS
      ultimoEstado: firebase.database.ServerValue.TIMESTAMP,
      lastStatusChange: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      console.log('✅ Status sincronizado en Firebase:', statusUpperCase);
    }).catch(err => {
      console.error('❌ Error sincronizando status:', err);
      toast('⚠️ Error conectando con Base: ' + err.message, 'warn');
    });
  }
}
```

**Cambios principales:**
- ✅ Validación de status
- ✅ Captura de viaje CON validación GPS
- ✅ Confirmación de guardado con `.then/.catch`
- ✅ No cambia estado si no hay GPS (para OCUPADO)
- ✅ Usa timestamps del servidor

---

### 5. FUNCIÓN `calcDist()` MEJORADA (Línea 826)

**ANTES:**
```javascript
function calcDist(a, b, c, d) {
  if (!a || !c) return 0;
  const R = 6371, dL = (c-a)*Math.PI/180, dG = (d-b)*Math.PI/180;
  const x = Math.sin(dL/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
```

**AHORA:**
```javascript
function calcDist(lat1, lng1, lat2, lng2) {
  // Validar que todas las coordenadas sean números válidos
  if (!lat1 || !lng1 || !lat2 || !lng2 || 
      isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    console.warn('⚠️ Coordenadas inválidas para cálculo de distancia:', { lat1, lng1, lat2, lng2 });
    return 0;
  }

  // Fórmula de Haversine (correcta)
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  
  // Asegurar que el resultado sea positivo
  return Math.abs(dist) >= 0.001 ? dist : 0; // Ignorar distancias < 1 metro
}
```

**Cambios:**
- ✅ Nombres descriptivos de parámetros
- ✅ Validación explícita de cada coordenada
- ✅ Validar `isNaN()` para cada parámetro
- ✅ Ignora distancias < 1 metro
- ✅ Comentarios explicativos

---

### 6. FUNCIÓN `renderHistorial()` MEJORADA (Línea 851)

**ANTES:** (~10 líneas)
```javascript
function renderHistorial() {
  const el = document.getElementById('hist-list');
  document.getElementById('hist-dt').textContent = 'HOY · ' + tripViajes + ' VIAJES';
  if (!historial.length) {
    el.innerHTML = '...';
    return;
  }
  el.innerHTML = historial.map(v => `...`).join('');
}
```

**AHORA:** (~40 líneas)
```javascript
function renderHistorial() {
  const el = document.getElementById('hist-list');
  
  // Actualizar contador
  document.getElementById('hist-dt').textContent = 'HOY · ' + tripViajes + ' VIAJES';
  
  if (!historial || historial.length === 0) {
    el.innerHTML = '<div style="...">Los viajes aparecerán aquí<br>conforme avance el turno<br><br>'
      + '<span style="font-size:10px">Total: ' + totalKm.toFixed(1) + ' km</span></div>';
    return;
  }

  el.innerHTML = historial.map((v, idx) => {
    // Validaciones de seguridad
    const dur = v.duracion || 0;
    const dist = v.distancia || '0.0';
    const horaIni = v.horaIni || '—';
    const horaFin = v.horaFin || '—';
    const fecha = v.fecha || new Date().toLocaleDateString('es-MX');
    
    return `
      <div class="hist-item" style="opacity:${idx === 0 ? '1' : '0.7'};transition:opacity .3s">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="hist-id">VIAJE #${v.id || idx + 1}</span>
          <span style="font-family:var(--mono);font-size:9px;color:var(--muted);display:flex;gap:4px">
            <span>${v.estado === 'completado' ? '✅' : '⏳'}</span>
            <span>${fecha}</span>
          </span>
        </div>
        <div class="hist-grid">
          <div class="hist-box">
            <div class="hist-val">${dur}<small style="font-size:10px;color:var(--muted)">min</small></div>
            <div class="hist-lbl">DURACIÓN</div>
          </div>
          <div class="hist-box">
            <div class="hist-val">${dist}<small style="font-size:10px;color:var(--muted)">km</small></div>
            <div class="hist-lbl">DISTANCIA</div>
          </div>
        </div>
        <div class="hist-hora" style="text-align:center;font-size:11px">
          <span style="color:var(--green)">🕐 ${horaIni}</span>
          <span style="color:var(--muted);">→</span>
          <span style="color:var(--green)">${horaFin}</span>
        </div>
      </div>`;
  }).join('');
}
```

**Cambios:**
- ✅ Validación defensiva de cada campo
- ✅ Mostrar estado del viaje (✅ vs ⏳)
- ✅ Mostrar total de km
- ✅ Mejor presentación visual

---

### 7. FUNCIÓN `doLogout()` MEJORADA (Línea 486)

**ANTES:**
```javascript
function doLogout() {
  if (!confirm('¿Terminar turno?')) return;
  if (db && driverUnit) {
      db.ref('unidades/' + driverUnit).update({ status:'OFFLINE', online:false, speed:0 });
  }
  if (watchId) navigator.geolocation.clearWatch(watchId);
  if (sendInt) clearInterval(sendInt);
  firebase.auth().signOut();
  // Limpiar campos
  document.getElementById('l-unit').value = '';
  document.getElementById('l-name').value = '';
  document.getElementById('l-pass').value = '';
  driverUnit = ''; driverName = ''; lat = null; lng = null;
}
```

**AHORA:**
```javascript
function doLogout() {
  if (!confirm('¿Terminar turno?')) return;
  
  // Detener el monitor de sincronización
  stopStatusMonitor();  // ← NUEVA LÍNEA

  // Guardar estado final en Firebase
  if (db && driverUnit) {
    const ref = db.ref('unidades/' + driverUnit);
    ref.update({
      status: 'OFFLINE',
      online: false,
      speed: 0,
      desconectadoEn: firebase.database.ServerValue.TIMESTAMP,  // ← Timestamp
      ultimaTurno: tripViajes,  // ← Datos de turno
      ultimosKm: totalKm.toFixed(1)
    }).then(() => {
      console.log('✅ Sesión cerrada correctamente');
    }).catch(err => {
      console.error('❌ Error al desconectar:', err);
    });
  }

  // Limpiar listeners y timers
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (sendInt) {
    clearInterval(sendInt);
    sendInt = null;
  }

  // Cerrar sesión en Firebase Auth
  firebase.auth().signOut();

  // Resetear UI
  document.getElementById('scr-main').classList.remove('active');
  document.getElementById('scr-login').classList.add('active');
  document.getElementById('l-unit').value = '';
  document.getElementById('l-name').value = '';
  document.getElementById('l-pass').value = '';

  // Limpiar estado global
  driverUnit = '';
  driverName = '';
  myStatus = 'LIBRE';
  lat = null;
  lng = null;
  spd = 0;
  acc = 0;
  historial = [];
  tripViajes = 0;
  totalKm = 0;
  viajeActivo = null;
  
  toast('✅ Sesión cerrada', 'ok');
}
```

**Cambios:**
- ✅ Detiene monitor de sincronización
- ✅ Guardaposts datos finales con timestamp
- ✅ Limpieza más completa de variables
- ✅ Confirmación visual

---

### 8. FUNCIÓN `confirmSOS()` MEJORADA (Línea 904)

**ANTES:**
```javascript
function confirmSOS() {
  closeSOS();
  myStatus = 'SOS';
  document.getElementById('sos-activo').style.display = 'flex';
  if (db && driverUnit) {
    db.ref('unidades/' + driverUnit + '/status').set('SOS');  // ← .set()
    db.ref('alertas_sos/' + driverUnit).set({...});
  }
  toast('🚨 SOS enviado — Base Central notificada', 'danger');
}
```

**AHORA:**
```javascript
function confirmSOS() {
  closeSOS();
  myStatus = 'SOS';
  document.getElementById('sos-activo').style.display = 'flex';
  if (db && driverUnit) {
    // Usar update para no sobrescribir otros campos
    db.ref('unidades/' + driverUnit).update({  // ← .update()
      status: 'SOS',
      sosActivadoEn: firebase.database.ServerValue.TIMESTAMP  // ← Timestamp
    }).then(() => {
      console.log('🚨 SOS actualizado en Firebase');
    }).catch(err => {
      console.error('❌ Error enviando SOS:', err);
    });

    // Registrar en alertas
    db.ref('alertas_sos/' + driverUnit).set({
      unit: driverUnit,
      name: driverName,
      lat: lat || 0,
      lng: lng || 0,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }).catch(err => {
      console.error('❌ Error registrando alerta SOS:', err);
    });
  }
  toast('🚨 SOS enviado — Base Central notificada', 'danger');
}
```

**Cambios:**
- ✅ Usa `.update()` en lugar de `.set()`
- ✅ Confirmación con `.then/.catch`
- ✅ Manejo de errores en ambas operaciones

---

## Resumen de Cambios Globales

| Cambio | Antes | Después | Beneficio |
|--------|-------|---------|-----------|
| Status en Firebase | Minúsculas/inconsistente | MAYÚSCULAS garantizadas | Base recibe status correcto |
| Método de guardado | `.set()` | `.update()` | No sobrescribe otros campos |
| Confirmación cambios | Sin confirmación | `.then/.catch` | Feedback claro de éxito/error |
| Sincronización status | Sin monitoreo | Monitor cada 30s | Auto-corrección de errores |
| Validación GPS | Ninguna | Obligatoria para OCUPADO | Previene viajes inválidos |
| Cálculo distancia | Puede retornar NaN | Validado, retorna 0 si inválido | Evita datos corruptos |
| Timestamps | Del cliente | Del servidor | Sincronización correcta |

---

**Fin de guía de referencia rápida**
