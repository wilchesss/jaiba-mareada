// =====================================================================
// Reglas de negocio: precios y horarios de La Jaiba Mareada
// =====================================================================

// 0 = domingo ... 6 = sábado (getDay())
const DIAS_FIN_SEMANA = [0, 5, 6]; // viernes, sábado, domingo

function esFinDeSemana(fecha) {
  const dia = new Date(fecha + 'T00:00:00').getDay();
  return DIAS_FIN_SEMANA.includes(dia);
}

function obtenerTarifaBase(fecha) {
  return esFinDeSemana(fecha) ? 4000 : 3500;
}

const COSTO_HORA_EXTRA = 500;
const DURACION_BASE_HORAS = 6;

// Horas de inicio predefinidas por tipo de día
const HORAS_INICIO = {
  entreSemana: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], // hasta dejar 6h antes de 11pm... ver límite abajo
  finDeSemana: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
};

// Ventanas permitidas
const VENTANA = {
  entreSemana: { apertura: '11:00', cierre: '23:00' }, // 11am - 11pm
  finDeSemana: { apertura: '12:00', cierre: '25:00' }, // 12pm - 1am (25:00 = 1am del día siguiente, mismo evento)
};

function minutosDesdeMedianoche(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

function formatearHora(minutosTotales) {
  const h = Math.floor(minutosTotales / 60) % 24;
  const m = minutosTotales % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

/**
 * Devuelve las horas de inicio válidas para una fecha dada, considerando
 * que la reservación (6h base + horas extra máximas posibles) debe caber
 * dentro de la ventana permitida.
 */
function obtenerHorasInicioValidas(fecha, horasExtra = 0) {
  const finde = esFinDeSemana(fecha);
  const ventana = finde ? VENTANA.finDeSemana : VENTANA.entreSemana;
  const apertura = minutosDesdeMedianoche(ventana.apertura);
  const cierre = minutosDesdeMedianoche(ventana.cierre.replace('25:00', '25:00')); // ya en formato >24h
  const duracionTotal = (DURACION_BASE_HORAS + horasExtra) * 60;

  const candidatas = finde ? HORAS_INICIO.finDeSemana : HORAS_INICIO.entreSemana;
  return candidatas.filter((horaStr) => {
    const inicio = minutosDesdeMedianoche(horaStr);
    return inicio >= apertura && inicio + duracionTotal <= cierre;
  });
}

function calcularHoraFin(horaInicioStr, horasExtra = 0) {
  const inicio = minutosDesdeMedianoche(horaInicioStr);
  const duracionTotal = (DURACION_BASE_HORAS + horasExtra) * 60;
  return formatearHora(inicio + duracionTotal);
}

function calcularMaxHorasExtra(fecha, horaInicioStr) {
  const finde = esFinDeSemana(fecha);
  const ventana = finde ? VENTANA.finDeSemana : VENTANA.entreSemana;
  const cierre = minutosDesdeMedianoche(ventana.cierre);
  const inicio = minutosDesdeMedianoche(horaInicioStr);
  const minutosDisponibles = cierre - inicio - DURACION_BASE_HORAS * 60;
  return Math.max(0, Math.floor(minutosDisponibles / 60));
}

function calcularCostos(fecha, horasExtra = 0) {
  const costoBase = obtenerTarifaBase(fecha);
  const costoExtra = horasExtra * COSTO_HORA_EXTRA;
  const costoTotal = costoBase + costoExtra;
  const anticipoRequerido = costoTotal * 0.5;
  return { costoBase, costoExtra, costoTotal, anticipoRequerido };
}

export {
  esFinDeSemana,
  obtenerTarifaBase,
  obtenerHorasInicioValidas,
  calcularHoraFin,
  calcularMaxHorasExtra,
  calcularCostos,
  COSTO_HORA_EXTRA,
  DURACION_BASE_HORAS,
};
