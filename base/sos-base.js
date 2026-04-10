// ══════════════════════════════════════════════════════
//  SITIOS HIDALGO GPS — Sistema de SOS (Panel Base)
//  Listener para alertas de SOS en tiempo real
// ══════════════════════════════════════════════════════

/**
 * INTEGRACIÓN:
 * 1. Este archivo debe cargarse en base/index.html como:
 *    <script src="sos-base.js" defer></script>
 * 2. Requiere que exista:
 *    - rtdb (Firebase Realtime Database)
 *    - S.map (mapa Leaflet)
 *    - S.sosActivos (objeto de estado)
 *    - S.markers (marcadores del mapa)
 * 3. Define funciones globales como sosMarkmarker(), activarAlarma(), etc.
 */

let sosMarkers = {};      // Marcadores de SOS { sosId: L.Marker }
let sosAlarmaInterval = null;
let sosAlarmaContext = null;
let _sosRef = null;       // Referencia guardada para cleanup

/* ─── INIT LISTENER SOS ────────────────────────── */
function initListenerSOS() {
  if (!rtdb) {
    console.error("❌ Firebase RTDB no inicializado");
    return;
  }

  // Evitar listeners duplicados si se llama más de una vez
  if (_sosRef) {
    _sosRef.off();
    _sosRef = null;
  }

  console.log("🚨 Iniciando listener para alertas SOS...");

  _sosRef = rtdb.ref('alertas_sos');

  _sosRef.on('child_added', (snap) => {
    const sosId = snap.key;
    const data = snap.val();

    if (!data) return;

    console.log("🚨 NUEVA ALERTA SOS:", sosId, data);

    // Agregar a estado global
    S.sosActivos[sosId] = data;

    // Crear marcador parpadeante  
    crearMarcadorSOS(sosId, data);

    // Activar alarma sonora
    activarAlarmaSOS();

    // Mostrar notificación/modal
    mostrarNotificacionSOS(sosId, data);

    // Actualizar marcador de la unidad si existe
    if (data.nroUnidad && S.markers[data.nroUnidad]) {
      const unitData = S.unidades[data.nroUnidad] || {};
      S.markers[data.nroUnidad].setIcon(buildUnitIcon(data.nroUnidad, { ...unitData, sos: true }));
    }
  });

  _sosRef.on('child_changed', (snap) => {
    const sosId = snap.key;
    const data = snap.val();

    if (data.estado === 'ATENDIDO') {
      console.log("✅ SOS ATENDIDO:", sosId);
      atenderSOS(sosId);
    }
  });

  _sosRef.on('child_removed', (snap) => {
    const sosId = snap.key;
    console.log("🗑️ SOS REMOVIDO:", sosId);
    removerSOS(sosId);
  });
}

/* ─── CREAR MARCADOR SOS ─────────────────────── */
function crearMarcadorSOS(sosId, data) {
  if (!S.map || !data.lat || !data.lng) return;

  // Remover marcador anterior si existe
  if (sosMarkers[sosId]) {
    S.map.removeLayer(sosMarkers[sosId]);
  }

  // Crear icono parpadeante
  const marcador = L.marker([data.lat, data.lng], {
    icon: L.divIcon({
      html: `
        <div style="
          width:40px; height:40px; border-radius:50%;
          background:#ef4444; color:#fff;
          display:flex; align-items:center; justify-content:center;
          font-size:20px; border:3px solid #fff;
          box-shadow: 0 0 0 8px rgba(239,68,68,0.4);
          animation: sos-blink-marker 0.8s infinite;
        ">
          🚨
        </div>
        <style>
          @keyframes sos-blink-marker {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
        </style>
      `,
      className: 'sos-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })
  });

  // Pop-up con información
  const popContent = `
    <div style="font-family:'Rajdhani',sans-serif;min-width:200px">
      <b style="color:#ef4444;font-size:14px;">🚨 ¡ALERTA SOS!</b><br>
      Usuario: <b>${data.usuario || 'Desconocido'}</b><br>
      Teléfono: <b>${data.telefono || '—'}</b><br>
      Unidad: <b>${data.nroUnidad || 'N/A'}</b><br>
      <small style="color:#64748b">
        ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}<br>
        ${new Date(data.ts).toLocaleTimeString('es-MX')}
      </small><br><br>
      <button onclick="window.atenderSOS?.('${sosId}')" style="
        width:100%; padding:8px; background:#10b981; color:#fff;
        border:none; border-radius:4px; font-weight:700; cursor:pointer;
      ">✅ ALERTA ATENDIDA</button>
    </div>
  `;

  marcador.bindPopup(popContent).openPopup();
  marcador.addTo(S.map);

  sosMarkers[sosId] = marcador;

  // Centrar mapa en la alerta
  S.map.flyTo([data.lat, data.lng], 18, { duration: 1 });
}

/* ─── ALARMA SONORA ────────────────────────────– */
function activarAlarmaSOS() {
  if (sosAlarmaInterval) {
    console.warn("⚠️ Alarma SOS ya está activa");
    return;
  }

  console.log("🔊 Iniciando alarma sonora continua...");

  try {
    sosAlarmaContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn("⚠️ Web Audio API no disponible");
    return;
  }

  function playBeep() {
    const now = sosAlarmaContext.currentTime;
    const osc = sosAlarmaContext.createOscillator();
    const gain = sosAlarmaContext.createGain();

    osc.connect(gain);
    gain.connect(sosAlarmaContext.destination);

    // Sonido de alarma: frecuencia variable
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  sosAlarmaInterval = setInterval(() => {
    // Detener si no hay alertas SOS activas
    if (Object.keys(S.sosActivos).length === 0) {
      detenerAlarmaSOS();
      return;
    }
    playBeep();
  }, 300);
}

function detenerAlarmaSOS() {
  if (sosAlarmaInterval) {
    clearInterval(sosAlarmaInterval);
    sosAlarmaInterval = null;
    console.log("🔇 Alarma SOS detenida");
  }
}

/* ─── NOTIFICACIÓN VISUAL ───────────────────── */
function mostrarNotificacionSOS(sosId, data) {
  // Crear o actualizar notificación visual
  let notifEl = document.getElementById('sos-notification');

  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.id = 'sos-notification';
    notifEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.5);
      font-family: 'Rajdhani', sans-serif;
      min-width: 350px;
      animation: slideIn 0.4s ease-out;
    `;
    document.body.appendChild(notifEl);
  }

  notifEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <span style="font-size: 24px; animation: blink 0.6s infinite;">🚨</span>
      <div>
        <div style="font-size: 16px; font-weight: 700;">¡ALERTA SOS!</div>
        <div style="font-size: 12px; opacity: 0.9;">Emergencia reportada</div>
      </div>
    </div>
    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px;">
      <div><b>Usuario:</b> ${data.usuario || 'Desconocido'}</div>
      <div><b>Teléfono:</b> ${data.telefono || '—'}</div>
      <div><b>Unidad:</b> ${data.nroUnidad || '—'}</div>
      <div style="margin-top: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
        📍 ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}
      </div>
    </div>
    <button onclick="window.atenderSOS?.('${sosId}')" style="
      width: 100%;
      padding: 10px;
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
      ✅ MARCAR COMO ATENDIDA
    </button>
  `;

  // Auto-cerrar después de 30 segundos o si se marca como atendida
  setTimeout(() => {
    if (notifEl.parentElement) {
      notifEl.style.animation = 'slideOut 0.4s ease-in';
      setTimeout(() => notifEl.remove(), 400);
    }
  }, 30000);
}

/* ─── ATENDER SOS ────────────────────────────── */
function atenderSOS(sosId) {
  console.log("✅ Atendiendo SOS:", sosId);

  // Marcar como atendido en Firebase
  try {
    rtdb.ref(`alertas_sos/${sosId}/estado`).set('ATENDIDO', (err) => {
      if (err) console.error("Error al marcar como atendido:", err);
    });
  } catch (e) {
    console.error("Error al atenderSOS:", e);
  }
}

/* ─── REMOVER SOS ────────────────────────────– */
function removerSOS(sosId) {
  // Remover marcador del mapa
  if (sosMarkers[sosId]) {
    S.map?.removeLayer(sosMarkers[sosId]);
    delete sosMarkers[sosId];
  }

  // Remover del estado global
  delete S.sosActivos[sosId];

  // Si no hay más alertas SOS, detener la alarma
  if (Object.keys(S.sosActivos).length === 0) {
    detenerAlarmaSOS();
  }

  console.log("🗑️ SOS removido del mapa");
}

/* ─── AGREGAR ESTILOS CSS ────────────────────– */
function inyectarCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    @keyframes sos-blink-marker {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(0.8);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ─── INIT AL CARGAR ──────────────────────────– */
// initListenerSOS() e inyectarCSS() son llamadas desde startListeners()
// en index.html, donde rtdb y S.map ya están inicializados (post-login).
// No usar polling aquí — Firebase y el mapa no existen antes del login.

/* ─── DESTROY / CLEANUP ───────────────────────── */
function destroyListenerSOS() {
  if (_sosRef) {
    _sosRef.off();
    _sosRef = null;
  }
  detenerAlarmaSOS();
  // Limpiar marcadores del mapa
  Object.keys(sosMarkers).forEach(id => {
    S.map?.removeLayer(sosMarkers[id]);
    delete sosMarkers[id];
  });
  console.log("🧹 SOS listener destruido");
}

/* ─── EXPORTAR FUNCIONES GLOBALES ────────────– */
window.atenderSOS        = atenderSOS;
window.sosMarkers        = sosMarkers;
window.destroyListenerSOS = destroyListenerSOS;
