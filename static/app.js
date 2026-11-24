// ==========================================================================
//  POTHOLEVISION AI — JAVASCRIPT CONTROLLER (v2.6)
//  Global Settings, Synchronized Threshold Presets & Real-Time Telemetry
// ==========================================================================

// Global Modal Functions (Accessible anywhere via inline onclick or listeners)
window.openSettingsModal = function () {
  const m = document.getElementById('settingsModal');
  if (m) {
    m.classList.add('active');
  }
};

window.closeSettingsModal = function () {
  const m = document.getElementById('settingsModal');
  if (m) {
    m.classList.remove('active');
  }
};

window.openLightbox = function (imgSrc, title) {
  const lightboxModal = document.getElementById('lightboxModal');
  if (lightboxModal) {
    document.getElementById('lightboxImg').src = imgSrc;
    document.getElementById('lightboxTitle').textContent = title || 'Verification Artifact';
    lightboxModal.classList.add('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  let lenisInstance = null;

  // 2. Audio Chime Synthesizer (Web Audio API)
  let audioCtx = null;
  let audioAlertsEnabled = true;
  let lastChimeTime = 0;

  function playHazardChime() {
    if (!audioAlertsEnabled) return;
    const now = Date.now();
    if (now - lastChimeTime < 2000) return; // Debounce 2.0s
    lastChimeTime = now;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (err) {
      console.warn('Audio chime notice:', err);
    }
  }

  // 3. Tab Switching Architecture
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      navTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const targetEl = document.getElementById(`tab-${target}`);
      if (targetEl) targetEl.classList.add('active');

      if (lenisInstance) lenisInstance.resize();
    });
  });

  // 4. Socket.IO & Real-Time Camera Stream
  const socket = typeof io === 'function' ? io({ reconnection: true, transports: ['websocket', 'polling'] }) : null;
  const webcam = document.getElementById('webcam');
  const overlayCanvas = document.getElementById('overlayCanvas');
  const ctx = overlayCanvas.getContext('2d');

  const startCamBtn = document.getElementById('startCamBtn');
  const startDemoVideoBtn = document.getElementById('startDemoVideoBtn');
  const stopCamBtn = document.getElementById('stopCamBtn');
  const switchCamBtn = document.getElementById('switchCamBtn');
  const snapshotBtn = document.getElementById('snapshotBtn');
  const cameraPrompt = document.getElementById('cameraPrompt');
  const hudOverlay = document.getElementById('hudOverlay');
  const liveDot = document.getElementById('liveDot');
  const feedTitle = document.getElementById('feedTitle');

  const hudFps = document.getElementById('hudFps');
  const hudLatency = document.getElementById('hudLatency');
  const hudCount = document.getElementById('hudCount');
  const hudRisk = document.getElementById('hudRisk');
  const hudRiskPill = document.getElementById('hudRiskPill');

  const statLiveCount = document.getElementById('statLiveCount');
  const statTotalLogged = document.getElementById('statTotalLogged');
  const statCriticalCount = document.getElementById('statCriticalCount');
  const statAvgConfidence = document.getElementById('statAvgConfidence');
  const roadHealthBadge = document.getElementById('roadHealthBadge');
  const hazardIndexText = document.getElementById('hazardIndexText');
  const hazardMeterFill = document.getElementById('hazardMeterFill');
  const hazardDesc = document.getElementById('hazardDesc');
  const eventLogContainer = document.getElementById('eventLogContainer');
  const trackingStatusText = document.getElementById('trackingStatusText');
  const surfaceGrowthText = document.getElementById('surfaceGrowthText');
  const cameraMotionText = document.getElementById('cameraMotionText');

  let currentStream = null;
  let useFrontLens = false;
  let isStreaming = false;
  let isPaused = false;
  let activeStreamMode = null;
  let isSimulatingVideo = false;
  let isProcessingFrame = false;
  let activeBoxes = [];
  let smoothedBoxes = [];
  let frameSendInterval = null;
  let fpsTimer = performance.now();
  let frameCount = 0;
  let currentFps = 0;

  // Trackers to completely eliminate duplicate & stale readings
  let sessionUniqueCounter = 0;
  let sessionCriticalCount = 0;
  let peakConfidence = 0;
  const trackedPotholes = new Map();
  let previousMotionFrame = null;
  let cameraMotionScore = 0;
  let cameraMotionDx = 0;
  let cameraMotionDy = 0;
  let lastRenderTime = performance.now();

  // Off-screen canvas for frame capture
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');

  // Master Global Confidence State
  let globalConfidenceValue = 25;

  // Active image payload for Image Studio
  let activeImagePayload = {
    type: 'sample',
    data: 'sample1_complex',
    originalUrl: '/static/samples/sample1_complex.png',
  };
  let currentAnalysisData = null;
  let reanalyzeTimer = null;
  const liveInspectionRecords = new Map();
  let liveLocation = null;

  function debounceReanalyze() {
    clearTimeout(reanalyzeTimer);
    reanalyzeTimer = setTimeout(analyzeActiveImage, 180);
  }

  // Synchronize All Threshold Sliders, Text Labels & Preset Buttons
  function updateGlobalConfidence(newVal, triggerReanalyze = true) {
    const valInt = parseInt(newVal, 10) || 25;
    globalConfidenceValue = valInt;
    const valStr = `${valInt}%`;

    // Sliders
    const allSliders = ['confSlider', 'studioConfSlider', 'globalStudioConfSlider', 'settingConfSlider'];
    allSliders.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = valInt;
    });

    // Texts
    const allTexts = ['confValText', 'studioConfValText', 'globalStudioConfValText', 'settingConfValText'];
    allTexts.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valStr;
    });

    // Preset buttons highlight
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      if (parseInt(btn.dataset.conf, 10) === valInt) {
        btn.classList.add('active-preset');
      } else {
        btn.classList.remove('active-preset');
      }
    });

    // If an image is loaded, re-analyze immediately
    if (triggerReanalyze && activeImagePayload) {
      debounceReanalyze();
    }
  }

  // Attach Input, Change & Mousewheel Listeners to All Sliders
  ['confSlider', 'studioConfSlider', 'globalStudioConfSlider', 'settingConfSlider'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        updateGlobalConfidence(e.target.value, true);
      });
      el.addEventListener('change', (e) => {
        updateGlobalConfidence(e.target.value, true);
      });
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        const currentVal = parseInt(el.value, 10) || 25;
        const newVal = Math.min(Math.max(currentVal + delta, 10), 90);
        updateGlobalConfidence(newVal, true);
      }, { passive: false });
    }
  });

  // Attach Click Listeners to All Preset Buttons
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const confVal = e.currentTarget.dataset.conf;
      updateGlobalConfidence(confVal, true);
    });
  });

  // Settings Button Click Handlers
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openSettingsModal();
    });
  }

  // Socket Connection Status
  if (socket) {
    socket.on('connect', () => {
      document.getElementById('globalStatusPill').style.borderColor = 'var(--color-hairline)';
      document.getElementById('globalStatusText').textContent = 'Model Ready (YOLO11)';
    });

    socket.on('disconnect', () => {
      document.getElementById('globalStatusText').textContent = 'Reconnecting...';
    });

    socket.on('detections', (data) => {
      isProcessingFrame = false;
      activeBoxes = data.boxes || [];
      const inferenceMs = data.inference_ms || 18;
      hudLatency.textContent = `${inferenceMs} ms`;
      processTrackingAndTelemetry(activeBoxes);
    });

    socket.on('error', (err) => {
      isProcessingFrame = false;
      console.error('Inference pipeline error:', err);
    });
  } else {
    document.getElementById('globalStatusText').textContent = 'Fast Inference';
  }

  // Start Real Camera
  async function startCamera() {
    stopActiveStreams();
    isSimulatingVideo = false;
    activeStreamMode = 'camera';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        'Physical camera access in mobile browsers requires HTTPS or http://localhost.\n\nAutomatically starting the Simulated Live Road Driving video stream so you can test real-time detection on your phone!'
      );
      startDemoVideo();
      return;
    }

    const constraints = [
      {
        video: {
          facingMode: useFrontLens ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { video: { facingMode: useFrontLens ? 'user' : 'environment' } },
      { video: true },
    ];

    let stream = null;
    let lastErr = null;
    for (const c of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        if (stream) break;
      } catch (err) {
        lastErr = err;
        console.warn('Constraint fallback attempt:', err);
      }
    }

    if (!stream) {
      console.warn('Camera access unavailable:', lastErr);
      alert(
        'Camera access was blocked or not found (' + (lastErr ? lastErr.name : 'Not available') + ').\n\nStarting simulated road driving video instead so you can test real-time detection instantly!'
      );
      startDemoVideo();
      return;
    }

    currentStream = stream;
    webcam.setAttribute('autoplay', '');
    webcam.setAttribute('muted', '');
    webcam.setAttribute('playsinline', '');
    webcam.setAttribute('webkit-playsinline', '');
    webcam.muted = true;
    webcam.srcObject = stream;
    webcam.removeAttribute('src');

    let streamStarted = false;
    const launchCameraUI = async () => {
      if (streamStarted) return;
      streamStarted = true;
      try {
        await webcam.play();
      } catch (err) {
        console.warn('webcam.play() failed or requires user gesture:', err);
      }
      initializeStreamUI(useFrontLens ? 'Front Inspection Lens' : 'Roadway Optical Lens');
    };

    if (webcam.readyState >= 2) {
      launchCameraUI();
    } else {
      webcam.onloadedmetadata = launchCameraUI;
      setTimeout(launchCameraUI, 800);
    }
  }

  // Start Demo Road Video Simulation (p.mp4)
  function startDemoVideo() {
    stopActiveStreams();
    isSimulatingVideo = true;
    activeStreamMode = 'local';
    activeStreamMode = 'demo';

    webcam.setAttribute('autoplay', '');
    webcam.setAttribute('muted', '');
    webcam.setAttribute('playsinline', '');
    webcam.setAttribute('webkit-playsinline', '');
    webcam.srcObject = null;
    webcam.src = '/p.mp4';
    webcam.loop = true;
    webcam.muted = true;

    let streamStarted = false;
    const launchDemoUI = async () => {
      if (streamStarted) return;
      streamStarted = true;
      try {
        await webcam.play();
      } catch (err) {
        console.warn('Demo video play failed:', err);
      }
      initializeStreamUI('Live Road Video Stream: p.mp4');
    };

    if (webcam.readyState >= 2) {
      launchDemoUI();
    } else {
      webcam.onloadedmetadata = launchDemoUI;
      setTimeout(launchDemoUI, 800);
    }
  }

  function initializeStreamUI(titleText) {
    isStreaming = true;
    isPaused = false;
    cameraPrompt.style.display = 'none';
    hudOverlay.style.display = 'flex';
    stopCamBtn.style.display = 'inline-flex';
    stopCamBtn.textContent = 'Pause Stream';
    snapshotBtn.disabled = false;
    liveDot.classList.add('active');
    feedTitle.textContent = titleText;

    overlayCanvas.width = webcam.videoWidth || 1280;
    overlayCanvas.height = webcam.videoHeight || 720;
    const videoRatio = (webcam.videoWidth || 1280) / (webcam.videoHeight || 720);
    const videoStage = document.getElementById('videoStage');
    if (window.matchMedia('(max-width: 860px)').matches) {
      videoStage.style.aspectRatio = videoRatio >= 1 ? '16 / 9' : '9 / 16';
      videoStage.style.height = 'auto';
    } else {
      videoStage.style.aspectRatio = '16 / 9';
    }
    offscreen.width = Math.min(webcam.videoWidth || 640, 640);
    offscreen.height = Math.round(offscreen.width * ((webcam.videoHeight || 360) / (webcam.videoWidth || 640)));

    const intervalMs = parseInt(document.getElementById('settingFpsInterval')?.value || '80', 10);
    if (frameSendInterval) clearInterval(frameSendInterval);
    frameSendInterval = setInterval(sendFrameToModel, intervalMs);

    requestAnimationFrame(renderCanvasLoop);

    if (navigator.geolocation && liveLocation === null) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          liveLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        },
        () => {
          liveLocation = null;
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }

  function stopActiveStreams() {
    isStreaming = false;
    isPaused = false;
    activeStreamMode = null;
    smoothedBoxes = [];
    previousMotionFrame = null;
    cameraMotionScore = 0;
    if (cameraMotionText) cameraMotionText.textContent = 'Stable';
    if (surfaceGrowthText) {
      surfaceGrowthText.textContent = 'Stable';
      surfaceGrowthText.className = 'tracking-detail-value';
    }
    if (trackingStatusText) trackingStatusText.textContent = 'Waiting for road';
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    if (webcam.src) {
      webcam.pause();
      webcam.removeAttribute('src');
    }
    if (webcam.srcObject) {
      webcam.srcObject = null;
    }
    if (frameSendInterval) clearInterval(frameSendInterval);

    // Clear stale boxes and canvas immediately
    activeBoxes = [];
    trackedPotholes.clear();
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    cameraPrompt.style.display = 'flex';
    hudOverlay.style.display = 'none';
    stopCamBtn.style.display = 'none';
    snapshotBtn.disabled = true;
    liveDot.classList.remove('active');
    feedTitle.textContent = 'Camera Inactive';

    // Reset live stats to clean state
    hudCount.textContent = '0';
    statLiveCount.textContent = '0';
    hudRisk.textContent = 'ROAD CLEAR';
    hudRiskPill.className = 'hud-badge hud-risk';
    roadHealthBadge.textContent = 'Optimal';
    roadHealthBadge.style.color = 'var(--color-success)';
    hazardIndexText.textContent = '0.0 / 10';
    hazardMeterFill.style.width = '0%';
  }

  function toggleStreamPause() {
    if (!isStreaming && !isPaused) return;

    if (isPaused) {
      isPaused = false;
      isStreaming = true;
      webcam.play().catch((err) => console.warn('Stream resume failed:', err));
      liveDot.classList.add('active');
      stopCamBtn.textContent = 'Pause Stream';
      const intervalMs = parseInt(document.getElementById('settingFpsInterval')?.value || '80', 10);
      if (frameSendInterval) clearInterval(frameSendInterval);
      frameSendInterval = setInterval(sendFrameToModel, intervalMs);
      requestAnimationFrame(renderCanvasLoop);
      return;
    }

    isPaused = true;
    isStreaming = false;
    isProcessingFrame = false;
    webcam.pause();
    if (frameSendInterval) clearInterval(frameSendInterval);
    liveDot.classList.remove('active');
    stopCamBtn.textContent = 'Resume Stream';
  }

  function sendFrameToModel() {
    if (!isStreaming || isProcessingFrame || webcam.readyState < 2) return;

    isProcessingFrame = true;
    offCtx.drawImage(webcam, 0, 0, offscreen.width, offscreen.height);
    estimateCameraMotion();
    const b64 = offscreen.toDataURL('image/jpeg', 0.65);
    const conf = globalConfidenceValue / 100.0;

    if (socket) {
      socket.emit('frame', { frame: b64, conf: conf, iou: 0.45, max_det: 50 });
      return;
    }

    fetch('/api/detect/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: b64, conf, iou: 0.45, max_det: 50 }),
    })
      .then((res) => res.json())
      .then((data) => {
        isProcessingFrame = false;
        if (data.status !== 'success') throw new Error(data.message);
        activeBoxes = data.detections || [];
        hudLatency.textContent = `${data.inference_time_ms} ms`;
        processTrackingAndTelemetry(activeBoxes);
      })
      .catch((err) => {
        isProcessingFrame = false;
        console.error('Inference fallback error:', err);
      });
  }

  function estimateCameraMotion() {
    const motionCanvas = estimateCameraMotion.canvas || (estimateCameraMotion.canvas = document.createElement('canvas'));
    motionCanvas.width = 64;
    motionCanvas.height = 36;
    const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
    motionCtx.drawImage(offscreen, 0, 0, motionCanvas.width, motionCanvas.height);
    const pixels = motionCtx.getImageData(0, 0, motionCanvas.width, motionCanvas.height).data;

    if (previousMotionFrame) {
      let difference = 0;
      let bestDifference = Number.POSITIVE_INFINITY;
      let bestDx = 0;
      let bestDy = 0;

      for (let dy = -5; dy <= 5; dy += 1) {
        for (let dx = -8; dx <= 8; dx += 1) {
          let score = 0;
          let samples = 0;
          for (let y = 5; y < 31; y += 4) {
            const previousY = y - dy;
            if (previousY < 0 || previousY >= 36) continue;
            for (let x = 5; x < 59; x += 4) {
              const previousX = x - dx;
              if (previousX < 0 || previousX >= 64) continue;
              const currentIndex = (y * 64 + x) * 4;
              const previousIndex = (previousY * 64 + previousX) * 4;
              score += Math.abs(pixels[currentIndex] - previousMotionFrame[previousIndex]) +
                Math.abs(pixels[currentIndex + 1] - previousMotionFrame[previousIndex + 1]) +
                Math.abs(pixels[currentIndex + 2] - previousMotionFrame[previousIndex + 2]);
              samples++;
            }
          }
          if (samples && score / samples < bestDifference) {
            bestDifference = score / samples;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }

      for (let i = 0; i < pixels.length; i += 16) {
        difference += Math.abs(pixels[i] - previousMotionFrame[i]) +
          Math.abs(pixels[i + 1] - previousMotionFrame[i + 1]) +
          Math.abs(pixels[i + 2] - previousMotionFrame[i + 2]);
      }
      cameraMotionScore = Math.min(100, (difference / (pixels.length / 16)) / 3);
      cameraMotionDx = bestDx;
      cameraMotionDy = bestDy;
      cameraMotionText.textContent = cameraMotionScore > 18 ? 'High shake' :
        cameraMotionScore > 8 ? 'Moving' : 'Stable';
    }
    previousMotionFrame = pixels;
  }

  // Render Canvas Overlays
  function renderCanvasLoop() {
    if (!isStreaming) return;
    const renderNow = performance.now();
    const dt = Math.min(0.05, Math.max(0.008, (renderNow - lastRenderTime) / 1000));
    lastRenderTime = renderNow;

    // Calculate FPS
    frameCount++;
    const now = performance.now();
    if (now - fpsTimer >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
      hudFps.textContent = currentFps;
      frameCount = 0;
      fpsTimer = now;
    }

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const scaleX = overlayCanvas.width / offscreen.width;
    const scaleY = overlayCanvas.height / offscreen.height;
    const smoothing = cameraMotionScore > 18 ? 0.18 : 0.34;
    const renderTracks = Array.from(trackedPotholes.entries())
      .filter(([, track]) => track.pending === false)
      .map(([trackId, track]) => ({
        trackId,
        conf: track.conf,
        severity: track.severity,
        growthPercent: track.growthPercent,
        track,
      }));

    smoothedBoxes = renderTracks.map((box) => {
      const existing = smoothedBoxes.find((item) => item.trackId === box.trackId);
      if (!existing) {
        return {
          ...box,
          drawX1: box.track.box?.x1 ?? box.track.cx - 35,
          drawY1: box.track.box?.y1 ?? box.track.cy - 35,
          drawX2: box.track.box?.x2 ?? box.track.cx + 35,
          drawY2: box.track.box?.y2 ?? box.track.cy + 35,
        };
      }

      const vx = box.track.vx || 0;
      const vy = box.track.vy || 0;
      const motionX = cameraMotionDx * (offscreen.width / 64);
      const motionY = cameraMotionDy * (offscreen.height / 36);
      const predictedX = vx * dt * offscreen.width - motionX * dt * 8;
      const predictedY = vy * dt * offscreen.height - motionY * dt * 8;

      const targetBox = box.track.box;
      const targetX1 = targetBox?.x1 ?? existing.drawX1;
      const targetY1 = targetBox?.y1 ?? existing.drawY1;
      const targetX2 = targetBox?.x2 ?? existing.drawX2;
      const targetY2 = targetBox?.y2 ?? existing.drawY2;

      return {
        ...box,
        drawX1: existing.drawX1 + predictedX + (targetX1 - existing.drawX1 - predictedX) * smoothing,
        drawY1: existing.drawY1 + predictedY + (targetY1 - existing.drawY1 - predictedY) * smoothing,
        drawX2: existing.drawX2 + predictedX + (targetX2 - existing.drawX2 - predictedX) * smoothing,
        drawY2: existing.drawY2 + predictedY + (targetY2 - existing.drawY2 - predictedY) * smoothing,
      };
    });

    // Draw active bounding boxes with persistent IDs
    smoothedBoxes.forEach((box) => {
      const x1 = box.drawX1 * scaleX;
      const y1 = box.drawY1 * scaleY;
      const x2 = box.drawX2 * scaleX;
      const y2 = box.drawY2 * scaleY;
      const w = Math.max(x2 - x1, 10);
      const h = Math.max(y2 - y1, 10);
      const isHighlighted = highlightedTrackId === box.trackId;

      let strokeColor = '#292524';
      let fillColor = '#292524';
      if (box.severity === 'Critical') {
        strokeColor = '#dc2626';
        fillColor = '#dc2626';
      } else if (box.severity === 'Moderate') {
        strokeColor = '#d97706';
        fillColor = '#d97706';
      }

      // Rounded rectangle bounding box
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isHighlighted ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(x1, y1, w, h, 6);
      ctx.stroke();

      // Pill label badge
      const trackId = box.trackId || box.id;
      const growthText = typeof box.growthPercent === 'number'
        ? (box.growthPercent > 12 ? ` · Growing ${box.growthPercent}%` :
          box.growthPercent < -12 ? ` · Shrinking ${Math.abs(box.growthPercent)}%` : '')
        : '';
      const labelText = `${trackId} · ${box.conf}% · ${box.severity}${growthText}`;
      const isCompactOverlay = window.matchMedia('(max-width: 860px)').matches;
      ctx.font = isCompactOverlay ? '700 9px Inter, sans-serif' : '600 12px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      const pillW = Math.min(textWidth + (isCompactOverlay ? 10 : 16), Math.max(80, w));
      const pillH = isCompactOverlay ? 16 : 22;
      const pillY = y1 >= pillH + 5 ? y1 - pillH - 4 : y1 + 4;

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(x1, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x1 + 4, pillY, Math.max(0, pillW - 8), pillH);
      ctx.clip();
      ctx.fillText(labelText, x1 + (isCompactOverlay ? 5 : 8), pillY + (isCompactOverlay ? 11 : 15));
      ctx.restore();
    });

    requestAnimationFrame(renderCanvasLoop);
  }

  // Centroid Multi-Object Tracking & Duplicate Prevention
  function processTrackingAndTelemetry(detections) {
    const now = Date.now();
    const currentBoxes = detections || [];
    let growthTotal = 0;
    let growthCount = 0;

    // Hold a track briefly while inference or the camera briefly misses a frame.
    for (const [id, track] of trackedPotholes.entries()) {
      if (now - track.lastSeen > (track.pending ? 700 : 1800)) {
        trackedPotholes.delete(id);
      }
    }

    let frameCriticalCount = 0;
    let frameModerateCount = 0;
    let frameMinorCount = 0;

    // Match current detections against existing tracks
    currentBoxes.forEach((det) => {
      const cx = (det.x1 + det.x2) / 2;
      const cy = (det.y1 + det.y2) / 2;
      const area = Math.max(1, (det.x2 - det.x1) * (det.y2 - det.y1));
      let matchedTrackId = null;
      let bestScore = -1;
      let minDistance = cameraMotionScore > 18 ? 220 : 150;
      const detBox = { x1: det.x1, y1: det.y1, x2: det.x2, y2: det.y2 };

      function intersectionOverUnion(a, b) {
        const x1 = Math.max(a.x1, b.x1);
        const y1 = Math.max(a.y1, b.y1);
        const x2 = Math.min(a.x2, b.x2);
        const y2 = Math.min(a.y2, b.y2);
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = Math.max(1, (a.x2 - a.x1) * (a.y2 - a.y1));
        const areaB = Math.max(1, (b.x2 - b.x1) * (b.y2 - b.y1));
        return intersection / (areaA + areaB - intersection);
      }

      for (const [id, track] of trackedPotholes.entries()) {
        if (track.pending) continue;
        const predictedCx = track.cx + (track.vx || 0) * offscreen.width * 0.12;
        const predictedCy = track.cy + (track.vy || 0) * offscreen.height * 0.12;
        const dist = Math.hypot(cx - predictedCx, cy - predictedCy);
        const trackBox = track.box || {
          x1: track.cx - 35,
          y1: track.cy - 35,
          x2: track.cx + 35,
          y2: track.cy + 35,
        };
        const iou = intersectionOverUnion(detBox, trackBox);
        const score = iou * 180 - dist;
        if (dist < minDistance && score > bestScore) {
          bestScore = score;
          minDistance = dist;
          matchedTrackId = id;
        }
      }

      if (matchedTrackId !== null) {
        const track = trackedPotholes.get(matchedTrackId);
        const positionSmoothing = cameraMotionScore > 18 ? 0.25 : 0.55;
        const elapsedSeconds = Math.max(0.02, (now - track.lastSeen) / 1000);
        const compensatedCx = cx + cameraMotionDx * (offscreen.width / 64);
        const compensatedCy = cy + cameraMotionDy * (offscreen.height / 36);
        const measuredVx = (compensatedCx - track.cx) / elapsedSeconds / offscreen.width;
        const measuredVy = (compensatedCy - track.cy) / elapsedSeconds / offscreen.height;
        track.vx = (track.vx || measuredVx) * 0.35 + measuredVx * 0.65;
        track.vy = (track.vy || measuredVy) * 0.35 + measuredVy * 0.65;
        track.cx += (cx - track.cx) * positionSmoothing;
        track.cy += (cy - track.cy) * positionSmoothing;
        track.box = detBox;
        track.lastSeen = now;
        track.conf = det.conf;
        track.severity = det.severity;
        track.confirmedHits = (track.confirmedHits || 1) + 1;
        if (track.confirmedHits % 12 === 0) {
          captureLiveInspection(track, det);
        }
        const growthPercent = track.initialArea
          ? ((area - track.initialArea) / track.initialArea) * 100
          : 0;
        track.growthPercent = growthPercent;
        track.area = area;
        track.updateCount = (track.updateCount || 1) + 1;
        if (track.updateCount % 8 === 0) {
          const trend = growthPercent > 12 ? 'Growing' : growthPercent < -12 ? 'Shrinking' : 'Stable';
          logTrackUpdate(matchedTrackId, det.conf, det.severity, trend, det.badge_color);
        }
        growthTotal += growthPercent;
        growthCount++;
        det.growthPercent = Math.round(growthPercent);
        det.trackId = matchedTrackId;
      } else {
        // Await repeated observations before creating a session pothole.
        const candidate = Array.from(trackedPotholes.values()).find((track) =>
          track.pending &&
          Math.hypot(cx - track.cx, cy - track.cy) < (cameraMotionScore > 18 ? 150 : 100)
        );
        if (candidate) {
          candidate.cx += (cx - candidate.cx) * 0.55;
          candidate.cy += (cy - candidate.cy) * 0.55;
          candidate.box = detBox;
          candidate.confirmedHits = (candidate.confirmedHits || 1) + 1;
          candidate.lastSeen = now;
          candidate.conf = det.conf;
          candidate.severity = det.severity;
          det.trackId = candidate.trackId;
          det.growthPercent = 0;
          if (candidate.confirmedHits >= 2) {
            candidate.pending = false;
            sessionUniqueCounter++;
            statTotalLogged.textContent = sessionUniqueCounter;
            logUniqueEvent(candidate.trackId, det.conf, det.severity, det.badge_color);
            captureLiveInspection(candidate, det);
            if (det.severity === 'Critical') {
              sessionCriticalCount++;
              statCriticalCount.textContent = sessionCriticalCount;
              playHazardChime();
            }
          }
        } else {
        const newTrackId = `Pothole #${sessionUniqueCounter + 1}`;
        trackedPotholes.set(newTrackId, {
          cx: cx,
          cy: cy,
          box: detBox,
          trackId: newTrackId,
          lastSeen: now,
          firstSeen: now,
          conf: det.conf,
          severity: det.severity,
          pending: true,
          confirmedHits: 1,
          vx: 0,
          vy: 0,
          initialArea: area,
          area,
          growthPercent: 0,
          updateCount: 1,
        });
        det.trackId = newTrackId;
        det.growthPercent = 0;
        }
      }

      if (det.severity === 'Critical') frameCriticalCount++;
      else if (det.severity === 'Moderate') frameModerateCount++;
      else frameMinorCount++;

      if (det.conf > peakConfidence) {
        peakConfidence = det.conf;
        statAvgConfidence.textContent = `${peakConfidence}%`;
      }
    });

    if (growthCount > 0) {
      const averageGrowth = growthTotal / growthCount;
      if (averageGrowth > 12) {
        surfaceGrowthText.textContent = `Growing · ${averageGrowth.toFixed(0)}%`;
        surfaceGrowthText.className = 'tracking-detail-value warning';
      } else if (averageGrowth < -12) {
        surfaceGrowthText.textContent = `Shrinking · ${Math.abs(averageGrowth).toFixed(0)}%`;
        surfaceGrowthText.className = 'tracking-detail-value';
      } else {
        surfaceGrowthText.textContent = 'Stable';
        surfaceGrowthText.className = 'tracking-detail-value';
      }
    } else if (currentBoxes.length === 0) {
      surfaceGrowthText.textContent = 'Stable';
      surfaceGrowthText.className = 'tracking-detail-value';
    }

    const confirmedTrackCount = Array.from(trackedPotholes.values()).filter(
      (track) => !track.pending
    ).length;
    trackingStatusText.textContent = currentBoxes.length
      ? `${confirmedTrackCount} potholes tracked`
      : 'Waiting for road';

    // Update real-time instantaneous counts
    const activeCount = confirmedTrackCount;
    hudCount.textContent = activeCount;
    statLiveCount.textContent = activeCount;

    if (activeCount > 0) {
      if (frameCriticalCount > 0) {
        hudRisk.textContent = 'HAZARD: CRITICAL';
        hudRiskPill.className = 'hud-badge hud-risk danger';
        roadHealthBadge.textContent = 'Critical Alert';
        roadHealthBadge.style.color = 'var(--color-danger)';
      } else if (frameModerateCount > 0) {
        hudRisk.textContent = 'ROAD CAUTION';
        hudRiskPill.className = 'hud-badge hud-risk warning';
        roadHealthBadge.textContent = 'Caution';
        roadHealthBadge.style.color = 'var(--color-warning)';
      } else {
        hudRisk.textContent = 'SURFACE FRACTURES';
        hudRiskPill.className = 'hud-badge hud-risk';
        roadHealthBadge.textContent = 'Minor Wear';
        roadHealthBadge.style.color = 'var(--color-ink)';
      }

      // Hazard index (0.0 to 10.0)
      const hazardScore = Math.min(
        10,
        (frameCriticalCount * 4.5 + frameModerateCount * 2.2 + frameMinorCount * 1.0) / Math.max(activeCount, 1)
      ).toFixed(1);

      hazardIndexText.textContent = `${hazardScore} / 10`;
      hazardMeterFill.style.width = `${hazardScore * 10}%`;

      if (hazardScore >= 7.0) {
        hazardMeterFill.style.backgroundColor = 'var(--color-danger)';
        hazardDesc.textContent = 'Critical structural pothole. Substantial tire & rim damage risk.';
      } else if (hazardScore >= 3.5) {
        hazardMeterFill.style.backgroundColor = 'var(--color-warning)';
        hazardDesc.textContent = 'Moderate asphalt degradation. Safe vehicle speeds recommended.';
      } else {
        hazardMeterFill.style.backgroundColor = 'var(--color-success)';
        hazardDesc.textContent = 'Minor surface fractures observed.';
      }
    } else {
      // Clean zero state (no stale readings!)
      hudRisk.textContent = 'ROAD CLEAR';
      hudRiskPill.className = 'hud-badge hud-risk';
      roadHealthBadge.textContent = 'Optimal';
      roadHealthBadge.style.color = 'var(--color-success)';
      hazardIndexText.textContent = '0.0 / 10';
      hazardMeterFill.style.width = '0%';
      hazardDesc.textContent = 'Pavement condition appears stable and safe for transit.';
    }

    activeBoxes = currentBoxes.filter((det) => {
      const track = trackedPotholes.get(det.trackId);
      return track && !track.pending;
    });
  }

  function captureLiveInspection(track, det) {
    if (!track || !det || !webcam.readyState || webcam.readyState < 2) return;
    const key = track.trackId;
    const now = Date.now();
    const previous = liveInspectionRecords.get(key);
    if (previous && now - previous.timestamp < 1800) return;

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = offscreen.width;
    fullCanvas.height = offscreen.height;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.drawImage(webcam, 0, 0, fullCanvas.width, fullCanvas.height);

    const pad = 12;
    const cropX1 = Math.max(0, Math.round(det.x1 - pad));
    const cropY1 = Math.max(0, Math.round(det.y1 - pad));
    const cropX2 = Math.min(fullCanvas.width, Math.round(det.x2 + pad));
    const cropY2 = Math.min(fullCanvas.height, Math.round(det.y2 + pad));
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, cropX2 - cropX1);
    cropCanvas.height = Math.max(1, cropY2 - cropY1);
    cropCanvas.getContext('2d').drawImage(
      fullCanvas,
      cropX1,
      cropY1,
      cropCanvas.width,
      cropCanvas.height,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    const record = {
      trackId: key,
      timestamp: now,
      timeLabel: new Date().toLocaleTimeString(),
      confidence: det.conf,
      severity: det.severity,
      riskScore: det.risk_score || det.riskScore || 0,
      location: liveLocation,
      original: fullCanvas.toDataURL('image/jpeg', 0.78),
      thumbnail: cropCanvas.toDataURL('image/jpeg', 0.82),
      box: det,
    };

    liveInspectionRecords.set(key, record);
    try {
      sessionStorage.setItem(
        'pothole-live-inspection',
        JSON.stringify(Array.from(liveInspectionRecords.values()).slice(-40))
      );
    } catch (error) {
      console.warn('Could not persist live inspection snapshots:', error);
    }
    renderLiveInspectionGallery();
  }

  function renderLiveInspectionGallery() {
    const grid = document.getElementById('liveInspectionGrid');
    const count = document.getElementById('liveInspectionCount');
    if (!grid || !count) return;
    const records = Array.from(liveInspectionRecords.values()).reverse();
    count.textContent = `${records.length} snapshot${records.length === 1 ? '' : 's'}`;
    if (records.length === 0) return;

    grid.innerHTML = '';
    records.forEach((record) => {
      const card = document.createElement('article');
      card.className = 'live-inspection-card';
      card.dataset.trackId = record.trackId;
      card.innerHTML = `
        <img src="${record.thumbnail}" alt="${record.trackId} pothole snapshot" />
        <div class="live-inspection-meta">
          <strong>${record.trackId}</strong>
          <span>${record.severity} · ${record.confidence}% · ${record.timeLabel}</span>
          <span>${record.location
            ? `${record.location.latitude.toFixed(5)}, ${record.location.longitude.toFixed(5)}`
            : 'Location unavailable'}</span>
        </div>
      `;

      card.addEventListener('mouseenter', () => highlightTrackedBox(record.trackId, true));
      card.addEventListener('mouseleave', () => highlightTrackedBox(record.trackId, false));
      card.addEventListener('click', () => {
        activeImagePayload = {
          type: 'base64',
          data: record.original,
          originalUrl: record.original,
        };
        document.querySelector('.nav-tab[data-tab="studio"]').click();
        analyzeActiveImage();
        openPotholeAuditModal({
          id: record.trackId,
          conf: record.confidence,
          severity: record.severity,
          badge_color: record.severity === 'Critical'
            ? '#dc2626'
            : record.severity === 'Moderate'
              ? '#d97706'
              : '#292524',
          risk_score: record.riskScore,
          width: record.box.width,
          height: record.box.height,
          area_pct: record.box.area_pct,
          repair_action: record.box.repair_action,
          x1: record.box.x1,
          y1: record.box.y1,
          x2: record.box.x2,
          y2: record.box.y2,
          thumbnail: record.thumbnail,
        });
      });
      grid.appendChild(card);
    });
  }

  let highlightedTrackId = null;

  function highlightTrackedBox(trackId, enabled) {
    highlightedTrackId = enabled ? trackId : null;
  }

  function logUniqueEvent(trackId, conf, severity, badgeColor) {
    const emptyState = eventLogContainer.querySelector('.event-empty-state');
    if (emptyState) emptyState.remove();

    const item = document.createElement('div');
    item.className = 'event-item';
    const timeStr = new Date().toLocaleTimeString();

    item.innerHTML = `
      <div class="event-item-left">
        <span class="badge-pill" style="font-size:10px; padding:2px 6px; background:${badgeColor}; color:#fff;">
          ${severity}
        </span>
        <span class="event-conf-pill">${trackId} · ${conf}%</span>
      </div>
      <span class="text-xs text-muted">${timeStr}</span>
    `;

    eventLogContainer.prepend(item);
    if (eventLogContainer.children.length > 25) {
      eventLogContainer.removeChild(eventLogContainer.lastChild);
    }
  }

  function logTrackUpdate(trackId, conf, severity, trend, badgeColor) {
    const emptyState = eventLogContainer.querySelector('.event-empty-state');
    if (emptyState) emptyState.remove();
    const item = document.createElement('div');
    item.className = 'event-item track-update';
    item.innerHTML = `
      <div class="event-item-left">
        <span class="badge-pill" style="font-size:10px; padding:2px 6px; background:${badgeColor}; color:#fff;">${severity}</span>
        <span class="event-conf-pill">${trackId} · ${trend} · ${conf}%</span>
      </div>
      <span class="text-xs text-muted">${new Date().toLocaleTimeString()}</span>
    `;
    eventLogContainer.prepend(item);
    if (eventLogContainer.children.length > 25) {
      eventLogContainer.removeChild(eventLogContainer.lastChild);
    }
  }

  // Camera & Video Buttons
  startCamBtn.addEventListener('click', startCamera);
  startDemoVideoBtn.addEventListener('click', startDemoVideo);
  stopCamBtn.addEventListener('click', toggleStreamPause);

  const inferenceIntervalSelect = document.getElementById('settingFpsInterval');
  if (inferenceIntervalSelect) {
    inferenceIntervalSelect.addEventListener('change', () => {
      if (!isStreaming) return;
      if (frameSendInterval) clearInterval(frameSendInterval);
      const intervalMs = parseInt(inferenceIntervalSelect.value, 10) || 80;
      frameSendInterval = setInterval(sendFrameToModel, intervalMs);
    });
  }

  const localVideoInput = document.getElementById('localVideoInput');
  if (localVideoInput) {
    localVideoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      stopActiveStreams();
      isSimulatingVideo = true;

      webcam.setAttribute('autoplay', '');
      webcam.setAttribute('muted', '');
      webcam.setAttribute('playsinline', '');
      webcam.setAttribute('webkit-playsinline', '');
      webcam.srcObject = null;
      webcam.src = URL.createObjectURL(file);
      webcam.loop = true;
      webcam.muted = true;

      let streamStarted = false;
      const launchLocalUI = async () => {
        if (streamStarted) return;
        streamStarted = true;
        try {
          await webcam.play();
        } catch (err) {
          console.warn('Local video play failed:', err);
        }
        initializeStreamUI(`Local Video: ${file.name}`);
      };

      if (webcam.readyState >= 2) {
        launchLocalUI();
      } else {
        webcam.onloadedmetadata = launchLocalUI;
        setTimeout(launchLocalUI, 800);
      }
    });
  }

  switchCamBtn.addEventListener('click', () => {
    useFrontLens = !useFrontLens;
    if (isStreaming && !isSimulatingVideo) startCamera();
  });

  document.getElementById('audioAlertToggle').addEventListener('click', () => {
    audioAlertsEnabled = !audioAlertsEnabled;
    document.getElementById('audioIcon').textContent = audioAlertsEnabled ? '🔔' : '🔕';
    document.getElementById('audioLabel').textContent = audioAlertsEnabled ? 'Alerts On' : 'Alerts Off';
  });

  document.getElementById('clearEventLogBtn').addEventListener('click', () => {
    eventLogContainer.innerHTML =
      '<div class="event-empty-state">No active detections logged yet. Start stream to record.</div>';
  });

  // Snapshot Button: Captures current frame and routes to Inspection Studio
  snapshotBtn.addEventListener('click', () => {
    if (!isStreaming) return;
    offCtx.drawImage(webcam, 0, 0, offscreen.width, offscreen.height);
    const snapB64 = offscreen.toDataURL('image/jpeg', 0.95);

    // Switch to studio tab
    document.querySelector('.nav-tab[data-tab="studio"]').click();
    activeImagePayload = { type: 'base64', data: snapB64, originalUrl: snapB64 };
    analyzeActiveImage();
  });

  // ==========================================================================
  //  5. IMAGE INSPECTION STUDIO
  // ==========================================================================

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const sampleCardsContainer = document.getElementById('sampleCardsContainer');
  const studioWorkspace = document.getElementById('studioWorkspace');
  const studioAnnotatedImg = document.getElementById('studioAnnotatedImg');
  const studioOriginalImg = document.getElementById('studioOriginalImg');
  const inventoryTableBody = document.getElementById('inventoryTableBody');
  const resultSummaryText = document.getElementById('resultSummaryText');
  const resultRoadBadge = document.getElementById('resultRoadBadge');
  const inventoryCountBadge = document.getElementById('inventoryCountBadge');

  // Load Curated Sample Cards
  async function loadSamples() {
    try {
      const res = await fetch('/api/samples');
      const data = await res.json();
      if (data.status === 'success' && data.samples) {
        sampleCardsContainer.innerHTML = '';
        data.samples.forEach((sample) => {
          const card = document.createElement('div');
          card.className = 'sample-card';
          card.innerHTML = `
            <div class="sample-thumb-wrap">
              <img src="${sample.url}" alt="${sample.title}" loading="lazy" />
            </div>
            <div class="sample-info">
              <h4 class="sample-card-title">${sample.title}</h4>
              <p class="sample-card-desc">${sample.desc}</p>
            </div>
          `;
          card.addEventListener('click', () => {
            activeImagePayload = { type: 'sample', data: sample.id, originalUrl: sample.url };
            analyzeActiveImage();
          });
          sampleCardsContainer.appendChild(card);
        });
      }
    } catch (e) {
      console.warn('Sample loader notice:', e);
    }
  }
  loadSamples();

  try {
    const savedRecords = JSON.parse(
      sessionStorage.getItem('pothole-live-inspection') || '[]'
    );
    savedRecords.forEach((record) => {
      if (record.trackId) liveInspectionRecords.set(record.trackId, record);
    });
    renderLiveInspectionGallery();
  } catch (error) {
    console.warn('Could not restore live inspection snapshots:', error);
  }

  const clearLiveSnapshotsBtn = document.getElementById('clearLiveSnapshotsBtn');
  if (clearLiveSnapshotsBtn) {
    clearLiveSnapshotsBtn.addEventListener('click', () => {
      liveInspectionRecords.clear();
      sessionStorage.removeItem('pothole-live-inspection');
      const grid = document.getElementById('liveInspectionGrid');
      const count = document.getElementById('liveInspectionCount');
      if (grid) {
        grid.innerHTML =
          '<div class="event-empty-state">Saved live detections cleared.</div>';
      }
      if (count) count.textContent = '0 snapshots';
      clearLiveSnapshotsBtn.textContent = 'Saved Data Cleared';
      clearLiveSnapshotsBtn.disabled = true;
      setTimeout(() => {
        clearLiveSnapshotsBtn.textContent = 'Clear Saved Data';
        clearLiveSnapshotsBtn.disabled = false;
      }, 1800);
    });
  }

  // Drag & Drop
  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFile(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadFile(e.target.files[0]);
  });

  async function uploadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      activeImagePayload = { type: 'base64', data: e.target.result, originalUrl: e.target.result };
      analyzeActiveImage();
    };
    reader.readAsDataURL(file);
  }

  async function analyzeActiveImage() {
    if (!activeImagePayload) return;
    studioWorkspace.style.display = 'block';

    const currentConf = globalConfidenceValue / 100.0;
    resultSummaryText.textContent = `Evaluating neural vision model at ${globalConfidenceValue}% threshold...`;

    const bodyPayload =
      activeImagePayload.type === 'sample'
        ? { sample_id: activeImagePayload.data, conf: currentConf }
        : { image_base64: activeImagePayload.data, conf: currentConf };

    try {
      const res = await fetch('/api/detect/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      displayInspectionResults(data);
    } catch (err) {
      alert(`Detection request failed: ${err.message}`);
    }
  }

  function displayInspectionResults(data) {
    if (data.status !== 'success') {
      alert(`Inference notice: ${data.message}`);
      return;
    }

    currentAnalysisData = data;
    studioWorkspace.style.display = 'block';

    studioAnnotatedImg.src = data.annotated_image;
    studioOriginalImg.src = activeImagePayload.originalUrl || data.annotated_image;
    studioAnnotatedImg.style.display = 'block';
    studioOriginalImg.style.display = 'none';

    document.getElementById('viewAnnotatedBtn').classList.add('active');
    document.getElementById('viewOriginalBtn').classList.remove('active');

    resultRoadBadge.textContent = data.road_status;
    resultRoadBadge.style.color = data.road_status_color;
    resultSummaryText.textContent = `${data.pothole_count} potholes identified in ${data.inference_time_ms} ms · Threshold: ${data.conf_threshold_used || globalConfidenceValue}% · Avg Conf: ${data.avg_confidence}%`;
    inventoryCountBadge.textContent = `${data.pothole_count} items`;

    // Populate Inventory Table
    inventoryTableBody.innerHTML = '';
    if (data.detections && data.detections.length > 0) {
      data.detections.forEach((det) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="inventory-ref"><strong>${det.id}</strong></td>
          <td class="inventory-confidence"><span class="inventory-mobile-label">Confidence</span><strong>${det.conf}%</strong></td>
          <td class="inventory-severity">
            <span class="inventory-mobile-label">Severity</span>
            <span class="badge-pill" style="font-size:10px; background:${det.badge_color}; color:#fff;">
              ${det.severity}
            </span>
          </td>
          <td class="inventory-risk"><span class="inventory-mobile-label">Risk</span><strong>${det.risk_score}/10</strong></td>
          <td class="inventory-action">
            <button class="btn-outline-pill btn-xs inspect-btn">Inspect</button>
          </td>
        `;

        tr.querySelector('.inspect-btn').addEventListener('click', () => {
          openPotholeAuditModal(det);
        });

        inventoryTableBody.appendChild(tr);
      });
    } else {
      inventoryTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:32px; color:var(--color-muted);">
            No potholes detected at current threshold (${globalConfidenceValue}%). Click "15% Sensitive" above to capture subtle road depressions.
          </td>
        </tr>
      `;
    }

    // Scroll smoothly to studio workspace
    studioWorkspace.scrollIntoView({ behavior: 'smooth' });
  }

  // View Toggle (Annotated vs Original)
  document.getElementById('viewAnnotatedBtn').addEventListener('click', () => {
    document.getElementById('viewAnnotatedBtn').classList.add('active');
    document.getElementById('viewOriginalBtn').classList.remove('active');
    studioAnnotatedImg.style.display = 'block';
    studioOriginalImg.style.display = 'none';
  });

  document.getElementById('viewOriginalBtn').addEventListener('click', () => {
    document.getElementById('viewOriginalBtn').classList.add('active');
    document.getElementById('viewAnnotatedBtn').classList.remove('active');
    studioAnnotatedImg.style.display = 'none';
    studioOriginalImg.style.display = 'block';
  });

  // Download Annotated Image
  document.getElementById('downloadAnnotatedBtn').addEventListener('click', () => {
    if (!currentAnalysisData || !currentAnalysisData.annotated_image) return;
    const a = document.createElement('a');
    a.href = currentAnalysisData.annotated_image;
    a.download = `pothole-audit-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Export JSON Report
  document.getElementById('exportAuditJsonBtn').addEventListener('click', () => {
    if (!currentAnalysisData) return;
    const exportPayload = {
      export_timestamp: new Date().toISOString(),
      platform: 'PotholeVision AI',
      model: 'YOLO11n-pothole',
      threshold_used_pct: globalConfidenceValue,
      inspection_summary: {
        total_potholes: currentAnalysisData.pothole_count,
        severity_counts: currentAnalysisData.severity_counts,
        avg_confidence: currentAnalysisData.avg_confidence,
        overall_risk_index: currentAnalysisData.overall_risk_score,
        road_status: currentAnalysisData.road_status,
        latency_ms: currentAnalysisData.inference_time_ms,
      },
      detections: currentAnalysisData.detections.map((d) => ({
        id: d.id,
        box: [d.x1, d.y1, d.x2, d.y2],
        width_px: d.width,
        height_px: d.height,
        confidence_pct: d.conf,
        severity: d.severity,
        risk_score: d.risk_score,
        recommended_action: d.repair_action,
      })),
    };

    const dataBlob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pothole-inspection-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ==========================================================================
  //  6. MODALS LOGIC
  // ==========================================================================

  const auditModal = document.getElementById('potholeAuditModal');
  const closeAuditModalBtn = document.getElementById('closeAuditModalBtn');
  let selectedPotholeDet = null;

  function openPotholeAuditModal(det) {
    selectedPotholeDet = det;
    document.getElementById('modalPotholeTitle').textContent = `Pothole Inspection: ${det.id}`;
    document.getElementById('modalCropImg').src = det.thumbnail;
    document.getElementById('modalConfVal').textContent = `${det.conf}%`;

    const sevBadge = document.getElementById('modalSeverityBadge');
    sevBadge.textContent = det.severity;
    sevBadge.style.backgroundColor = det.badge_color;
    sevBadge.style.color = '#ffffff';

    document.getElementById('modalRiskScore').textContent = `${det.risk_score} / 10`;
    document.getElementById('modalDims').textContent = `${det.width}px × ${det.height}px (${det.area_pct}% area)`;
    document.getElementById('modalBoxCoords').textContent = `[${det.x1}, ${det.y1}, ${det.x2}, ${det.y2}]`;
    document.getElementById('modalRepairAction').textContent = det.repair_action;

    auditModal.classList.add('active');
  }

  if (closeAuditModalBtn) {
    closeAuditModalBtn.addEventListener('click', () => {
      auditModal.classList.remove('active');
    });
  }

  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  if (copyCoordsBtn) {
    copyCoordsBtn.addEventListener('click', () => {
      if (!selectedPotholeDet) return;
      const coords = `[${selectedPotholeDet.x1}, ${selectedPotholeDet.y1}, ${selectedPotholeDet.x2}, ${selectedPotholeDet.y2}]`;
      navigator.clipboard.writeText(coords);
      alert(`Coordinates copied to clipboard: ${coords}`);
    });
  }

  // Close modals on escape key or backdrop click
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach((m) => {
        m.classList.remove('active');
      });
    }
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });
});
