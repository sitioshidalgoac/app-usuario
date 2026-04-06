// ============================================================
// MÓDULO: Panel de Calificaciones y Alertas en Tiempo Real
// App: APP BASE CENTRAL (base-gps)
// Archivo: panel-calificaciones-base.js
// Importar en el HTML principal de App Base
// ============================================================

// ─── CONSTANTES ─────────────────────────────────────────────
const TIEMPO_ATENCION_MS   = 10 * 60 * 1000; // 10 minutos
const INTERVALO_TEMPORIZADOR = 1000;           // actualizar cada 1s

// ─── ESTADO ──────────────────────────────────────────────────
const _baseState = {
  alertasActivas:       {},   // viajeId → datos
  calificacionesHoy:    [],
  metricas:             {},   // conductorId → métricas
  listeners:            [],   // para limpiar al desmontar
  intervalosTimer:      {},   // viajeId → intervalId
};

// ─── INYECCIÓN DE ESTILOS ────────────────────────────────────
function _inyectarEstilosBase() {
  if (document.getElementById("style-panel-cal-base")) return;

  const style = document.createElement("style");
  style.id = "style-panel-cal-base";
  style.textContent = `
    /* ── Panel contenedor ── */
    #panel-calificaciones-base {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0a0f1e;
      color: #e2e8f0;
    }

    /* ── Sección de alertas rojas ── */
    #seccion-alertas-rojas {
      border-bottom: 1px solid #1e293b;
      padding-bottom: 16px; margin-bottom: 16px;
    }

    .base-section-title {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.12em; color: #475569;
      margin: 0 0 12px; padding: 0;
    }

    /* ── Tarjeta de alerta ── */
    .alerta-card {
      background: #1a0a0a;
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 10px;
      position: relative;
      animation: pulseRed 2s infinite;
    }
    @keyframes pulseRed {
      0%, 100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      50%       { border-color: #f87171; box-shadow: 0 0 0 4px rgba(239,68,68,0.12); }
    }
    .alerta-card.atendida {
      background: #0a1a0a; border-color: #22c55e;
      animation: none;
    }

    .alerta-header {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 8px;
    }
    .alerta-info { flex: 1; }
    .alerta-unidad {
      font-size: 15px; font-weight: 700; color: #fef2f2;
    }
    .alerta-fecha {
      font-size: 11px; color: #7f1d1d; margin-top: 2px;
    }

    .alerta-estrellas { font-size: 18px; }

    .alerta-etiquetas {
      display: flex; flex-wrap: wrap; gap: 4px;
      margin-bottom: 10px;
    }
    .alerta-etiqueta {
      background: #450a0a; border: 1px solid #7f1d1d;
      border-radius: 12px; padding: 2px 10px;
      font-size: 11px; color: #fca5a5;
    }

    /* ── Temporizador ── */
    .alerta-timer {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 10px;
    }
    .timer-icono { font-size: 16px; }
    .timer-texto {
      font-size: 13px; font-weight: 700;
    }
    .timer-texto.urgente { color: #ef4444; }
    .timer-texto.ok      { color: #f97316; }
    .timer-barra {
      flex: 1; height: 4px; background: #1e293b;
      border-radius: 2px; overflow: hidden;
    }
    .timer-barra-fill {
      height: 100%; border-radius: 2px;
      transition: width 1s linear, background-color 1s;
    }

    /* ── Acciones ── */
    .alerta-acciones { display: flex; gap: 8px; }
    .btn-atender {
      flex: 1; padding: 8px;
      background: #dc2626; border: none;
      border-radius: 8px; color: #fff;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .btn-atender:hover { background: #ef4444; }
    .btn-atender.atendido {
      background: #166534; cursor: default;
    }
    .btn-ver-historial {
      padding: 8px 12px;
      background: #1e293b; border: 1px solid #334155;
      border-radius: 8px; color: #94a3b8;
      font-size: 12px; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-ver-historial:hover { border-color: #64748b; color: #f1f5f9; }

    /* ── Sin alertas ── */
    .sin-alertas {
      text-align: center; padding: 16px;
      color: #22c55e; font-size: 13px;
      background: #052e16; border-radius: 10px;
      border: 1px solid #166534;
    }

    /* ── Estadísticas del día ── */
    #seccion-stats-hoy { margin-bottom: 16px; }

    .stats-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .stat-box {
      background: #1e293b; border-radius: 10px;
      padding: 12px 8px; text-align: center;
      border: 1px solid #334155;
    }
    .stat-numero {
      font-size: 24px; font-weight: 800;
      display: block; line-height: 1;
    }
    .stat-numero.verde  { color: #22c55e; }
    .stat-numero.rojo   { color: #ef4444; }
    .stat-numero.azul   { color: #3b82f6; }
    .stat-label {
      font-size: 10px; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-top: 4px; display: block;
    }

    /* ── Ranking de conductores ── */
    #seccion-ranking { margin-bottom: 16px; }

    .ranking-item {
      display: flex; align-items: center; gap: 10px;
      background: #1e293b; border-radius: 10px;
      padding: 10px 12px; margin-bottom: 6px;
      border: 1px solid #334155;
      cursor: pointer; transition: border-color 0.2s;
    }
    .ranking-item:hover { border-color: #475569; }
    .ranking-pos {
      font-size: 11px; color: #64748b;
      min-width: 20px; text-align: center;
    }
    .ranking-unidad {
      font-size: 13px; font-weight: 700; flex: 1;
    }
    .ranking-stars { font-size: 13px; }
    .ranking-viajes { font-size: 11px; color: #64748b; }
    .ranking-badge {
      font-size: 10px; padding: 2px 8px;
      border-radius: 10px; font-weight: 600;
    }
    .ranking-badge.verde {
      background: #052e16; color: #22c55e; border: 1px solid #166534;
    }
    .ranking-badge.rojo {
      background: #450a0a; color: #ef4444; border: 1px solid #7f1d1d;
    }
    .ranking-badge.gris {
      background: #1e293b; color: #64748b; border: 1px solid #334155;
    }

    /* ── Modal de historial ── */
    #modal-historial-cal {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
    }
    .modal-cal-inner {
      background: #0f172a; border-radius: 16px;
      padding: 24px; max-width: 400px; width: 90%;
      max-height: 80vh; overflow-y: auto;
      border: 1px solid #1e293b;
    }
    .modal-cal-titulo {
      font-size: 16px; font-weight: 700; margin: 0 0 16px;
      display: flex; justify-content: space-between;
    }
    .modal-cal-cerrar {
      background: none; border: none; color: #64748b;
      font-size: 20px; cursor: pointer; padding: 0;
    }
    .historial-item {
      background: #1e293b; border-radius: 8px;
      padding: 10px 12px; margin-bottom: 8px;
      border-left: 3px solid #334155;
    }
    .historial-item.alta { border-left-color: #22c55e; }
    .historial-item.media { border-left-color: #eab308; }
    .historial-item.baja { border-left-color: #ef4444; }
  `;
  document.head.appendChild(style);
}

// ─── INICIALIZAR FIREBASE LISTENERS ─────────────────────────
function _iniciarListeners() {
  // 1) Alertas activas (calificaciones ≤ 3 estrellas)
  const refAlertas = firebase.database().ref("/alertas_activas");
  const handlerAlertas = refAlertas.on("value", snap => {
    _baseState.alertasActivas = snap.val() || {};
    _renderPanel();
  });
  _baseState.listeners.push(() => refAlertas.off("value", handlerAlertas));

  // 2) Métricas de conductores
  const refMetricas = firebase.database().ref("/metricas_conductores");
  const handlerMetricas = refMetricas.on("value", snap => {
    _baseState.metricas = snap.val() || {};
    _renderPanel();
  });
  _baseState.listeners.push(() => refMetricas.off("value", handlerMetricas));

  // 3) Calificaciones de hoy
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const refCals = firebase.database().ref("/calificaciones")
    .orderByChild("timestamp").startAt(inicioHoy.getTime());
  const handlerCals = refCals.on("value", snap => {
    _baseState.calificacionesHoy = [];
    snap.forEach(child => {
      _baseState.calificacionesHoy.push({ id: child.key, ...child.val() });
    });
    _renderPanel();
  });
  _baseState.listeners.push(() => refCals.off("value", handlerCals));
}

// ─── RENDER PRINCIPAL ────────────────────────────────────────
function _renderPanel() {
  const contenedor = document.getElementById("panel-calificaciones-base");
  if (!contenedor) return;

  const alertasArr = Object.entries(_baseState.alertasActivas)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.timestamp - b.timestamp); // más antiguas primero

  const hoy = _baseState.calificacionesHoy;
  const totalHoy     = hoy.length;
  const alertasHoy   = hoy.filter(c => c.estrellas <= 3).length;
  const excel5Hoy    = hoy.filter(c => c.estrellas === 5).length;

  const ranking = _buildRanking();

  contenedor.innerHTML = `
    <!-- ALERTAS ROJAS -->
    <div id="seccion-alertas-rojas">
      <p class="base-section-title">
        🚨 Alertas activas — Calificaciones bajas (${alertasArr.filter(a => !a.atendida).length})
      </p>
      ${alertasArr.length === 0
        ? `<div class="sin-alertas">✅ Sin alertas activas. ¡Todo marcha bien!</div>`
        : alertasArr.map(_renderAlertaCard).join("")
      }
    </div>

    <!-- ESTADÍSTICAS DEL DÍA -->
    <div id="seccion-stats-hoy">
      <p class="base-section-title">📊 Resumen de hoy</p>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-numero azul">${totalHoy}</span>
          <span class="stat-label">Calificaciones</span>
        </div>
        <div class="stat-box">
          <span class="stat-numero rojo">${alertasHoy}</span>
          <span class="stat-label">Alertas rojas</span>
        </div>
        <div class="stat-box">
          <span class="stat-numero verde">${excel5Hoy}</span>
          <span class="stat-label">Excelentes</span>
        </div>
      </div>
    </div>

    <!-- RANKING DE CONDUCTORES -->
    <div id="seccion-ranking">
      <p class="base-section-title">🏆 Rendimiento de conductores</p>
      ${ranking.length === 0
        ? `<p style="color:#475569;font-size:13px;text-align:center">
             Sin datos suficientes aún
           </p>`
        : ranking.map((c, i) => _renderRankingItem(c, i)).join("")
      }
    </div>
  `;

  _bindEventosBase(contenedor, alertasArr);
  _iniciarTemporizadores(alertasArr);
}

// ─── RENDER TARJETA DE ALERTA ────────────────────────────────
function _renderAlertaCard(alerta) {
  const estrellas = "★".repeat(alerta.estrellas) + "☆".repeat(5 - alerta.estrellas);
  const etiquetasHTML = (alerta.etiquetas || [])
    .map(e => `<span class="alerta-etiqueta">${e.replace(/_/g, " ")}</span>`)
    .join("");
  const atendidaClass = alerta.atendida ? "atendida" : "";
  const fecha = new Date(alerta.timestamp).toLocaleTimeString("es-MX",
    { hour: "2-digit", minute: "2-digit" });

  return `
    <div class="alerta-card ${atendidaClass}" data-viaje="${alerta.id}">
      <div class="alerta-header">
        <div class="alerta-info">
          <div class="alerta-unidad">🚕 Unidad ${alerta.unidadNumero || "—"}</div>
          <div class="alerta-fecha">Viaje finalizado a las ${fecha}</div>
        </div>
        <div class="alerta-estrellas">${estrellas}</div>
      </div>

      ${etiquetasHTML
        ? `<div class="alerta-etiquetas">${etiquetasHTML}</div>`
        : ""}

      <div class="alerta-timer" id="timer-${alerta.id}">
        <span class="timer-icono">⏱️</span>
        <span class="timer-texto" id="timer-texto-${alerta.id}">
          ${alerta.atendida ? "✅ Atendida" : "Calculando..."}
        </span>
        <div class="timer-barra">
          <div class="timer-barra-fill" id="timer-fill-${alerta.id}"
               style="width:100%;background:#ef4444">
          </div>
        </div>
      </div>

      <div class="alerta-acciones">
        <button class="btn-atender ${alerta.atendida ? "atendido" : ""}"
                data-viaje="${alerta.id}"
                ${alerta.atendida ? "disabled" : ""}>
          ${alerta.atendida ? "✅ Atendida" : "📞 Marcar como atendida"}
        </button>
        <button class="btn-ver-historial" data-conductor="${alerta.conductorId}"
                data-unidad="${alerta.unidadNumero}">
          Ver historial
        </button>
      </div>
    </div>
  `;
}

// ─── TEMPORIZADORES ──────────────────────────────────────────
function _iniciarTemporizadores(alertasArr) {
  // Limpiar temporizadores anteriores
  Object.values(_baseState.intervalosTimer).forEach(clearInterval);
  _baseState.intervalosTimer = {};

  alertasArr.forEach(alerta => {
    if (alerta.atendida || !alerta.tiempoLimiteAtencion) return;

    const actualizar = () => {
      const textoEl = document.getElementById(`timer-texto-${alerta.id}`);
      const fillEl  = document.getElementById(`timer-fill-${alerta.id}`);
      if (!textoEl || !fillEl) {
        clearInterval(_baseState.intervalosTimer[alerta.id]);
        return;
      }

      const ahora    = Date.now();
      const restante = alerta.tiempoLimiteAtencion - ahora;
      const pct      = Math.max(0, Math.min(100,
                         (restante / TIEMPO_ATENCION_MS) * 100));

      if (restante <= 0) {
        textoEl.textContent  = "⚠️ ¡TIEMPO VENCIDO!";
        textoEl.className    = "timer-texto urgente";
        fillEl.style.width   = "0%";
        fillEl.style.background = "#7f1d1d";
        clearInterval(_baseState.intervalosTimer[alerta.id]);
        return;
      }

      const mins = Math.floor(restante / 60000);
      const secs = Math.floor((restante % 60000) / 1000);
      textoEl.textContent  = `${mins}:${secs.toString().padStart(2, "0")} para atender`;
      textoEl.className    = `timer-texto ${pct < 30 ? "urgente" : "ok"}`;
      fillEl.style.width   = `${pct}%`;
      fillEl.style.background = pct > 60 ? "#f97316"
                              : pct > 30 ? "#eab308"
                              : "#ef4444";
    };

    actualizar();
    _baseState.intervalosTimer[alerta.id] =
      setInterval(actualizar, INTERVALO_TEMPORIZADOR);
  });
}

// ─── RANKING ─────────────────────────────────────────────────
function _buildRanking() {
  return Object.entries(_baseState.metricas)
    .filter(([, m]) => m.totalCalificaciones >= 1)
    .map(([conductorId, m]) => ({
      conductorId,
      unidadNumero:      conductorId.replace("unidad", "").replace("@sitiohidalgo.com", ""),
      promedio:          m.promedioEstrellas || 0,
      totalCal:          m.totalCalificaciones || 0,
      alertasRojas:      m.alertasRojas || 0,
      bonosAcumulados:   m.bonosAcumulados || 0,
    }))
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, 10);
}

function _renderRankingItem(conductor, indice) {
  const estrellas   = "★".repeat(Math.round(conductor.promedio))
                    + "☆".repeat(5 - Math.round(conductor.promedio));
  const badgeClass  = conductor.promedio >= 4.5 ? "verde"
                    : conductor.promedio >= 3   ? "gris"
                    : "rojo";
  const badgeText   = conductor.promedio >= 4.5 ? `🏆 +${conductor.bonosAcumulados} bonos`
                    : conductor.alertasRojas > 2 ? `⚠️ ${conductor.alertasRojas} alertas`
                    : `${conductor.promedio.toFixed(1)} avg`;

  return `
    <div class="ranking-item" data-conductor="${conductor.conductorId}"
         data-unidad="${conductor.unidadNumero}">
      <span class="ranking-pos">#${indice + 1}</span>
      <span class="ranking-unidad">Unidad ${conductor.unidadNumero}</span>
      <span class="ranking-stars">${estrellas}</span>
      <span class="ranking-viajes">${conductor.totalCal} viajes</span>
      <span class="ranking-badge ${badgeClass}">${badgeText}</span>
    </div>
  `;
}

// ─── EVENTOS ─────────────────────────────────────────────────
function _bindEventosBase(contenedor, alertasArr) {
  // Botones "Marcar como atendida"
  contenedor.querySelectorAll(".btn-atender:not([disabled])").forEach(btn => {
    btn.addEventListener("click", async () => {
      const viajeId = btn.dataset.viaje;
      btn.disabled = true;
      btn.textContent = "Atendiendo...";
      try {
        await firebase.database()
          .ref(`/alertas_activas/${viajeId}`).update({ atendida: true });
        await firebase.database()
          .ref(`/calificaciones/${viajeId}`).update({
            atendida: true,
            timestampAtencion: Date.now(),
          });
      } catch (err) {
        console.error("[Base] Error al atender alerta:", err);
        btn.disabled = false;
        btn.textContent = "📞 Marcar como atendida";
      }
    });
  });

  // Botones "Ver historial"
  contenedor.querySelectorAll(".btn-ver-historial, .ranking-item").forEach(el => {
    el.addEventListener("click", () => {
      _mostrarHistorialConductor(el.dataset.conductor, el.dataset.unidad);
    });
  });
}

// ─── MODAL HISTORIAL ─────────────────────────────────────────
async function _mostrarHistorialConductor(conductorId, unidadNumero) {
  let modal = document.getElementById("modal-historial-cal");
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = "modal-historial-cal";
  modal.innerHTML = `
    <div class="modal-cal-inner">
      <div class="modal-cal-titulo">
        <span>📋 Historial — Unidad ${unidadNumero || "—"}</span>
        <button class="modal-cal-cerrar" id="btn-cerrar-modal-cal">✕</button>
      </div>
      <p style="color:#475569;font-size:13px;text-align:center">Cargando...</p>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#btn-cerrar-modal-cal").addEventListener("click", () =>
    modal.remove()
  );
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.remove();
  });

  try {
    const snap = await firebase.database().ref("/calificaciones")
      .orderByChild("conductorId").equalTo(conductorId)
      .limitToLast(20).get();

    const items = [];
    snap.forEach(child => items.unshift({ id: child.key, ...child.val() }));

    const metricas = _baseState.metricas[conductorId] || {};

    const inner = modal.querySelector(".modal-cal-inner");
    inner.innerHTML = `
      <div class="modal-cal-titulo">
        <span>📋 Historial — Unidad ${unidadNumero || "—"}</span>
        <button class="modal-cal-cerrar" id="btn-cerrar-modal-cal2">✕</button>
      </div>

      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-box">
          <span class="stat-numero azul">
            ${(metricas.promedioEstrellas || 0).toFixed(1)}
          </span>
          <span class="stat-label">Promedio</span>
        </div>
        <div class="stat-box">
          <span class="stat-numero rojo">${metricas.alertasRojas || 0}</span>
          <span class="stat-label">Alertas</span>
        </div>
        <div class="stat-box">
          <span class="stat-numero verde">${metricas.bonosAcumulados || 0}</span>
          <span class="stat-label">Bonos</span>
        </div>
      </div>

      ${items.length === 0
        ? `<p style="color:#475569;font-size:13px;text-align:center">
             Sin calificaciones registradas
           </p>`
        : items.map(c => {
            const cls = c.estrellas >= 4 ? "alta"
                      : c.estrellas >= 3 ? "media" : "baja";
            const est = "★".repeat(c.estrellas) + "☆".repeat(5 - c.estrellas);
            const fecha = new Date(c.timestamp).toLocaleDateString("es-MX",
              { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            return `
              <div class="historial-item ${cls}">
                <div style="display:flex;justify-content:space-between">
                  <span style="font-size:16px">${est}</span>
                  <span style="font-size:11px;color:#64748b">${fecha}</span>
                </div>
                ${(c.etiquetas || []).length > 0
                  ? `<div style="margin-top:4px;font-size:11px;color:#94a3b8">
                       ${c.etiquetas.map(e => e.replace(/_/g, " ")).join(" · ")}
                     </div>`
                  : ""}
              </div>
            `;
          }).join("")
      }
    `;
    inner.querySelector("#btn-cerrar-modal-cal2").addEventListener("click", () =>
      modal.remove()
    );
  } catch (err) {
    console.error("[Base] Error al cargar historial:", err);
  }
}

// ─── LIMPIAR LISTENERS (llamar al cerrar sesión) ──────────────
function destruirPanelCalificaciones() {
  _baseState.listeners.forEach(fn => fn());
  _baseState.listeners = [];
  Object.values(_baseState.intervalosTimer).forEach(clearInterval);
  _baseState.intervalosTimer = {};
}

// ─── INICIALIZACIÓN PÚBLICA ───────────────────────────────────
/**
 * Llama esta función después de que Firebase esté inicializado.
 *
 * Requiere que exista en tu HTML:
 *   <div id="panel-calificaciones-base"></div>
 *
 * Ejemplo de uso en app-base.js:
 *
 *   import { iniciarPanelCalificaciones } from './panel-calificaciones-base.js';
 *   // o en script global:
 *   window.iniciarPanelCalificaciones();
 */
function iniciarPanelCalificaciones() {
  _inyectarEstilosBase();

  // Crear contenedor si no existe
  let contenedor = document.getElementById("panel-calificaciones-base");
  if (!contenedor) {
    console.warn("[Base] No se encontró #panel-calificaciones-base en el DOM.");
    return;
  }

  _iniciarListeners();
}

// Exportar
window.iniciarPanelCalificaciones  = iniciarPanelCalificaciones;
window.destruirPanelCalificaciones = destruirPanelCalificaciones;
