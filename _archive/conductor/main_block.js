// ════════════════════════════════════════
// ESTADO GLOBAL
// (Firebase init y monitor → js/firebase-config.js)
// ════════════════════════════════════════
let driverUnit = '', driverName = '', myStatus = 'LIBRE';
let lat = null, lng = null, spd = 0, acc = 0;
let watchId = null, sendInt = null, wakeLock = null;
let historial = [], tripViajes = 0, totalKm = 0;
let viajeActivo = null;
let unread = 0;

// ════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('l-pass').addEventListener('keyup', e => { if(e.key==='Enter') doLogin(); });

function doLogin() {
  const unit = document.getElementById('l-unit').value.trim().toUpperCase();
  const name = document.getElementById('l-name').value.trim();
  const pass = document.getElementById('l-pass').value.trim();

  if (!unit) { toast('⚠️ Escribe el número de unidad', 'warn'); return; }
  if (!name) { toast('⚠️ Escribe tu nombre completo', 'warn'); return; }
  if (!pass) { toast('⚠️ Escribe el código de acceso', 'warn'); return; }

  // Fix 3: Verificar que Firebase esté inicializado antes de intentar el login
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
    toast('❌ Error interno: Firebase no inicializado. Recarga la página.', 'danger');
    return;
  }

  // Fix 2: Eliminar TODOS los caracteres no alfanuméricos (guiones, espacios, etc.)
  // para que "TX-01" genere "unidadtx01@sitiohidalgo.mx" de forma consistente
  const email = 'unidad' + unit.toLowerCase().replace(/[^a-z0-9]/g,'') + '@sitiohidalgo.mx';
  const btn = document.getElementById('btn-login');
  btn.textContent = 'CONECTANDO...'; btn.disabled = true;

  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(cred => {
      driverUnit = unit;
      driverName = name;
      myStatus = 'LIBRE'; // Inicializar en LIBRE

      document.getElementById('av-letter').textContent = name.charAt(0).toUpperCase();
      document.getElementById('d-name').textContent    = name;
      document.getElementById('d-unit').textContent    = 'Unidad ' + unit;
      document.getElementById('lbl-unit').textContent  = unit;
      document.getElementById('pf-name').textContent   = name;
      document.getElementById('pf-unit').textContent   = 'Unidad ' + unit;

      document.getElementById('scr-login').classList.remove('active');
      document.getElementById('scr-main').classList.add('active');

      requestWakeLock();
      initializeDriverStatus(); // ← INICIALIZAR STATUS EN FIREBASE
      startGPS();
      subscribeMessages();
      subscribeAlerts();
      subscribeDespacho();
      listenSOSReset();

      toast('✅ Bienvenido, ' + name + ' · Buen turno!', 'ok');
      // Mostrar pantalla de espera premium
      mostrarPantallaEspera();
      // Escuchar solicitudes asignadas
      escucharSolicitudesAsignadas();
      // Iniciar mapa GPS propio
      setTimeout(iniciarMiMapa, 500);
      // Cargar calificaciones del conductor
      cargarCalificacionesConductor();
      // Verificar estado de conexión
      _actualizarBannerOffline();
    }) // Fix 1: eliminado paréntesis extra que causaba el congelamiento
    .catch(e => {
      const msg = e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password'
        ? '❌ Unidad o código incorrecto'
        : e.code === 'auth/too-many-requests'
        ? '⚠️ Demasiados intentos, espera un momento'
        : '❌ Error de conexión';
      toast(msg, 'danger');
      btn.textContent = '▶ INICIAR TURNO'; btn.disabled = false;
    });
}

// ════════════════════════════════════════
// LOGOUT — MEJORADO
// ════════════════════════════════════════
function doLogout() {
  if (!confirm('¿Terminar turno?')) return;
  
  // Detener monitor y limpiar todos los listeners Firebase
  stopStatusMonitor();
  cleanupUIListeners();
  cleanupSOSListeners();
  cleanupViajeListeners();

  // Eliminar el nodo del conductor en Firebase para que el marcador
  // desaparezca del mapa de la Base de forma inmediata.
  if (db && driverUnit) {
    const ref = db.ref('unidades/' + driverUnit);
    ref.onDisconnect().cancel(); // Cancelar el hook antes de cerrar voluntariamente
    ref.remove().then(() => {
      console.log('✅ Nodo de unidad eliminado — turno cerrado');
    }).catch(err => {
      console.error('❌ Error al eliminar nodo:', err);
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

// ── Service Worker PWA ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw-conductor.js", { scope: "./" })
    .then(() => console.log("✅ SW Conductor registrado"))
    .catch(e => console.warn("SW Conductor:", e));
}

</script>
