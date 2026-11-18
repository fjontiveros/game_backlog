/**
 * API del backlog de juegos.
 *
 * @OnlyCurrentDoc
 *   ↑ Limita los permisos a ESTA planilla: el script no puede ver
 *     Gmail, Drive ni ningún otro archivo de tu cuenta.
 *
 * - GET  → lectura pública de la pestaña "Backlog".
 * - POST → acciones de escritura. Exigen el token
 *          guardado en las Propiedades del script (nunca en el código ni
 *          en el repo). Para crearlo o rotarlo: ejecutar `setupToken`.
 *
 * Instalación: ver README.md → "Configurar Apps Script".
 */

const SHEET_NAME = 'Backlog';
const TOKEN_PROPERTY = 'API_TOKEN';

// Encabezado normalizado (minúsculas, sin acentos) → campo del JSON.
const COLUMNS = {
  'juego': 'title',
  'plataforma': 'platform',
  'time to beat': 'timeToBeat',
  'fecha inicio': 'startDate',
  'fecha fin': 'endDate',
  'id': 'id',
  'orden': 'order',
  'portada': 'cover', // opcional: URL de una imagen para forzar la carátula
};

// Acciones permitidas. Cualquier otra cosa se rechaza.
const ACTIONS = {
  ping: null, // solo verifica el token
  start: actionStart_,
  complete: actionComplete_,
  unstart: actionUnstart_,
  uncomplete: actionUncomplete_,
  add: actionAdd_,
};

// ───────────────────────── Endpoints ─────────────────────────

function doGet() {
  try {
    const sheet = openSheet_();
    return json_({ ok: true, games: readGames_(sheet) });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'No se pudo leer la planilla.' });
  }
}

function doPost(e) {
  try {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {
      return json_({ ok: false, error: 'Pedido inválido.' });
    }
    if (!body || typeof body !== 'object') return json_({ ok: false, error: 'Pedido inválido.' });

    if (!checkToken_(body.token)) {
      Utilities.sleep(1000); // frena intentos por fuerza bruta
      return json_({ ok: false, code: 'unauthorized', error: 'Token inválido.' });
    }

    if (!Object.prototype.hasOwnProperty.call(ACTIONS, body.action)) {
      return json_({ ok: false, error: 'Acción desconocida.' });
    }
    const handler = ACTIONS[body.action];
    if (!handler) return json_({ ok: true });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      return json_({ ok: true, game: handler(body) });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    if (err instanceof UserError) return json_({ ok: false, error: err.message });
    console.error(err);
    return json_({ ok: false, error: 'Error inesperado al guardar.' });
  }
}

// ───────────────────────── Token ─────────────────────────

/**
 * Genera un token nuevo (reemplaza el anterior) y lo muestra en el registro
 * de ejecución. Copialo y pegalo en el sitio: no se vuelve a mostrar.
 */
function setupToken() {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, token);
  console.log('Token nuevo (copialo ahora): ' + token);
}

function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  // Comparación de tiempo constante.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

// ───────────────────────── Acciones ─────────────────────────

class UserError extends Error {}

/** Pendiente → En progreso. Fecha Inicio = fecha indicada (por defecto hoy). */
function actionStart_(body) {
  const ctx = findGame_(body.id);
  if (statusOf_(ctx.game) !== 'pending') throw new UserError('Ese juego ya no está pendiente. Actualizá la página.');
  const date = parseInputDate_(body.date, ctx.tz);
  writeDate_(ctx, 'startDate', date);
  return reread_(ctx);
}

/** En progreso → Completado. Fecha Fin = fecha indicada (por defecto hoy). */
function actionComplete_(body) {
  const ctx = findGame_(body.id);
  if (statusOf_(ctx.game) !== 'in_progress') throw new UserError('Ese juego no está en progreso. Actualizá la página.');
  const date = parseInputDate_(body.date, ctx.tz);
  const fmt = Utilities.formatDate(date, ctx.tz, 'yyyy-MM-dd');
  if (/^\d{4}-\d{2}-\d{2}$/.test(ctx.game.startDate) && fmt < ctx.game.startDate) {
    throw new UserError('La fecha de fin no puede ser anterior a la de inicio.');
  }
  writeDate_(ctx, 'endDate', date);
  return reread_(ctx);
}

/** Deshacer "empezar": borra Fecha Inicio (solo si sigue en progreso). */
function actionUnstart_(body) {
  const ctx = findGame_(body.id);
  if (statusOf_(ctx.game) !== 'in_progress') throw new UserError('No se puede deshacer: el juego cambió.');
  ctx.sheet.getRange(ctx.row, ctx.col.startDate + 1).clearContent();
  return reread_(ctx);
}

/** Deshacer "completar": borra Fecha Fin (solo si es una fecha). */
function actionUncomplete_(body) {
  const ctx = findGame_(body.id);
  if (statusOf_(ctx.game) !== 'completed') throw new UserError('No se puede deshacer: el juego cambió.');
  ctx.sheet.getRange(ctx.row, ctx.col.endDate + 1).clearContent();
  return reread_(ctx);
}

/**
 * Agrega un juego pendiente en la posición indicada de la cola (1 = primero).
 * Reordena "Orden" de los pendientes sin tocar el de los demás juegos.
 */
function actionAdd_(body) {
  const title = cleanText_(body.title, 150);
  if (!title) throw new UserError('Falta el nombre del juego.');
  const platform = cleanText_(body.platform, 40);
  let ttb = '';
  if (body.timeToBeat !== undefined && body.timeToBeat !== null && body.timeToBeat !== '') {
    ttb = Number(body.timeToBeat);
    if (!isFinite(ttb) || ttb < 0 || ttb > 1000) throw new UserError('Time to beat inválido.');
    ttb = Math.round(ttb * 10) / 10;
  }
  // Solo carátulas de Wikipedia/Wikimedia (lo que trae el autocompletado).
  // Se descarta lo que venga después de "?" o "#" (Wikipedia agrega "?utm_source=…").
  const cover = body.cover ? String(body.cover).split(/[?#]/)[0] : '';
  if (cover && (cover.length > 500 || !/^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/[A-Za-z0-9_\-.\/%(),!~]+$/.test(cover))) {
    throw new UserError('Carátula inválida.');
  }

  const sheet = openSheet_();
  const values = sheet.getDataRange().getValues();
  const col = columnsOf_(values[0]);
  if (col.id === undefined || col.order === undefined) throw new UserError('Faltan las columnas "Id" u "Orden".');
  const tz = sheet.getParent().getSpreadsheetTimeZone();

  // Pendientes en el orden actual de la cola.
  let maxId = 0;
  let maxOrder = 0;
  const pending = [];
  for (let r = 1; r < values.length; r++) {
    const id = number_(values[r][col.id]);
    const order = number_(values[r][col.order]);
    if (id !== null && id > maxId) maxId = id;
    if (order !== null && order > maxOrder) maxOrder = order;
    const game = rowToGame_(values[r], r + 1, col, tz);
    if (!game) continue;
    if (
      game.title.toLowerCase() === title.replace(/^'/, '').toLowerCase() &&
      (game.platform || '').toLowerCase() === platform.replace(/^'/, '').toLowerCase()
    ) {
      throw new UserError('Ese juego ya está en la planilla para esa plataforma.');
    }
    if (statusOf_(game) === 'pending') pending.push({ index: r, order: order, row: r + 1 });
  }
  pending.sort(function (a, b) {
    const ao = a.order === null ? Infinity : a.order;
    const bo = b.order === null ? Infinity : b.order;
    return ao - bo || a.row - b.row;
  });

  const position = body.position === undefined ? pending.length + 1 : Number(body.position);
  if (!Number.isInteger(position) || position < 1 || position > pending.length + 1) {
    throw new UserError('Posición inválida.');
  }

  // Los mismos números de "Orden" que ya usan los pendientes (+1 para el nuevo),
  // repartidos de nuevo en el orden resultante.
  const slots = pending.map(function (p) { return p.order; }).filter(function (o) { return o !== null; });
  let next = maxOrder;
  while (slots.length < pending.length + 1) slots.push(++next);
  slots.sort(function (a, b) { return a - b; });

  const NEW = { index: -1 };
  const queue = pending.slice();
  queue.splice(position - 1, 0, NEW);

  const orderColumn = values.slice(1).map(function (row) { return [row[col.order]]; });
  let newOrder = null;
  queue.forEach(function (item, i) {
    if (item === NEW) newOrder = slots[i];
    else orderColumn[item.index - 1][0] = slots[i];
  });
  if (orderColumn.length) sheet.getRange(2, col.order + 1, orderColumn.length, 1).setValues(orderColumn);

  const width = Math.max(sheet.getLastColumn(), values[0].length);
  const newRow = new Array(width).fill('');
  newRow[col.id] = maxId + 1;
  newRow[col.order] = newOrder;
  newRow[col.title] = title;
  if (col.platform !== undefined) newRow[col.platform] = platform;
  if (col.timeToBeat !== undefined) newRow[col.timeToBeat] = ttb;
  if (cover && col.cover !== undefined) newRow[col.cover] = cover; // sin columna: el sitio la busca solo
  sheet.appendRow(newRow);

  const rowNumber = sheet.getLastRow();
  return rowToGame_(sheet.getRange(rowNumber, 1, 1, width).getValues()[0], rowNumber, col, tz);
}

/** Texto seguro para una celda: sin saltos, largo acotado y sin fórmulas. */
function cleanText_(value, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new UserError('Texto inválido.');
  let s = value.replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita que la planilla lo tome como fórmula
  return s;
}

// ───────────────────────── Planilla ─────────────────────────

function openSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No existe la pestaña "' + SHEET_NAME + '"');
  return sheet;
}

function columnsOf_(headerRow) {
  const col = {};
  headerRow.forEach(function (header, i) {
    const field = COLUMNS[normalize_(header)];
    if (field && col[field] === undefined) col[field] = i;
  });
  if (col.title === undefined) throw new Error('Falta la columna "Juego"');
  return col;
}

function readGames_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const tz = sheet.getParent().getSpreadsheetTimeZone();
  const col = columnsOf_(values[0]);

  const games = [];
  for (let r = 1; r < values.length; r++) {
    const game = rowToGame_(values[r], r + 1, col, tz);
    if (game) games.push(game);
  }
  return games;
}

function rowToGame_(row, rowNumber, col, tz) {
  const title = text_(row[col.title]);
  if (!title) return null;
  return {
    row: rowNumber,
    id: text_(cell_(row, col.id)),
    title: title,
    platform: text_(cell_(row, col.platform)),
    timeToBeat: number_(cell_(row, col.timeToBeat)),
    startDate: date_(cell_(row, col.startDate), tz),
    endDate: date_(cell_(row, col.endDate), tz),
    order: number_(cell_(row, col.order)),
    cover: httpsUrl_(cell_(row, col.cover)),
  };
}

/** Busca la fila por la columna Id. */
function findGame_(id) {
  if ((typeof id !== 'string' && typeof id !== 'number') || String(id).length > 50) {
    throw new UserError('Id inválido.');
  }
  const sheet = openSheet_();
  const values = sheet.getDataRange().getValues();
  const col = columnsOf_(values[0]);
  if (col.id === undefined) throw new UserError('Falta la columna "Id".');
  if (col.startDate === undefined || col.endDate === undefined) throw new UserError('Faltan las columnas de fecha.');
  const tz = sheet.getParent().getSpreadsheetTimeZone();

  for (let r = 1; r < values.length; r++) {
    if (text_(values[r][col.id]) === String(id).trim()) {
      const game = rowToGame_(values[r], r + 1, col, tz);
      if (game) return { sheet: sheet, row: r + 1, col: col, tz: tz, game: game };
    }
  }
  throw new UserError('No encontré ese juego en la planilla. Actualizá la página.');
}

function reread_(ctx) {
  const lastCol = ctx.sheet.getLastColumn();
  const row = ctx.sheet.getRange(ctx.row, 1, 1, lastCol).getValues()[0];
  return rowToGame_(row, ctx.row, ctx.col, ctx.tz);
}

function writeDate_(ctx, field, date) {
  ctx.sheet.getRange(ctx.row, ctx.col[field] + 1).setValue(date);
}

/** Mismo criterio que el sitio (src/games.ts → getStatus). */
function statusOf_(game) {
  const end = (game.endDate || '').toLowerCase();
  if (end.indexOf('abandon') === 0) return 'abandoned';
  if (end.indexOf('paus') === 0) return 'paused';
  if (end) return 'completed';
  if (game.startDate) return 'in_progress';
  return 'pending';
}

/** "yyyy-MM-dd" → Date. Vacío = hoy. Rechaza fechas futuras o absurdas. */
function parseInputDate_(value, tz) {
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  if (value === undefined || value === null || value === '') value = today;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new UserError('Fecha inválida.');
  const date = Utilities.parseDate(value, tz, 'yyyy-MM-dd');
  // parseDate es permisivo (ej. 2025-02-31): verificamos que vuelva igual.
  if (Utilities.formatDate(date, tz, 'yyyy-MM-dd') !== value) throw new UserError('Fecha inválida.');
  if (value > today) throw new UserError('La fecha no puede ser futura.');
  if (value < '1970-01-01') throw new UserError('Fecha inválida.');
  return date;
}

// ───────────────────────── Utilidades ─────────────────────────

function cell_(row, i) {
  return i === undefined ? '' : row[i];
}

function normalize_(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // quita acentos
    .replace(/\s+/g, ' ');
}

function text_(value) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  return s || null;
}

function number_(value) {
  if (value === '' || value === null) return null;
  const n = Number(String(value).replace(',', '.'));
  return isFinite(n) ? n : null;
}

// Fechas → "yyyy-MM-dd". Acepta celdas de fecha y texto tipo "12/26/2024"
// (mes/día, como la configuración regional de la planilla).
// Otro texto (ej. "Abandonado", "Pausado") se devuelve tal cual.
function date_(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  const s = text_(value);
  const m = s && s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return s;
  const monthFirst = !/^(es|pt|fr|it|de)/i.test(SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetLocale());
  const month = Number(monthFirst ? m[1] : m[2]);
  const day = Number(monthFirst ? m[2] : m[1]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return year + '-' + pad_(month) + '-' + pad_(day);
}

function pad_(n) {
  return (n < 10 ? '0' : '') + n;
}

// Solo URLs https, para no devolver nada raro al sitio.
function httpsUrl_(value) {
  const s = text_(value);
  return s && /^https:\/\/\S+$/i.test(s) ? s : null;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
