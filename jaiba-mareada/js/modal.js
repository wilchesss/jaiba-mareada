import {
  crearReservacion, actualizarReservacion, eliminarReservacion,
  obtenerPagos, registrarPago, eliminarPago,
  marcarDiaCerrado, reabrirDia,
} from './supabase-client.js';
import {
  obtenerTarifaBase, obtenerHorasInicioValidas, calcularHoraFin,
  calcularMaxHorasExtra, calcularCostos, COSTO_HORA_EXTRA,
} from './reglas.js';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
const fmtFecha = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

let onCambio = () => {}; // callback para refrescar calendario/lista tras guardar

export function setOnCambio(cb) { onCambio = cb; }

const overlay = document.getElementById('modal-overlay');
const contenido = document.getElementById('modal-contenido');

export function cerrarModal() {
  overlay.classList.add('oculto');
  contenido.innerHTML = '';
}

function abrir(html) {
  contenido.innerHTML = html;
  overlay.classList.remove('oculto');
}

overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarModal(); });

// =====================================================================
// Punto de entrada: click en un día del calendario
// =====================================================================
export function abrirModalDia(fechaStr, reservacionExistente, diaCerradoExistente) {
  if (reservacionExistente) {
    renderDetalleReservacion(reservacionExistente);
  } else if (diaCerradoExistente) {
    renderDiaCerrado(fechaStr, diaCerradoExistente);
  } else {
    renderOpcionesDiaLibre(fechaStr);
  }
}

// =====================================================================
// Día libre: elegir "nueva reservación" o "marcar cerrado"
// =====================================================================
function renderOpcionesDiaLibre(fechaStr) {
  abrir(`
    <div class="modal-header">
      <h2 style="text-transform:capitalize;">${fmtFecha(fechaStr)}</h2>
      <button id="cerrar-modal">✕</button>
    </div>
    <p style="color:var(--gris-texto); margin-bottom:16px;">Este día está libre. ¿Qué quieres hacer?</p>
    <button class="btn-primario" id="btn-ir-reservar" style="margin-bottom:10px;">Nueva reservación</button>
    <button class="btn-secundario" id="btn-marcar-cerrado">Marcar como cerrado</button>
  `);
  document.getElementById('cerrar-modal').onclick = cerrarModal;
  document.getElementById('btn-ir-reservar').onclick = () => renderFormularioReservacion(fechaStr);
  document.getElementById('btn-marcar-cerrado').onclick = () => renderFormularioCerrar(fechaStr);
}

function renderFormularioCerrar(fechaStr) {
  abrir(`
    <div class="modal-header">
      <h2>Cerrar día</h2>
      <button id="cerrar-modal">✕</button>
    </div>
    <p style="text-transform:capitalize; color:var(--gris-texto); margin-bottom:14px;">${fmtFecha(fechaStr)}</p>
    <div class="campo">
      <label for="motivo-cierre">Motivo (opcional)</label>
      <input type="text" id="motivo-cierre" placeholder="Ej. mantenimiento" />
    </div>
    <button class="btn-primario" id="btn-confirmar-cierre">Confirmar cierre</button>
    <p class="error-msg oculto" id="cerrar-error"></p>
  `);
  document.getElementById('cerrar-modal').onclick = cerrarModal;
  document.getElementById('btn-confirmar-cierre').onclick = async () => {
    const motivo = document.getElementById('motivo-cierre').value.trim();
    try {
      await marcarDiaCerrado(fechaStr, motivo);
      cerrarModal();
      onCambio();
    } catch (err) {
      mostrarErrorEnModal('cerrar-error', err);
    }
  };
}

function renderDiaCerrado(fechaStr, diaCerrado) {
  abrir(`
    <div class="modal-header">
      <h2>Día cerrado</h2>
      <button id="cerrar-modal">✕</button>
    </div>
    <p style="text-transform:capitalize; color:var(--gris-texto);">${fmtFecha(fechaStr)}</p>
    ${diaCerrado.motivo ? `<p style="margin-top:8px;"><strong>Motivo:</strong> ${diaCerrado.motivo}</p>` : ''}
    <button class="btn-secundario" id="btn-reabrir" style="margin-top:18px;">Reabrir este día</button>
  `);
  document.getElementById('cerrar-modal').onclick = cerrarModal;
  document.getElementById('btn-reabrir').onclick = async () => {
    await reabrirDia(diaCerrado.id);
    cerrarModal();
    onCambio();
  };
}

// =====================================================================
// Formulario: nueva reservación / editar reservación
// =====================================================================
function renderFormularioReservacion(fechaStr, reservacionExistente = null) {
  const esEdicion = !!reservacionExistente;
  const fechaInicial = esEdicion ? reservacionExistente.fecha : fechaStr;

  abrir(`
    <div class="modal-header">
      <h2>${esEdicion ? 'Editar reservación' : 'Nueva reservación'}</h2>
      <button id="cerrar-modal">✕</button>
    </div>
    <form id="form-reservacion">
      <div class="campo">
        <label for="r-fecha">Fecha</label>
        <input type="date" id="r-fecha" value="${fechaInicial}" required />
      </div>
      <div class="campo">
        <label for="r-nombre">Cliente</label>
        <input type="text" id="r-nombre" value="${esEdicion ? reservacionExistente.cliente_nombre : ''}" required />
      </div>
      <div class="campo">
        <label for="r-telefono">Teléfono</label>
        <input type="tel" id="r-telefono" value="${esEdicion ? reservacionExistente.cliente_telefono : ''}" required />
      </div>
      <div class="campo">
        <label for="r-hora-inicio">Hora de inicio</label>
        <select id="r-hora-inicio" required></select>
      </div>
      <div class="campo">
        <label for="r-horas-extra">Horas extra (+$${COSTO_HORA_EXTRA} c/u)</label>
        <select id="r-horas-extra" required></select>
      </div>
      <div class="resumen-costo" id="resumen-costo"></div>
      <button type="submit" class="btn-primario" id="btn-guardar-reservacion">${esEdicion ? 'Guardar cambios' : 'Crear reservación'}</button>
      <p class="error-msg oculto" id="reservacion-error"></p>
      ${esEdicion ? '<button type="button" class="btn-peligro" id="btn-eliminar-reservacion" style="width:100%; margin-top:12px;">Eliminar reservación</button>' : ''}
    </form>
  `);

  document.getElementById('cerrar-modal').onclick = cerrarModal;

  const selectFecha = document.getElementById('r-fecha');
  const selectHoraInicio = document.getElementById('r-hora-inicio');
  const selectHorasExtra = document.getElementById('r-horas-extra');

  function poblarHorasExtra(fecha, horaInicio) {
    const maxExtra = horaInicio ? calcularMaxHorasExtra(fecha, horaInicio) : 6;
    const actual = selectHorasExtra.value || (esEdicion ? String(reservacionExistente.horas_extra) : '0');
    selectHorasExtra.innerHTML = '';
    for (let i = 0; i <= maxExtra; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i === 0 ? 'Sin horas extra' : `${i} hora${i > 1 ? 's' : ''} extra`;
      selectHorasExtra.appendChild(opt);
    }
    if ([...selectHorasExtra.options].some((o) => o.value === actual)) selectHorasExtra.value = actual;
  }

  function poblarHorasInicio(fecha) {
    const horas = obtenerHorasInicioValidas(fecha, 0);
    const actual = selectHoraInicio.value || (esEdicion ? reservacionExistente.hora_inicio.slice(0, 5) : '');
    selectHoraInicio.innerHTML = '';
    horas.forEach((h) => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      selectHoraInicio.appendChild(opt);
    });
    if (horas.includes(actual)) selectHoraInicio.value = actual;
    poblarHorasExtra(fecha, selectHoraInicio.value);
    actualizarResumen();
  }

  function actualizarResumen() {
    const fecha = selectFecha.value;
    const horasExtra = Number(selectHorasExtra.value || 0);
    const { costoBase, costoExtra, costoTotal, anticipoRequerido } = calcularCostos(fecha, horasExtra);
    const horaFin = calcularHoraFin(selectHoraInicio.value, horasExtra);
    document.getElementById('resumen-costo').innerHTML = `
      <div class="linea"><span>Tarifa base (6h)</span><span>${fmt.format(costoBase)}</span></div>
      <div class="linea"><span>Horas extra (${horasExtra})</span><span>${fmt.format(costoExtra)}</span></div>
      <div class="linea"><span>Termina aprox.</span><span>${horaFin}</span></div>
      <div class="linea total"><span>Total</span><span>${fmt.format(costoTotal)}</span></div>
      <div class="linea"><span>Anticipo requerido (50%)</span><span>${fmt.format(anticipoRequerido)}</span></div>
    `;
  }

  selectFecha.addEventListener('change', () => poblarHorasInicio(selectFecha.value));
  selectHoraInicio.addEventListener('change', () => { poblarHorasExtra(selectFecha.value, selectHoraInicio.value); actualizarResumen(); });
  selectHorasExtra.addEventListener('change', actualizarResumen);

  poblarHorasInicio(fechaInicial);

  document.getElementById('form-reservacion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fecha = selectFecha.value;
    const horasExtra = Number(selectHorasExtra.value || 0);
    const horaInicio = selectHoraInicio.value;
    const horaFin24 = calcularHoraFinISO(fecha, horaInicio, horasExtra);
    const { costoBase, costoExtra } = calcularCostos(fecha, horasExtra);

    const payload = {
      fecha,
      cliente_nombre: document.getElementById('r-nombre').value.trim(),
      cliente_telefono: document.getElementById('r-telefono').value.trim(),
      hora_inicio: horaInicio,
      hora_fin: horaFin24,
      horas_extra: horasExtra,
      costo_base: costoBase,
      costo_extra: costoExtra,
    };

    try {
      if (esEdicion) {
        await actualizarReservacion(reservacionExistente.id, payload);
      } else {
        await crearReservacion(payload);
      }
      cerrarModal();
      onCambio();
    } catch (err) {
      mostrarErrorEnModal('reservacion-error', err);
    }
  });

  if (esEdicion) {
    document.getElementById('btn-eliminar-reservacion').onclick = async () => {
      if (!confirm('¿Eliminar esta reservación? Esta acción no se puede deshacer.')) return;
      await eliminarReservacion(reservacionExistente.id);
      cerrarModal();
      onCambio();
    };
  }
}

// Convierte hora "13:00" + horasExtra en hora_fin en formato 24h (puede pasar de 24 -> se normaliza a 00-23 del mismo evento)
function calcularHoraFinISO(fecha, horaInicioStr, horasExtra) {
  const [h, m] = horaInicioStr.split(':').map(Number);
  const totalMin = h * 60 + m + (6 + horasExtra) * 60;
  const horaFinal = Math.floor(totalMin / 60) % 24;
  const minFinal = totalMin % 60;
  return `${String(horaFinal).padStart(2, '0')}:${String(minFinal).padStart(2, '0')}`;
}

// =====================================================================
// Detalle de reservación existente: info, pagos, editar, eliminar
// =====================================================================
async function renderDetalleReservacion(reservacion) {
  abrir(`
    <div class="modal-header">
      <h2 style="text-transform:capitalize;">${fmtFecha(reservacion.fecha)}</h2>
      <button id="cerrar-modal">✕</button>
    </div>
    <p><strong>${reservacion.cliente_nombre}</strong> · ${reservacion.cliente_telefono}</p>
    <p style="color:var(--gris-texto); font-size:0.88rem; margin-top:2px;">
      ${reservacion.hora_inicio.slice(0,5)} — ${reservacion.hora_fin.slice(0,5)}
      ${reservacion.horas_extra > 0 ? ` · +${reservacion.horas_extra}h extra` : ''}
    </p>
    <div class="resumen-costo">
      <div class="linea"><span>Total</span><span>${fmt.format(reservacion.costo_total)}</span></div>
      <div class="linea"><span>Pagado</span><span>${fmt.format(reservacion.total_pagado)}</span></div>
      <div class="linea total"><span>Saldo pendiente</span><span>${fmt.format(reservacion.saldo_pendiente)}</span></div>
    </div>

    <h3 style="font-size:1rem; margin-bottom:8px;">Pagos</h3>
    <div class="lista-pagos" id="lista-pagos">Cargando…</div>

    ${reservacion.saldo_pendiente > 0 ? `
    <div class="campo" style="margin-top:14px;">
      <label for="monto-pago">Registrar pago</label>
      <input type="number" id="monto-pago" min="1" max="${reservacion.saldo_pendiente}" step="1" placeholder="Monto" />
    </div>
    <button class="btn-primario" id="btn-registrar-pago">Registrar pago</button>
    <p class="error-msg oculto" id="pago-error"></p>
    ` : `<p style="color:#237a41; font-weight:600; margin-top:10px;">✓ Totalmente pagado</p>`}

    <div class="acciones-modal">
      <button class="btn-secundario" id="btn-editar-reservacion" style="flex:1;">Editar</button>
      <button class="btn-peligro" id="btn-eliminar-desde-detalle">Eliminar</button>
    </div>
  `);

  document.getElementById('cerrar-modal').onclick = cerrarModal;
  document.getElementById('btn-editar-reservacion').onclick = () => renderFormularioReservacion(reservacion.fecha, reservacion);
  document.getElementById('btn-eliminar-desde-detalle').onclick = async () => {
    if (!confirm('¿Eliminar esta reservación? Esta acción no se puede deshacer.')) return;
    await eliminarReservacion(reservacion.id);
    cerrarModal();
    onCambio();
  };

  const btnPago = document.getElementById('btn-registrar-pago');
  if (btnPago) {
    btnPago.onclick = async () => {
      const monto = Number(document.getElementById('monto-pago').value);
      if (!monto || monto <= 0) return mostrarErrorEnModal('pago-error', new Error('Ingresa un monto válido'));
      try {
        await registrarPago(reservacion.id, monto);
        cerrarModal();
        onCambio();
      } catch (err) {
        mostrarErrorEnModal('pago-error', err);
      }
    };
  }

  const pagos = await obtenerPagos(reservacion.id);
  const listaPagos = document.getElementById('lista-pagos');
  if (pagos.length === 0) {
    listaPagos.innerHTML = '<p style="color:var(--gris-texto); font-size:0.85rem;">Sin pagos registrados aún.</p>';
  } else {
    listaPagos.innerHTML = pagos.map((p) => `
      <div class="pago-item" data-id="${p.id}">
        <span>${new Date(p.fecha_pago + 'T00:00:00').toLocaleDateString('es-MX')} — ${fmt.format(p.monto)}</span>
        <button data-eliminar-pago="${p.id}">✕</button>
      </div>
    `).join('');
    listaPagos.querySelectorAll('[data-eliminar-pago]').forEach((btn) => {
      btn.onclick = async () => {
        await eliminarPago(btn.dataset.eliminarPago);
        cerrarModal();
        onCambio();
      };
    });
  }
}

function mostrarErrorEnModal(elementId, err) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = err.message || 'Ocurrió un error. Intenta de nuevo.';
  el.classList.remove('oculto');
}

export { renderFormularioReservacion };
