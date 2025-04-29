// ターンパックマン - ターン制2D迷路ゲーム
// プレイヤーが動いた時だけ敵も動く

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// マップ設定（シンプルなパックマン風迷路 28x31）
const MAP_W = 28;
const MAP_H = 31;
const TILE = 16;
// 0: 通路, 1: 壁, 2: ドット, 3: パワーエサ
const map = [];
for (let y = 0; y < MAP_H; y++) {
  const row = [];
  for (let x = 0; x < MAP_W; x++) {
    if (y === 0 || y === MAP_H - 1 || x === 0 || x === MAP_W - 1) {
      row.push(1); // 外周は壁
    } else {
      row.push(2); // 内側は全部ドット
    }
  }
  map.push(row);
}
// パワーエサを4隅近くに配置
map[1][1] = 3;
map[1][MAP_W-2] = 3;
map[MAP_H-2][1] = 3;
map[MAP_H-2][MAP_W-2] = 3;

// プレイヤー・敵
const player = { x: 1, y: 1, dir: 0, nextDir: 0, alive: true };
let gameOver = false;
let powerCount = 0; // パワー状態の残りターン
const monsters = [
  { x: 26, y: 1, dir: 2, alive: true, respawn: 0, initX: 26, initY: 1 }, // 右上
  { x: 1, y: 29, dir: 1, alive: true, respawn: 0, initX: 1, initY: 29 }, // 左下
  { x: 26, y: 29, dir: 3, alive: true, respawn: 0, initX: 26, initY: 29 }, // 右下
];

// 入力管理
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function canMove(x, y) {
  return map[y] && map[y][x] !== 1;
}

function tryMove(obj, dir) {
  const dx = [1,0,-1,0], dy = [0,1,0,-1];
  const nx = obj.x + dx[dir], ny = obj.y + dy[dir];
  if (canMove(nx, ny)) {
    obj.x = nx; obj.y = ny;
    return true;
  }
  return false;
}

function update() {
  if (gameOver) return; // ゲームオーバー時は何もしない
// 衝突判定（敵の移動前にもチェック）
for(const m of monsters) {
  if(!m.alive) continue;
  if(player.x === m.x && player.y === m.y) {
    if(powerCount > 0) {
      m.alive = false;
      m.respawn = 10;
    } else {
      document.getElementById('ui').textContent = 'ゲームオーバー';
      gameOver = true;
      return;
    }
  }
}
  // 入力受付（上下左右）
  let moved = false;
  if(keys['ArrowRight']) moved = tryMove(player, 0);
  else if(keys['ArrowDown']) moved = tryMove(player, 1);
  else if(keys['ArrowLeft']) moved = tryMove(player, 2);
  else if(keys['ArrowUp']) moved = tryMove(player, 3);

  if(moved) {
    // プレイヤーがドットを取ったら消す
    if(map[player.y][player.x] === 2) {
      map[player.y][player.x] = 0;
    }
    // パワーエサ取得
    if(map[player.y][player.x] === 3) {
      map[player.y][player.x] = 0;
      powerCount = 20;
    }
    // パワー状態カウント減少
    if(powerCount > 0) powerCount--;
    // 敵の復活カウント
    for(const m of monsters) {
      if(!m.alive && m.respawn > 0) m.respawn--;
      if(!m.alive && m.respawn === 0) {
        m.x = m.initX; m.y = m.initY; m.alive = true; // 各自の初期位置で復活
      }
    }
    // すべてのドットが消えたらステージクリア
    let dotsLeft = 0;
    for(let y=0; y<MAP_H; y++) for(let x=0; x<MAP_W; x++) {
      if(map[y][x] === 2) dotsLeft++;
    }
    if(dotsLeft === 0) {
      document.getElementById('ui').textContent = 'ステージクリア！';
      gameOver = true;
      return;
    } else {
      document.getElementById('ui').textContent = '';
    }
    // 衝突判定（自機と敵）
    for(const m of monsters) {
      if(!m.alive) continue;
      if(player.x === m.x && player.y === m.y) {
        if(powerCount > 0) {
          // パワー状態なら敵を消す
          m.alive = false;
          m.respawn = 10;
        } else {
          document.getElementById('ui').textContent = 'ゲームオーバー';
          gameOver = true;
          return;
        }
      }
    }
    // 敵もターンで動く（たまに自機から離れる）
    for(const m of monsters) {
      if(!m.alive) continue; // 消えてる敵は動かさない
      const dx = [1,0,-1,0], dy = [0,1,0,-1];
      let dirs = [];
      let targetDist, cmp;
      if(Math.random() < 0.2) {
        // 20%の確率で離れる方向
        targetDist = -Infinity;
        cmp = (a, b) => a > b;
      } else {
        // それ以外は近づく方向
        targetDist = Infinity;
        cmp = (a, b) => a < b;
      }
      for(let d=0; d<4; d++) {
        let nx = m.x + dx[d], ny = m.y + dy[d];
        if(canMove(nx, ny)) {
          let dist = Math.abs(nx - player.x) + Math.abs(ny - player.y);
          if(cmp(dist, targetDist)) {
            targetDist = dist;
            dirs = [d];
          } else if(dist === targetDist) {
            dirs.push(d);
          }
        }
      }
      if(dirs.length) m.dir = dirs[Math.floor(Math.random()*dirs.length)];
      tryMove(m, m.dir);
    }
    // 入力を一度消す（ターン制なので連続移動防止）
    keys['ArrowRight'] = keys['ArrowDown'] = keys['ArrowLeft'] = keys['ArrowUp'] = false;
  }
}

function draw() {
  ctx.clearRect(0,0,W,H);
  // マップ
  for(let y=0; y<MAP_H; y++) for(let x=0; x<MAP_W; x++) {
    if(!map[y]) continue;
    if(map[y][x] === 1) {
      ctx.fillStyle = '#22f';
      ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    } else if(map[y][x] === 2) {
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(x*TILE+TILE/2, y*TILE+TILE/2, 2, 0, Math.PI*2);
      ctx.fill();
    } else if(map[y][x] === 3) {
      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.arc(x*TILE+TILE/2, y*TILE+TILE/2, 5, 0, Math.PI*2);
      ctx.fill();
    }
  }
  // プレイヤー（パワー状態なら紫、通常は黄色）
  ctx.fillStyle = (powerCount > 0) ? '#c0f' : '#ff0';
  ctx.beginPath();
  ctx.arc(player.x*TILE+TILE/2, player.y*TILE+TILE/2, 7, 0, Math.PI*2);
  ctx.fill();
  // モンスター
  ctx.fillStyle = '#f44';
  for(const m of monsters) {
    if(!m.alive) continue;
    ctx.beginPath();
    ctx.arc(m.x*TILE+TILE/2, m.y*TILE+TILE/2, 7, 0, Math.PI*2);
    ctx.fill();
  }
  // パワー状態表示
  if(powerCount > 0) {
    ctx.fillStyle = '#0ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('POWER: ' + powerCount, 10, H-10);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
