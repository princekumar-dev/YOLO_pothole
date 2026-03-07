// =============================================
//  PotholeAI — Real-Time Detection Frontend
// =============================================

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const hud = document.getElementById('hud');
const statusBadge = document.getElementById('statusBadge');
const fpsVal = document.getElementById('fpsVal');
const detCount = document.getElementById('detCount');
const modelStatus = document.getElementById('modelStatus');
const totalEl = document.getElementById('totalDetections');
const avgConfEl = document.getElementById('avgConf');
const liveFPSEl = document.getElementById('liveFPS');
const connEl = document.getElementById('connStatus');
const logBody = document.getElementById('logBody');
const clearBtn = document.getElementById('clearLog');

// =============================================
//  Socket.IO
// =============================================
const socket = io();
let isConnected = false;
let isWaiting = false; // waiting for server response

socket.on('connect', () => {
  isConnected = true;
  setStatus('live');
  modelStatus.textContent = 'Ready';
  connEl.textContent = 'Connected';
});

socket.on('disconnect', () => {
  isConnected = false;
  setStatus('offline');
  connEl.textContent = 'Lost';
});

socket.on('detections', ({ boxes }) => {
  isWaiting = false;
  currentBoxes = boxes || [];
  updateStats(currentBoxes);
});

socket.on('error', ({ message }) => {
  isWaiting = false;
  console.error('Server error:', message);
});

// =============================================
//  Camera & Detection Loop
// =============================================
let currentBoxes = [];
let frameCount = 0;
let fpsTimer = performance.now();
let totalDetected = 0;
let confAccum = 0;
let confCount = 0;
let captureLoop = null;
let currentStream = null;
let useFrontCamera = false;
let isPlaying = false;

const switchCamBtn = document.getElementById('switchCamBtn');

async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
  }

  let stream = null;
  const constraints = [
    { video: { facingMode: useFrontCamera ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: useFrontCamera ? 'user' : 'environment' } },
    { video: true }
  ];

  for (const c of constraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      break;
    } catch (e) {
      console.warn('Camera attempt failed, trying fallback…', e);
    }
  }

  if (!stream) {
    alert(
      'Could not access camera.\n\n' +
      '• Make sure no other app is using it\n' +
      '• Check browser permissions (click 🔒 icon)\n' +
      '• Try refreshing'
    );
    return;
  }

  currentStream = stream;
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}

startBtn.addEventListener('click', async () => {
  await startCamera();
  startScreen.style.display = 'none';
  hud.style.display = 'flex';
  modelStatus.textContent = 'Active';
  if (!isPlaying) {
    isPlaying = true;
    startCapture();
  }
});

switchCamBtn.addEventListener('click', async () => {
  useFrontCamera = !useFrontCamera;
  switchCamBtn.style.transform = useFrontCamera ? 'rotate(180deg)' : 'rotate(0deg)';
  await startCamera();
});

function startCapture() {
  // Off-screen canvas for frame capture
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');

  // Resize canvas to match video dimensions
  function resizeCanvas() {
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Draw loop — runs as fast as possible for smooth video
  function drawLoop() {
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw detection boxes
    for (const box of currentBoxes) {
      const scX = canvas.width / (video.videoWidth || canvas.width);
      const scY = canvas.height / (video.videoHeight || canvas.height);

      const x1 = box.x1 * scX;
      const y1 = box.y1 * scY;
      const x2 = box.x2 * scX;
      const y2 = box.y2 * scY;
      const w = x2 - x1;
      const h = y2 - y1;

      // Glow effect
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;

      // Bounding box
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, w, h);

      // Fill overlay
      ctx.fillStyle = 'rgba(245,158,11,0.08)';
      ctx.fillRect(x1, y1, w, h);

      ctx.shadowBlur = 0;

      // Label background
      const label = `${box.label}  ${box.conf}%`;
      const fontSize = Math.max(11, Math.min(14, w * 0.07));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const textW = ctx.measureText(label).width;
      const padH = 6, padV = 4;
      const lblX = x1;
      const lblY = y1 - fontSize - padV * 2 - 2;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(lblX, lblY, textW + padH * 2, fontSize + padV * 2, 4);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.fillText(label, lblX + padH, lblY + fontSize + padV - 1);
    }

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - fpsTimer >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - fpsTimer));
      fpsVal.textContent = fps;
      liveFPSEl.textContent = fps;
      frameCount = 0;
      fpsTimer = now;
    }

    requestAnimationFrame(drawLoop);
  }
  requestAnimationFrame(drawLoop);

  // Inference loop — sends a frame every 120ms if server is ready
  captureLoop = setInterval(() => {
    if (!isConnected || isWaiting) return;
    isWaiting = true;

    resizeCanvas();
    offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    const b64 = offscreen.toDataURL('image/jpeg', 0.6);
    socket.emit('frame', b64);
  }, 120);
}

// =============================================
//  Stats update
// =============================================
function updateStats(boxes) {
  detCount.textContent = boxes.length;

  if (boxes.length > 0) {
    totalDetected += boxes.length;
    totalEl.textContent = totalDetected;

    const avgC = boxes.reduce((s, b) => s + b.conf, 0) / boxes.length;
    confAccum += avgC;
    confCount++;
    avgConfEl.textContent = (confAccum / confCount).toFixed(1) + '%';

    // Log entries (max 40)
    boxes.forEach(box => addLogEntry(box));
  }
}

let logCount = 0;
function addLogEntry(box) {
  if (logCount === 0) {
    logBody.innerHTML = '';
  }
  logCount++;
  if (logCount > 40) {
    logBody.removeChild(logBody.lastChild);
  }

  const now = new Date();
  const ts = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${ts}</span>
    <span class="log-label">⚠️ ${box.label}</span>
    <span class="log-conf ${box.conf < 50 ? 'low' : ''}">${box.conf}%</span>
  `;
  logBody.prepend(entry);
}

// =============================================
//  UI Helpers
// =============================================
function setStatus(mode) {
  if (mode === 'live') {
    statusBadge.className = 'badge badge-live';
    statusBadge.innerHTML = '<span class="pulse-dot"></span> Live';
  } else {
    statusBadge.className = 'badge badge-offline';
    statusBadge.innerHTML = '<span class="pulse-dot"></span> Offline';
  }
}

clearBtn.addEventListener('click', () => {
  logBody.innerHTML = '<div class="log-empty">Log cleared.</div>';
  logCount = 0;
  totalDetected = 0;
  confAccum = 0;
  confCount = 0;
  totalEl.textContent = '0';
  avgConfEl.textContent = '—';
});
