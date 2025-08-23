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

// Blickrichtung aktualisieren
if (dirSelect) {
  dirSelect.addEventListener('change', () => {
    player.dir = parseInt(dirSelect.value);
    draw();
  });
}

// Bilder laden (achte im Repo auf /img/…)
const imgRock = new Image();     imgRock.src = 'img/rock.svg';
const imgRobot = new Image();    imgRobot.src = 'img/robot.svg';
const imgTreasure = new Image(); imgTreasure.src = 'img/treasure.svg';
const imgWater = new Image();    imgWater.src = 'img/waves.svg';
const imgHole = new Image();     imgHole.src = 'img/hole.svg';
const imgTree = new Image();     imgTree.src = 'img/tree.svg';

// Zellen-Codierung
// 0: frei | 1: stone | 2: hole | 3: tree | 4: water

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
  // Knopf-ID nach Konvention zusammensetzen
  const id = 'mode' + m.charAt(0).toUpperCase() + m.slice(1);
  const btn = document.getElementById(id);
  if (btn) btn.classList.add('active');
  dirLabel.style.display = (m === 'start') ? 'inline-flex' : 'none';
}

// Raster erstellen
document.getElementById('createGridBtn').addEventListener('click', () => {
  cols = parseInt(widthInput.value);
  rows = parseInt(heightInput.value);

  widthInput.disabled = heightInput.disabled = true;
  grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  player = { x: 0, y: 0, dir: parseInt(dirSelect.value) };
  goal = { x: cols - 1, y: rows - 1 };

  cellSize = Math.min(
    Math.floor(canvas.width / cols),
    Math.floor(canvas.height / rows)
  );

  [modeStoneBtn, modeTreeBtn, modeWaterBtn, modeHoleBtn, modeStartBtn, modeGoalBtn, exportJsonBtn]
    .forEach(b => b.disabled = false);

  variante = 0; // frisch angelegtes Raster: nur Steine möglich, daher 0
  setMode('stone');
  draw();
});

// Zurücksetzen
resetBtn.addEventListener('click', () => {
  grid = [];
  cols = rows = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  [modeStoneBtn, modeTreeBtn, modeWaterBtn, modeHoleBtn, modeStartBtn, modeGoalBtn, exportJsonBtn]
    .forEach(b => b.disabled = true);
  widthInput.disabled = heightInput.disabled = false;
  dirLabel.style.display = 'none';
  variante = 0;
});

// variante automatisch aus grid berechnen
function computeVariante() {
  // 1,2,3,4 = irgendwelche Hindernisse
  // Bedingung laut Vorgabe: variante = 1 sobald mehr als nur Steine eingesetzt werden
  // -> Wenn mindestens eine Zelle 2/3/4 ist, dann 1, sonst 0.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = grid[y][x];
      if (v === 2 || v === 3 || v === 4) return 1;
    }
  }
  return 0;
}

// Daten vorbereiten (Export)
function prepareData(asConst = false) {
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
  } else {
    return JSON.stringify({ grid, player, goal, variante }, null, 2);
  }
}

async function exportData(asConst = false) {
  const content = prepareData(asConst);
  const blob = new Blob([content], { type: 'application/json' });

  // File System Access API (Chrome/Edge)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: asConst ? 'config_maze.js' : 'maze.json',
        types: [{
          description: asConst ? 'JavaScript-Datei' : 'JSON-Datei',
          accept: { [asConst ? 'application/javascript' : 'application/json']: [asConst ? '.js' : '.json'] }
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
importBtn.addEventListener('click', () => document.getElementById('importInput').click());
document.getElementById('importInput').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      ({ grid, player, goal, variante } = data);
      rows = grid.length; cols = grid[0].length;
      widthInput.value = cols; heightInput.value = rows;
      widthInput.disabled = heightInput.disabled = true;
      cellSize = Math.min(Math.floor(canvas.width / cols), Math.floor(canvas.height / rows));
      [modeStoneBtn, modeTreeBtn, modeWaterBtn, modeHoleBtn, modeStartBtn, modeGoalBtn, exportJsonBtn]
        .forEach(b => b.disabled = false);
      // Sicherheit: variante nach Import anhand grid nachziehen
      variante = computeVariante();
      draw();
    } catch (err) {
      alert('Ungültiges JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// Klick-Handler (Platzieren/Entfernen)
canvas.addEventListener('click', e => {
  if (!cols || !rows) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if (x < 0 || x >= cols || y < 0 || y >= rows) return;

  if (mode === 'start') {
    if (x === goal.x && y === goal.y) return;
    grid[y][x] = 0;
    player.x = x; player.y = y;
    player.dir = parseInt(dirSelect.value);
  } else if (mode === 'goal') {
    if (x === player.x && y === player.y) return;
    grid[y][x] = 0;
    goal.x = x; goal.y = y;
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
  ctx.drawImage(imgTreasure, goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);

  // Roboter
  const cx = player.x * cellSize + cellSize / 2;
  const cy = player.y * cellSize + cellSize / 2;
  // dir: 0=N,1=O,2=S,3=W  (dir=2 = Süd = 0°)
  const dirs = [Math.PI /*N*/, -Math.PI / 2 /*O*/, 0 /*S*/, Math.PI / 2 /*W*/];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dirs[player.dir]);
  ctx.drawImage(imgRobot, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
  ctx.restore();
}

// Neu laden
const reloadBtn = document.getElementById('reloadBtn');
if (reloadBtn) {
  reloadBtn.addEventListener('click', () => location.reload());
}
