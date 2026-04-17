"use strict";

// ╔══════════════════════════════════════════════════════════════════════╗
// ║   SITIOS HIDALGO A.C. DE NOCHIXTLÁN — CLOUD FUNCTIONS v3.0         ║
// ║   Firebase Functions v5 (Gen 2) · Node 22 · Realtime Database       ║
// ║                                                                      ║
// ║   FUNCIONES:                                                         ║
// ║   ① verificarInactividad   — archiva unidades sin señal +48h        ║
// ║   ② limpiarDatos           — purga mensajes, logs y SOS viejos      ║
// ║   ③ alertaSOS              — notifica SOS en tiempo real             ║
// ║   ④ reporteDiario          — resumen de flotilla cada mañana         ║
// ║   ⑤ registrarHistorial     — auditoría de cada cambio de estado      ║
// ║   ⑥ monitorConexion        — detecta conductores que se desconectan  ║
// ║   ⑦ estadisticasHora       — snapshot horario de la flotilla         ║
// ║   ⑧ setConductorPassword   — HTTPS callable: hash+salt en RTDB      ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { onSchedule }               = require("firebase-functions/v2/scheduler");
const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");
const { onCall, HttpsError }        = require("firebase-functions/v2/https");
const { createHash, randomBytes }   = require("crypto");
const admin                        = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp({
  databaseURL: "https://sitios-hidalgo-gps-default-rtdb.firebaseio.com"
});

const db = admin.database();

// ─────────────────────────────────────────────
// CONFIGURACIÓN CENTRAL
// ─────────────────────────────────────────────
const CONFIG = {
  timezone:           "America/Mexico_City",
  limiteInactividad:  48 * 60 * 60 * 1000,      // 48h → archivar unidad
  limiteOffline:       2 * 60 * 60 * 1000,      //  2h → marcar como offline
  limiteMensajes:      7 * 24 * 60 * 60 * 1000, // 7 días → borrar mensajes
  limiteLogEventos:   30 * 24 * 60 * 60 * 1000, // 30 días → borrar logs
  limiteSosResueltos: 14 * 24 * 60 * 60 * 1000, // 14 días → borrar SOS
  maxMensajesRadio:   500,
  sistema:            "SITIOS HIDALGO A.C. DE NOCHIXTLÁN",
};

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

/** Normaliza status a mayúsculas para comparaciones consistentes */
function normStatus(s) {
  return String(s || "").toUpperCase().trim();
}

/** Formatea ms a "Xh Ym" */
function formatDuracion(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Fecha legible CDMX */
function fechaMX(ts = Date.now()) {
  return new Date(ts).toLocaleString("es-MX", { timeZone: CONFIG.timezone });
}

/** Escribe un evento en /log_eventos/ */
async function logEvento(tipo, datos) {
  return db.ref("log_eventos").push({
    tipo,
    ...datos,
    sistema:   CONFIG.sistema,
    timestamp: Date.now(),
    fechaMX:   fechaMX(),
  });
}

/** Ejecuta array de promesas en lotes para no saturar Firebase */
async function ejecutarEnLotes(promesas, tamLote = 10) {
  for (let i = 0; i < promesas.length; i += tamLote) {
    await Promise.all(promesas.slice(i, i + tamLote));
  }
}


// ════════════════════════════════════════════════════════════
// ⓪ PUENTE SOLICITUDES — TIEMPO REAL
//    Cuando un pasajero crea /solicitudes_clientes/{solId},
//    copia el registro a /solicitudes/{solId} para que los
//    conductores lo reciban. Sin este puente el flujo de
//    viajes está completamente roto.
// ════════════════════════════════════════════════════════════
exports.puenteSolicitud = onValueCreated(
  { ref: "solicitudes_clientes/{solId}", region: "us-central1" },
  async (event) => {
    const sol   = event.data.val();
    const solId = event.params.solId;

    if (!sol) return;
    // Evitar re-procesar si ya fue puenteada (idempotencia)
    if (sol.estado === "PROCESADA") return;

    const ts = Date.now();

    await db.ref(`solicitudes/${solId}`).set({
      origen_lat:   sol.lat        || null,
      origen_lng:   sol.lng        || null,
      destino:      sol.destino    || "",
      referencia:   sol.referencia || "",
      cliente:      sol.cliente    || "Cliente",
      telefono:     sol.telefono   || "",
      // unidadId: asignada a la base más cercana elegida por la app usuario
      unidadId:     sol.unitId     || null,
      conductorId:  null,
      estado:       "enviado",
      baseId:       sol.unitId     || null,
      solClienteId: solId,
      timestamp:    ts,
      creadoEn:     admin.database.ServerValue.TIMESTAMP,
    });

    // Marcar la solicitud del cliente como procesada
    await db.ref(`solicitudes_clientes/${solId}/estado`).set("PROCESADA");

    await logEvento("SOLICITUD_PUENTEADA", {
      solId,
      cliente:  sol.cliente || "—",
      destino:  sol.destino || "—",
      unidadId: sol.unitId  || "sin asignar",
    });

    console.log(`[puente] ✅ Solicitud ${solId} → /solicitudes/${solId}`);
  }
);


// ════════════════════════════════════════════════════════════
// ① VERIFICAR INACTIVIDAD
//    Cada hora revisa todas las unidades.
//    - +2h sin señal  → status = "OFFLINE"
//    - +48h sin señal → archiva en /unidades_inactivas/ y elimina
// ════════════════════════════════════════════════════════════
exports.verificarInactividad = onSchedule(
  { schedule: "every 60 minutes", timeZone: CONFIG.timezone, timeoutSeconds: 120, memory: "256MiB" },
  async () => {
    const ahora    = Date.now();
    const snapshot = await db.ref("unidades").once("value");

    if (!snapshot.exists()) {
      console.log("[inactividad] Sin unidades registradas.");
      return;
    }

    const aArchivar = [];
    const aOffline  = [];

    snapshot.forEach(child => {
      const data     = child.val();
      const ultimaCx = data.timestamp || data.ultimaConexion || 0;
      const elapsed  = ahora - ultimaCx;
      const status   = normStatus(data.status);

      if (elapsed > CONFIG.limiteInactividad) {
        aArchivar.push({ key: child.key, data, elapsed });
      } else if (elapsed > CONFIG.limiteOffline && status !== "OFFLINE") {
        aOffline.push({ key: child.key, data, elapsed });
      }
    });

    const promesasOffline = aOffline.map(({ key, elapsed }) => {
      console.log(`[inactividad] ${key} → OFFLINE (${formatDuracion(elapsed)} sin señal)`);
      return db.ref(`unidades/${key}/status`).set("OFFLINE");
    });

    const promesasArchivar = aArchivar.map(({ key, data, elapsed }) => {
      const horas = Math.floor(elapsed / 3600000);
      console.log(`[inactividad] ${key} → ARCHIVANDO (${horas}h sin señal)`);

      return db.ref(`unidades_inactivas/${key}`).set({
        ...data,
        status:               "inactiva",
        motivo:               `Inactividad automática — ${horas}h sin señal GPS`,
        fechaDesactivacion:   ahora,
        fechaDesactivacionMX: fechaMX(ahora),
        horasInactiva:        horas,
      })
      .then(() => db.ref(`unidades/${key}`).remove())
      .then(() => logEvento("DESACTIVACION_AUTO", {
        unidad: key,
        nombre: data.name || "—",
        horas,
        lat:    data.lat || null,
        lng:    data.lng || null,
      }));
    });

    await ejecutarEnLotes([...promesasOffline, ...promesasArchivar]);
    console.log(`[inactividad] ✅ ${aOffline.length} offline, ${aArchivar.length} archivadas.`);
  }
);


// ════════════════════════════════════════════════════════════
// ② LIMPIAR DATOS
//    Cada día a las 2am limpia datos históricos viejos
// ════════════════════════════════════════════════════════════
exports.limpiarDatos = onSchedule(
  { schedule: "0 2 * * *", timeZone: CONFIG.timezone, timeoutSeconds: 180, memory: "256MiB" },
  async () => {
    const ahora = Date.now();
    let totalBorrados = 0;

    async function purgarNodo(ruta, limite) {
      const snap = await db.ref(ruta)
        .orderByChild("timestamp")
        .endAt(ahora - limite)
        .once("value");
      if (!snap.exists()) return 0;
      const p = [];
      snap.forEach(c => p.push(db.ref(`${ruta}/${c.key}`).remove()));
      await ejecutarEnLotes(p);
      return p.length;
    }

    const msgBorrados  = await purgarNodo("mensajes", CONFIG.limiteMensajes);
    const radioBorrados = await purgarNodo("radio",    CONFIG.limiteMensajes);
    console.log(`[limpieza] Mensajes: ${msgBorrados} eliminados`);
    console.log(`[limpieza] Radio: ${radioBorrados} eliminados`);

    const logBorrados = await purgarNodo("log_eventos", CONFIG.limiteLogEventos);
    console.log(`[limpieza] Log eventos: ${logBorrados} eliminados`);

    const sosSnap = await db.ref("alertas_sos")
      .orderByChild("timestamp")
      .endAt(ahora - CONFIG.limiteSosResueltos)
      .once("value");

    const sosBorrar = [];
    if (sosSnap.exists()) {
      sosSnap.forEach(c => {
        if (c.val().resuelta) sosBorrar.push(db.ref(`alertas_sos/${c.key}`).remove());
      });
      await ejecutarEnLotes(sosBorrar);
    }
    console.log(`[limpieza] SOS resueltos: ${sosBorrar.length} eliminados`);

    const todosMsg = await db.ref("mensajes").orderByChild("timestamp").once("value");
    if (todosMsg.numChildren() > CONFIG.maxMensajesRadio) {
      const exceso = todosMsg.numChildren() - CONFIG.maxMensajesRadio;
      const pExceso = [];
      let cont = 0;
      todosMsg.forEach(c => { if (cont++ < exceso) pExceso.push(db.ref(`mensajes/${c.key}`).remove()); });
      await ejecutarEnLotes(pExceso);
      console.log(`[limpieza] Exceso mensajes: ${pExceso.length} eliminados`);
      totalBorrados += pExceso.length;
    }

    totalBorrados += msgBorrados + radioBorrados + logBorrados + sosBorrar.length;

    await logEvento("LIMPIEZA_DIARIA", {
      mensajesBorrados: msgBorrados,
      radioBorrados,
      logsBorrados:     logBorrados,
      sosBorrados:      sosBorrar.length,
      totalBorrados,
    });

    console.log(`[limpieza] ✅ Total: ${totalBorrados} registros eliminados.`);
  }
);


// ════════════════════════════════════════════════════════════
// ③ ALERTA SOS — TIEMPO REAL
//    Se dispara cuando status → "SOS"
// ════════════════════════════════════════════════════════════
exports.alertaSOS = onValueWritten(
  { ref: "unidades/{unitId}/status", region: "us-central1" },
  async (event) => {
    const antes  = normStatus(event.data.before.val());
    const ahora  = normStatus(event.data.after.val());
    const unitId = event.params.unitId;

    if (ahora !== "SOS" || antes === "SOS") return;

    const unitSnap = await db.ref(`unidades/${unitId}`).once("value");
    const unit     = unitSnap.val() || {};
    const ts       = Date.now();

    const alertaRef = await db.ref("alertas_sos").push({
      unidad:      unitId,
      nombre:      unit.name   || unit.nombre || "Desconocido",
      telefono:    unit.phone  || null,
      lat:         unit.lat    || null,
      lng:         unit.lng    || null,
      precision:   unit.accuracy || null,
      velocidad:   unit.speed  || 0,
      resuelta:    false,
      atendidaPor: null,
      timestamp:   ts,
      fechaMX:     fechaMX(ts),
    });

    const coordStr = unit.lat
      ? `${unit.lat.toFixed(5)}, ${unit.lng.toFixed(5)}`
      : "coordenadas no disponibles";

    await db.ref("mensajes").push({
      de:        "SISTEMA",
      nombre:    "🚨 ALERTA SOS",
      texto:     `🚨 SOS ACTIVO — Unidad ${unitId} (${unit.name || "—"}) · Posición: ${coordStr} · ID Alerta: ${alertaRef.key}`,
      timestamp: ts,
      tipo:      "SOS",
      alertaId:  alertaRef.key,
    });

    await logEvento("SOS_ACTIVADO", {
      unidad:   unitId,
      nombre:   unit.name || "—",
      lat:      unit.lat  || null,
      lng:      unit.lng  || null,
      alertaId: alertaRef.key,
    });

    console.log(`[SOS] 🚨 Unidad ${unitId} activó SOS — AlertaID: ${alertaRef.key}`);
  }
);


// ════════════════════════════════════════════════════════════
// ④ REPORTE DIARIO — 6:00am hora México
// ════════════════════════════════════════════════════════════
exports.reporteDiario = onSchedule(
  { schedule: "0 6 * * *", timeZone: CONFIG.timezone, timeoutSeconds: 120, memory: "256MiB" },
  async () => {
    const ts    = Date.now();
    const fecha = new Date(ts).toLocaleDateString("es-MX", {
      timeZone: CONFIG.timezone, year: "numeric", month: "2-digit", day: "2-digit"
    }).split("/").reverse().join("-");

    const [activasSnap, inactivasSnap, sosSnap] = await Promise.all([
      db.ref("unidades").once("value"),
      db.ref("unidades_inactivas").once("value"),
      db.ref("alertas_sos").orderByChild("timestamp")
        .startAt(ts - 24 * 60 * 60 * 1000).once("value"),
    ]);

    const activas   = activasSnap.val()   || {};
    const inactivas = inactivasSnap.val() || {};

    const porEstado = { LIBRE: 0, OCUPADO: 0, DESCANSO: 0, OFFLINE: 0, SOS: 0 };
    Object.values(activas).forEach(u => {
      const s = normStatus(u.status) || "OFFLINE";
      porEstado[s] = (porEstado[s] || 0) + 1;
    });

    const enMovimiento = Object.values(activas).filter(u => (u.speed || 0) > 0);
    const velPromedio  = enMovimiento.length
      ? Math.round(enMovimiento.reduce((a, u) => a + (u.speed || 0), 0) / enMovimiento.length)
      : 0;

    let sosDia = 0;
    if (sosSnap.exists()) sosSnap.forEach(() => sosDia++);

    const reporte = {
      fecha,
      generadoEn:   ts,
      generadoEnMX: fechaMX(ts),
      sistema:      CONFIG.sistema,
      flotilla: {
        totalActivas:      Object.keys(activas).length,
        totalInactivas:    Object.keys(inactivas).length,
        porEstado,
        enMovimiento:      enMovimiento.length,
        velocidadPromedio: velPromedio + " km/h",
      },
      seguridad: { sosDia },
      unidades: Object.entries(activas).map(([id, u]) => ({
        id,
        nombre:      u.name   || "—",
        estado:      u.status || "offline",
        velocidad:   u.speed  || 0,
        ultimaSenal: fechaMX(u.timestamp),
      })),
    };

    await db.ref(`reportes/${fecha}`).set(reporte);
    await logEvento("REPORTE_DIARIO", {
      fecha,
      totalActivas:   reporte.flotilla.totalActivas,
      totalInactivas: reporte.flotilla.totalInactivas,
      sosDia,
    });

    console.log(`[reporte] ✅ Reporte ${fecha} — ${reporte.flotilla.totalActivas} activas, ${sosDia} SOS`);
  }
);


// ════════════════════════════════════════════════════════════
// ⑤ HISTORIAL DE ESTADOS — TIEMPO REAL
// ════════════════════════════════════════════════════════════
exports.registrarHistorial = onValueWritten(
  { ref: "unidades/{unitId}/status", region: "us-central1" },
  async (event) => {
    const antes  = normStatus(event.data.before.val());
    const nuevo  = normStatus(event.data.after.val());
    const unitId = event.params.unitId;

    if (antes === nuevo || !event.data.after.exists()) return;

    const unitSnap = await db.ref(`unidades/${unitId}`).once("value");
    const unit     = unitSnap.val() || {};
    const ts       = Date.now();

    await db.ref(`historial/${unitId}`).push({
      de:        antes || "—",
      a:         nuevo,
      nombre:    unit.name  || "—",
      lat:       unit.lat   || null,
      lng:       unit.lng   || null,
      velocidad: unit.speed || 0,
      timestamp: ts,
      fechaMX:   fechaMX(ts),
    });

    console.log(`[historial] ${unitId}: ${antes} → ${nuevo}`);
  }
);


// ════════════════════════════════════════════════════════════
// ⑥ MONITOR DE CONEXIÓN — TIEMPO REAL
// ════════════════════════════════════════════════════════════
exports.monitorConexion = onValueWritten(
  { ref: "unidades/{unitId}/status", region: "us-central1" },
  async (event) => {
    const antes  = normStatus(event.data.before.val());
    const nuevo  = normStatus(event.data.after.val());
    const unitId = event.params.unitId;

    const seConecta    = (!antes || antes === "OFFLINE") && nuevo && nuevo !== "OFFLINE";
    const seDesconecta = antes && antes !== "OFFLINE" && nuevo === "OFFLINE";

    if (!seConecta && !seDesconecta) return;

    const unitSnap = await db.ref(`unidades/${unitId}`).once("value");
    const unit     = unitSnap.val() || {};
    const ts       = Date.now();
    const tipo     = seConecta ? "CONEXION" : "DESCONEXION";

    await db.ref(`conexiones/${unitId}`).push({
      tipo,
      nombre:    unit.name || "—",
      lat:       unit.lat  || null,
      lng:       unit.lng  || null,
      timestamp: ts,
      fechaMX:   fechaMX(ts),
    });

    if (seConecta) {
      await db.ref(`unidades/${unitId}/ultimaConexion`).set(ts);
    }

    console.log(`[conexion] ${tipo} — ${unitId} (${unit.name || "—"})`);
  }
);


// ════════════════════════════════════════════════════════════
// ⑦ ESTADÍSTICAS POR HORA
// ════════════════════════════════════════════════════════════
exports.estadisticasHora = onSchedule(
  { schedule: "every 60 minutes", timeZone: CONFIG.timezone, timeoutSeconds: 60, memory: "128MiB" },
  async () => {
    const ts       = Date.now();
    const snapshot = await db.ref("unidades").once("value");
    const unidades = snapshot.val() || {};

    const stats = { LIBRE: 0, OCUPADO: 0, DESCANSO: 0, OFFLINE: 0, SOS: 0, total: 0 };
    Object.values(unidades).forEach(u => {
      const s = normStatus(u.status) || "OFFLINE";
      stats[s] = (stats[s] || 0) + 1;
      stats.total++;
    });

    const clave = new Date(ts).toLocaleString("sv-SE", {
      timeZone: CONFIG.timezone
    }).slice(0, 16).replace(" ", "T").replace(":", "-").slice(0, 13) + "h";

    await db.ref(`estadisticas/${clave}`).set({
      ...stats,
      timestamp: ts,
      fechaMX:   fechaMX(ts),
    });

    console.log(`[estadisticas] ✅ Snapshot ${clave} — ${stats.total} unidades`);
  }
);

// ════════════════════════════════════════════════════════════
// ⑧ setConductorPassword — HTTPS Callable
//    Solo operadores de base (@sitios-hidalgo.com) pueden
//    establecer o resetear la contraseña de una unidad.
//    Genera salt aleatorio, guarda SHA-256(salt+password) en
//    /config/conductores/{unit} y actualiza Firebase Auth.
// ════════════════════════════════════════════════════════════
exports.setConductorPassword = onCall(
  { region: "us-central1" },
  async (request) => {
    // ── Verificar que el llamante es operador de base ──────────────────
    if (!request.auth || !request.auth.token.email?.endsWith("@sitios-hidalgo.com")) {
      throw new HttpsError("permission-denied", "Solo operadores de base pueden cambiar contraseñas");
    }

    const { unit, password } = request.data;
    if (!unit || !password || password.length < 6) {
      throw new HttpsError("invalid-argument", "Se requieren unit y password (mínimo 6 caracteres)");
    }

    // Normalizar unidad igual que el cliente: sin guiones ni espacios
    const unitKey = String(unit).toLowerCase().replace(/[^a-z0-9]/g, "");
    const email   = `unidad${unitKey}@sitiohidalgo.mx`;

    // ── Generar salt aleatorio + SHA-256(salt + password) ─────────────
    const salt         = randomBytes(16).toString("hex");
    const hash         = createHash("sha256").update(salt + password).digest("hex");

    // ── Escribir salt+hash en RTDB ─────────────────────────────────────
    await db.ref(`config/conductores/${unitKey}`).set({ salt, hash });

    // ── Actualizar Firebase Auth con el hash como nueva contraseña ─────
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", `No existe cuenta Firebase Auth para ${email}`);
      }
      throw err;
    }
    await admin.auth().updateUser(userRecord.uid, { password: hash });

    console.log(`[setConductorPassword] ✅ Contraseña actualizada para ${unitKey}`);
    return { ok: true, unit: unitKey };
  }
);
