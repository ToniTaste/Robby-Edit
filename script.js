// Editor-Variablen
let grid = [];
let cols = 0, rows = 0;
let cellSize = 0;
let player = { x: 1, y: 1, dir: 2 };
let goal = { x: 0, y: 0 };
// variante wird dynamisch berechnet (0 = nur Steine / 1 = weitere Hindernisse im Einsatz)
let variante = 0;

const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

// Konstanten
const MIN_COLS = 3;
const MAX_COLS = 15;
const DEFAULT_COLS = 5;

const MIN_ROWS = 3;
const MAX_ROWS = 15;
const DEFAULT_ROWS = 5;

// Elemente
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const modeStoneBtn = document.getElementById('modeStone');
const modeTreeBtn = document.getElementById('modeTree');
const modeWaterBtn = document.getElementById('modeWater');
const modeHoleBtn = document.getElementById('modeHole');
const modeStartBtn = document.getElementById('modeStart');
const modeGoalBtn = document.getElementById('modeGoal');
const resetBtn = document.getElementById('resetBtn');
const importBtn = document.getElementById('importBtn');
const dirLabel = document.getElementById('dirLabel');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const dirSelect = document.getElementById('dirSelect');
const importInput = document.getElementById('importInput');
const createGridBtn = document.getElementById('createGridBtn');

// Zellen-Codierung
// 0: frei | 1: stone | 2: hole | 3: tree | 4: water

// Hilfsfunktionen
function clampNumber(value, min, max, fallback) {
  const n = parseInt(value, 10);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, n));
}

function isValidCellValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 4;
}

function isMatrix(g) {
  return (
    Array.isArray(g) &&
    g.length > 0 &&
    Array.isArray(g[0]) &&
    g[0].length > 0 &&
    g.every(row => Array.isArray(row) && row.length === g[0].length)
  );
}

function sanitizeGrid(g) {
  return g.map(row => row.map(value => isValidCellValue(value) ? value : 0));
}

function isInsideGrid(x, y) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function updateCellSize() {
  if (!cols || !rows) {
    cellSize = 0;
    return;
  }

  cellSize = Math.min(
    Math.floor(canvas.width / cols),
    Math.floor(canvas.height / rows)
  );
}

function setEditorButtonsEnabled(enabled) {
  [modeStoneBtn, modeTreeBtn, modeWaterBtn, modeHoleBtn, modeStartBtn, modeGoalBtn, exportJsonBtn]
    .forEach(button => {
      if (button) {
        button.disabled = !enabled;
      }
    });
}

function ensureStartAndGoalAreFree() {
  if (grid.length && isInsideGrid(player.x, player.y)) {
    grid[player.y][player.x] = 0;
  }

  if (grid.length && isInsideGrid(goal.x, goal.y)) {
    grid[goal.y][goal.x] = 0;
  }
}

function normalizeMazeData(data) {
  if (
    !data ||
    !isMatrix(data.grid) ||
    typeof data.player?.x !== 'number' ||
    typeof data.player?.y !== 'number' ||
    typeof data.player?.dir !== 'number' ||
    typeof data.goal?.x !== 'number' ||
    typeof data.goal?.y !== 'number'
  ) {
    throw new Error('Fehlerhaftes Robby-Labyrinth-Format.');
  }

  const importedRows = data.grid.length;
  const importedCols = data.grid[0].length;

  if (
    importedRows < MIN_ROWS || importedRows > MAX_ROWS ||
    importedCols < MIN_COLS || importedCols > MAX_COLS
  ) {
    throw new Error('Ungültige Rastergröße.');
  }

  const normalizedGrid = sanitizeGrid(data.grid);

  const normalizedPlayer = {
    x: clampNumber(data.player.x, 0, importedCols - 1, 0),
    y: clampNumber(data.player.y, 0, importedRows - 1, 0),
    dir: clampNumber(data.player.dir, 0, 3, 2)
  };

  const normalizedGoal = {
    x: clampNumber(data.goal.x, 0, importedCols - 1, importedCols - 1),
    y: clampNumber(data.goal.y, 0, importedRows - 1, importedRows - 1)
  };

  normalizedGrid[normalizedPlayer.y][normalizedPlayer.x] = 0;
  normalizedGrid[normalizedGoal.y][normalizedGoal.x] = 0;

  return {
    grid: normalizedGrid,
    player: normalizedPlayer,
    goal: normalizedGoal,
    variante: computeVarianteForGrid(normalizedGrid)
  };
}

function computeVarianteForGrid(g) {
  // 1,2,3,4 = Hindernisse; variante = 1 sobald Loch, Baum oder Wasser vorkommen.
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      const v = g[y][x];
      if (v === 2 || v === 3 || v === 4) return 1;
    }
  }
  return 0;
}

// Blickrichtung aktualisieren
if (dirSelect) {
  dirSelect.addEventListener('change', () => {
    player.dir = clampNumber(dirSelect.value, 0, 3, 2);
    if (grid.length) {
      draw();
    }
  });
}

// Bilder laden
const imgRock = new Image();     imgRock.src = 'img/rock.svg';
const imgRobot = new Image();    imgRobot.src = 'img/robot.svg';
const imgTreasure = new Image(); imgTreasure.src = 'img/treasure.svg';
const imgWater = new Image();    imgWater.src = 'img/waves.svg';
const imgHole = new Image();     imgHole.src = 'img/hole.svg';
const imgTree = new Image();     imgTree.src = 'img/tree.svg';

[imgRock, imgRobot, imgTreasure, imgWater, imgHole, imgTree].forEach(img => {
  img.onload = () => {
    if (grid.length) {
      draw();
    }
  };
});

// Modus
let mode = 'stone';
modeStoneBtn.addEventListener('click', () => setMode('stone'));
modeTreeBtn.addEventListener('click', () => setMode('tree'));
modeHoleBtn.addEventListener('click', () => setMode('hole'));
modeWaterBtn.addEventListener('click', () => setMode('water'));
modeStartBtn.addEventListener('click', () => setMode('start'));
modeGoalBtn.addEventListener('click', () => setMode('goal'));

function setMode(m) {
  mode = m;
  document.querySelectorAll('#toolbar button').forEach(b => b.classList.remove('active'));
  const id = 'mode' + m.charAt(0).toUpperCase() + m.slice(1);
  const btn = document.getElementById(id);
  if (btn) btn.classList.add('active');
  dirLabel.style.display = (m === 'start') ? 'inline-flex' : 'none';
}

// Raster erstellen
createGridBtn.addEventListener('click', () => {
  cols = clampNumber(widthInput.value, MIN_COLS, MAX_COLS, DEFAULT_COLS);
  rows = clampNumber(heightInput.value, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);

  widthInput.value = cols;
  heightInput.value = rows;
  widthInput.disabled = true;
  heightInput.disabled = true;

  grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  player = {
    x: 0,
    y: 0,
    dir: clampNumber(dirSelect.value, 0, 3, 2)
  };

  goal = { x: cols - 1, y: rows - 1 };

  updateCellSize();

  setEditorButtonsEnabled(true);

  variante = 0;
  setMode('stone');
  draw();
});

// Zurücksetzen
resetBtn.addEventListener('click', () => {
  grid = [];
  cols = 0;
  rows = 0;
  cellSize = 0;

  player = { x: 1, y: 1, dir: 2 };
  goal = { x: 0, y: 0 };

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  setEditorButtonsEnabled(false);

  widthInput.disabled = false;
  heightInput.disabled = false;
  dirLabel.style.display = 'none';
  variante = 0;
  setMode('stone');
});

// variante automatisch aus grid berechnen
function computeVariante() {
  return computeVarianteForGrid(grid);
}

// Daten vorbereiten (Export)
function prepareData(asConst = false) {
  if (!grid.length) {
    throw new Error('Es wurde noch kein Labyrinth erstellt.');
  }

  player.dir = clampNumber(player.dir, 0, 3, 2);
  ensureStartAndGoalAreFree();
  variante = computeVariante();

  if (asConst) {
    let code = 'const maze = {\n';
    code += '  grid: [\n';
    code += grid.map(row => `    ${JSON.stringify(row)}`).join(',\n') + '\n';
    code += '  ],\n';
    code += `  player: { x: ${player.x}, y: ${player.y}, dir: ${player.dir} },\n`;
    code += `  goal: { x: ${goal.x}, y: ${goal.y} },\n`;
    code += `  variante: ${variante}\n`;
    code += '};';
    return code;
  }

  return JSON.stringify({ grid, player, goal, variante }, null, 2);
}

async function exportData(asConst = false) {
  let content;

  try {
    content = prepareData(asConst);
  } catch (err) {
    alert('⚠️ ' + err.message);
    return;
  }

  const mimeType = asConst ? 'application/javascript' : 'application/json';

  // File System Access API (Chrome/Edge)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: asConst ? 'config_maze.js' : 'maze.json',
        types: [{
          description: asConst ? 'JavaScript-Datei' : 'JSON-Datei',
          accept: { [mimeType]: [asConst ? '.js' : '.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('❌ Fehler beim Speichern:\n' + err.message);
      }
      return;
    }
  }

  // Fallback für Firefox etc.
  let filename = prompt('Dateiname für den Export:', asConst ? 'config_maze.js' : 'maze.json');
  if (!filename) return;
  if (!filename.toLowerCase().endsWith(asConst ? '.js' : '.json')) {
    filename += asConst ? '.js' : '.json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportJsonBtn.addEventListener('click', () => exportData(false));
//exportConstBtn.addEventListener('click', () => exportData(true));

// Import
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const normalized = normalizeMazeData(data);

      grid = normalized.grid;
      player = normalized.player;
      goal = normalized.goal;
      variante = normalized.variante;

      rows = grid.length;
      cols = grid[0].length;

      widthInput.value = cols;
      heightInput.value = rows;
      widthInput.disabled = true;
      heightInput.disabled = true;
      dirSelect.value = String(player.dir);

      updateCellSize();
      setEditorButtonsEnabled(true);
      setMode('stone');
      draw();
    } catch (err) {
      alert('Ungültiges JSON: ' + err.message);
    } finally {
      importInput.value = '';
    }
  };
  reader.readAsText(file);
});

// Klick-Handler (Platzieren/Entfernen)
canvas.addEventListener('click', e => {
  if (!cols || !rows || !cellSize) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const x = Math.floor(canvasX / cellSize);
  const y = Math.floor(canvasY / cellSize);

  if (!isInsideGrid(x, y)) return;

  if (mode === 'start') {
    if (x === goal.x && y === goal.y) return;
    grid[y][x] = 0;
    player.x = x;
    player.y = y;
    player.dir = clampNumber(dirSelect.value, 0, 3, 2);
  } else if (mode === 'goal') {
    if (x === player.x && y === player.y) return;
    grid[y][x] = 0;
    goal.x = x;
    goal.y = y;
  } else {
    // Hindernisse platzieren/entfernen
    if ((player.x === x && player.y === y) || (goal.x === x && goal.y === y)) return;

    let value = 0;
    if (mode === 'stone') value = 1;
    else if (mode === 'hole') value = 2;
    else if (mode === 'tree') value = 3;
    else if (mode === 'water') value = 4;

    // Toggle: gleicher Typ -> löschen, sonst setzen
    grid[y][x] = (grid[y][x] === value) ? 0 : value;
  }

  // variante nach jeder Änderung neu ermitteln
  variante = computeVariante();
  draw();
});

// Zeichnen
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!grid.length || !cellSize) {
    return;
  }

  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

    const px = x * cellSize, py = y * cellSize;
    switch (grid[y][x]) {
      case 1: ctx.drawImage(imgRock, px, py, cellSize, cellSize); break;
      case 2: ctx.drawImage(imgHole, px, py, cellSize, cellSize); break;
      case 3: ctx.drawImage(imgTree, px, py, cellSize, cellSize); break;
      case 4: ctx.drawImage(imgWater, px, py, cellSize, cellSize); break;
      default: break;
    }
  }

  // Ziel
  if (isInsideGrid(goal.x, goal.y)) {
    ctx.drawImage(imgTreasure, goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);
  }

  // Roboter
  if (isInsideGrid(player.x, player.y)) {
    const cx = player.x * cellSize + cellSize / 2;
    const cy = player.y * cellSize + cellSize / 2;
    // dir: 0=N,1=O,2=S,3=W  (dir=2 = Süd = 0°)
    const dirs = [Math.PI /*N*/, -Math.PI / 2 /*O*/, 0 /*S*/, Math.PI / 2 /*W*/];
    const dir = clampNumber(player.dir, 0, 3, 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dirs[dir]);
    ctx.drawImage(imgRobot, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
    ctx.restore();
  }
}

// Neu laden
const reloadBtn = document.getElementById('reloadBtn');
if (reloadBtn) {
  reloadBtn.addEventListener('click', () => location.reload());
}
