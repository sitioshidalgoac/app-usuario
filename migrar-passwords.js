/**
 * migrar-passwords.js — Script one-shot de migración
 *
 * USO:
 *   node migrar-passwords.js
 *
 * REQUISITOS:
 *   - serviceAccountKey.json en el mismo directorio
 *   - npm install firebase-admin  (ya instalado en el proyecto raíz)
 *
 * QUÉ HACE:
 *   1. Lee todas las unidades de /unidades en RTDB
 *   2. Genera contraseña temporal única de 8 chars por unidad
 *   3. Calcula SHA-256(salt + password), guarda salt+hash en
 *      /config/conductores/{unit}
 *   4. Actualiza la contraseña en Firebase Auth al hash resultante
 *   5. Exporta passwords_temporales.csv con las contraseñas en texto claro
 *      para que Base las entregue a cada conductor
 *
 * ⚠️  EJECUTAR SOLO UNA VEZ. Las contraseñas temporales se generan
 *     aleatoriamente — al correrlo de nuevo se generarán diferentes
 *     contraseñas y los conductores que ya recibieron la suya no podrán
 *     entrar hasta que Base les entregue la nueva.
 */

"use strict";

const admin      = require("firebase-admin");
const { createHash, randomBytes } = require("crypto");
const fs         = require("fs");
const path       = require("path");

// ── Inicializar Admin SDK ──────────────────────────────────────────────────
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: "https://sitios-hidalgo-gps-default-rtdb.firebaseio.com",
});

const db   = admin.database();
const auth = admin.auth();

// ── Utilidades ─────────────────────────────────────────────────────────────

/** Normaliza unitId igual que el cliente: quita guiones, espacios, etc. */
function normalizeUnit(raw) {
  return String(raw).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Genera contraseña temporal legible: letras+números, 8 chars */
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones
  return Array.from(randomBytes(8))
    .map(b => chars[b % chars.length])
    .join("");
}

/** SHA-256(salt + password) → hex string */
function hashPassword(salt, password) {
  return createHash("sha256").update(salt + password).digest("hex");
}

// ── Script principal ───────────────────────────────────────────────────────
async function migrar() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  MIGRACIÓN DE CONTRASEÑAS — SITIOS HIDALGO A.C.");
  console.log("══════════════════════════════════════════════════\n");

  // 1. Leer unidades desde RTDB
  console.log("📡 Leyendo /unidades desde RTDB...");
  const snap = await db.ref("unidades").get();
  if (!snap.exists()) {
    console.error("❌ No se encontraron unidades en /unidades. Abortando.");
    process.exit(1);
  }

  const unidades = snap.val();
  const unitIds  = Object.keys(unidades);
  console.log(`   Encontradas: ${unitIds.length} unidades\n`);

  const resultados = [];
  let ok = 0, fail = 0;

  for (const rawId of unitIds) {
    const unitKey = normalizeUnit(rawId);
    const email   = `unidad${unitKey}@sitiohidalgo.mx`;

    try {
      // 2. Generar contraseña temporal
      const tempPassword = generateTempPassword();
      const salt         = randomBytes(16).toString("hex");
      const hash         = hashPassword(salt, tempPassword);

      // 3. Guardar salt + hash en /config/conductores/{unit}
      await db.ref(`config/conductores/${unitKey}`).set({ salt, hash });

      // 4. Actualizar Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          console.warn(`  ⚠️  Sin cuenta Auth para ${email} — solo se guardó en RTDB`);
          resultados.push({ unidad: rawId, unitKey, email, tempPassword, auth: "NO_EXISTE" });
          ok++;
          continue;
        }
        throw err;
      }
      await auth.updateUser(userRecord.uid, { password: hash });

      console.log(`  ✅ ${rawId.padEnd(12)} → ${email}`);
      resultados.push({ unidad: rawId, unitKey, email, tempPassword, auth: "OK" });
      ok++;

    } catch (e) {
      console.error(`  ❌ ${rawId}: ${e.message}`);
      resultados.push({ unidad: rawId, unitKey, email: `unidad${normalizeUnit(rawId)}@sitiohidalgo.mx`, tempPassword: "ERROR", auth: "FALLO" });
      fail++;
    }
  }

  // 5. Exportar CSV
  const csvPath = path.join(__dirname, "passwords_temporales.csv");
  const header  = "Unidad,UnitKey,Email,PasswordTemporal,EstadoAuth\n";
  const rows    = resultados
    .map(r => `${r.unidad},${r.unitKey},${r.email},${r.tempPassword},${r.auth}`)
    .join("\n");

  fs.writeFileSync(csvPath, header + rows, "utf8");

  console.log("\n══════════════════════════════════════════════════");
  console.log(`  RESUMEN: ${ok} exitosos, ${fail} fallidos`);
  console.log(`  📄 CSV exportado: passwords_temporales.csv`);
  console.log("══════════════════════════════════════════════════");
  console.log("\n⚠️  IMPORTANTE: Entrega las contraseñas temporales a cada conductor");
  console.log("   y pídeles que las cambien desde el panel de Base.\n");
  console.log("⚠️  ELIMINA passwords_temporales.csv después de distribuir las claves.\n");

  process.exit(fail > 0 ? 1 : 0);
}

migrar().catch(e => {
  console.error("Error fatal:", e);
  process.exit(1);
});
