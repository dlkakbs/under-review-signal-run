(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const resultCanvas = document.querySelector("#result-card");
  const resultCtx = resultCanvas.getContext("2d");

  const ui = {
    intro: document.querySelector("#intro"),
    result: document.querySelector("#result"),
    start: document.querySelector("#start-button"),
    retry: document.querySelector("#retry-button"),
    download: document.querySelector("#download-button"),
    copy: document.querySelector("#copy-button"),
    reveal: document.querySelector("#reveal-button"),
    fragments: document.querySelector("#fragment-count"),
    stage: document.querySelector("#stage-value"),
    shieldFill: document.querySelector("#shield-fill"),
    shieldValue: document.querySelector("#shield-value"),
    exposureFill: document.querySelector("#exposure-fill"),
    exposureValue: document.querySelector("#exposure-value"),
    time: document.querySelector("#time-value"),
    toast: document.querySelector("#toast"),
    log: document.querySelector("#signal-log"),
    resultKicker: document.querySelector("#result-kicker"),
    resultTitle: document.querySelector("#result-title"),
    resultMessage: document.querySelector("#result-message"),
    resultProofs: document.querySelector("#result-proofs"),
    resultExposure: document.querySelector("#result-exposure"),
    resultScore: document.querySelector("#result-score"),
  };

  const W = canvas.width;
  const H = canvas.height;
  const TOTAL_FRAGMENTS = 7;
  const RUN_TIME = 45;
  const COMBO_WINDOW = 5.2;
  const keys = new Set();
  const touchDirections = new Set();
  const sessionSeed = Math.floor(Date.now() % 1000000);
  const PALETTES = [
    { name: "PASTEL GHOST", background: "#e8e5df", ink: "#17131d", colors: ["#ff7d7d", "#f4c76c", "#b9dc77", "#79d6c7", "#789fee", "#b37ce8", "#ed79b7"], pattern: "gradient" },
    { name: "COLOR SIGNAL", background: "#deded8", ink: "#090a0b", colors: ["#f6d400", "#ee334e", "#008bd2", "#55ad5b", "#191919", "#e9e9e3"], pattern: "bars" },
    { name: "VIOLET CHECK", background: "#17151b", ink: "#f0ead9", colors: ["#d9d0a5", "#a99ac8", "#8170ad", "#4d3c72", "#2d2440"], pattern: "checker" },
    { name: "BLUE SHIFT", background: "#d9dbdd", ink: "#111323", colors: ["#b9c7dd", "#8795cb", "#696bc0", "#5045a4", "#292661"], pattern: "gradient" },
    { name: "MAGENTA NODE", background: "#161316", ink: "#f6dce9", colors: ["#f06faa", "#d65292", "#ad3d78", "#772d58", "#3e1d35"], pattern: "noise" },
    { name: "COBALT SHIELD", background: "#080a15", ink: "#edf0ff", colors: ["#bfc6ff", "#8b92ff", "#555bea", "#3032af", "#171759"], pattern: "halftone" },
    { name: "MATRIX TRACE", background: "#151917", ink: "#e9ffee", colors: ["#a2ffc0", "#64d98b", "#3c9a63", "#226344", "#102f26"], pattern: "rain" },
    { name: "YELLOW PROOF", background: "#cfc738", ink: "#111109", colors: ["#e9e169", "#c1ba31", "#908a19", "#4d4b14", "#101108"], pattern: "halftone" },
    { name: "PRISMATIC EYE", background: "#d8d64a", ink: "#10121c", colors: ["#142a69", "#1987b0", "#45b488", "#d5bb38", "#e87534", "#c63d59"], pattern: "rings" },
  ];
  let rng = mulberry32(sessionSeed);
  let palette = PALETTES[sessionSeed % PALETTES.length];
  let state = "intro";
  let lastTime = performance.now();
  let timeLeft = RUN_TIME;
  let exposure = 0;
  let shieldEnergy = 100;
  let collected = 0;
  let stage = 1;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lastCollectAt = -99;
  let revealHeld = false;
  let revealLocked = false;
  let revealing = false;
  let detected = false;
  let wasDetected = false;
  let detectionLessonShown = false;
  let toastTimer = 0;
  let runStartedAt = 0;
  let pickup = null;
  let particles = [];
  let ambience = [];
  let claimedTiles = [];
  let lastResult = null;

  const player = {
    x: W / 2,
    y: H / 2,
    radius: 40,
    speed: 218,
  };

  const scanners = [
    { baseX: 135, baseY: 120, x: 135, y: 120, angle: 0.3, speed: 0.74, range: 245, fov: 0.76, ampX: 46, ampY: 22, phase: 0.1 },
    { baseX: 820, baseY: 118, x: 820, y: 118, angle: 2.7, speed: -0.67, range: 255, fov: 0.72, ampX: 38, ampY: 30, phase: 1.4 },
    { baseX: 165, baseY: 430, x: 165, y: 430, angle: 5.3, speed: -0.82, range: 238, fov: 0.76, ampX: 52, ampY: 18, phase: 2.7 },
    { baseX: 805, baseY: 430, x: 805, y: 430, angle: 3.8, speed: 0.72, range: 248, fov: 0.72, ampX: 42, ampY: 24, phase: 4.1 },
    { baseX: 485, baseY: 92, x: 485, y: 92, angle: 1.6, speed: -0.9, range: 260, fov: 0.65, ampX: 100, ampY: 12, phase: 5.2 },
  ];
  const safeZone = { x: W / 2, y: H - 92, radius: 54 };
  const PORTRAIT_MASK = [
    "000000011111110000",
    "000001111111111100",
    "000011111111111110",
    "000011111111111110",
    "000001111111111111",
    "000001111111111111",
    "000011111111111111",
    "000011111111111111",
    "000001111111111111",
    "000011111111111111",
    "000001111111111110",
    "000000111111111100",
    "000000011111110000",
    "000000011111100000",
    "000000111111110000",
    "000011111111111100",
    "000111111111111110",
    "001111111111111111",
  ];
  const PORTRAIT_GLITCH = [
    { x: 4, y: 0, w: 1 },
    { x: 1, y: 2, w: 2 },
    { x: 3, y: 3, w: 2 },
    { x: 0, y: 5, w: 1 },
    { x: 2, y: 7, w: 2 },
    { x: 0, y: 9, w: 2 },
    { x: 3, y: 11, w: 2 },
    { x: 1, y: 13, w: 1 },
    { x: 3, y: 15, w: 2 },
    { x: 0, y: 17, w: 2 },
  ];

  applyPalette();
  initAmbience();
  spawnPickup();
  bindControls();
  requestAnimationFrame(loop);

  function mulberry32(seed) {
    return function random() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function applyPalette() {
    document.documentElement.style.setProperty("--identity", palette.colors[0]);
    document.documentElement.style.setProperty("--identity-alt", palette.colors[Math.min(3, palette.colors.length - 1)]);
  }

  function initAmbience() {
    const noiseRng = mulberry32(707);
    ambience = Array.from({ length: 130 }, () => ({
      x: noiseRng() * W,
      y: noiseRng() * H,
      size: noiseRng() > 0.87 ? 2 : 1,
      alpha: 0.08 + noiseRng() * 0.16,
      color: Math.floor(noiseRng() * palette.colors.length),
    }));
  }

  function bindControls() {
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
      }
      keys.add(key);
      if (key === " " && state === "playing") revealHeld = true;
      if (key === "enter" && state === "intro") startGame();
      if (key === "r" && (state === "won" || state === "lost")) startGame();
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      keys.delete(key);
      if (key === " ") revealHeld = false;
    });

    window.addEventListener("blur", clearHeldControls);
    ui.start.addEventListener("click", startGame);
    ui.retry.addEventListener("click", startGame);
    ui.download.addEventListener("click", downloadIdentity);
    ui.copy.addEventListener("click", copyResult);

    bindHoldButton(ui.reveal, () => {
      revealHeld = true;
      ui.reveal.classList.add("is-held");
    }, () => {
      revealHeld = false;
      ui.reveal.classList.remove("is-held");
    });

    document.querySelectorAll("[data-direction]").forEach((button) => {
      const direction = button.dataset.direction;
      bindHoldButton(button, () => {
        touchDirections.add(direction);
        button.classList.add("is-held");
      }, () => {
        touchDirections.delete(direction);
        button.classList.remove("is-held");
      });
    });
  }

  function bindHoldButton(button, onStart, onEnd) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      onStart();
    });
    ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach((name) => {
      button.addEventListener(name, onEnd);
    });
  }

  function clearHeldControls() {
    keys.clear();
    touchDirections.clear();
    revealHeld = false;
    revealing = false;
    document.querySelectorAll(".is-held").forEach((el) => el.classList.remove("is-held"));
  }

  function startGame() {
    state = "playing";
    timeLeft = RUN_TIME;
    exposure = 0;
    shieldEnergy = 100;
    collected = 0;
    stage = 1;
    score = 0;
    combo = 0;
    maxCombo = 0;
    lastCollectAt = -99;
    detected = false;
    wasDetected = false;
    detectionLessonShown = false;
    revealLocked = false;
    particles = [];
    claimedTiles = [];
    palette = PALETTES[Math.floor(rng() * PALETTES.length)];
    applyPalette();
    initAmbience();
    rng = mulberry32(sessionSeed + Math.floor(performance.now()));
    player.x = W / 2;
    player.y = H / 2;
    scanners.forEach((scanner, index) => {
      scanner.x = scanner.baseX;
      scanner.y = scanner.baseY;
      scanner.angle = 0.7 + index * 1.41 + rng() * 0.55;
    });
    spawnPickup();
    clearHeldControls();
    runStartedAt = performance.now();
    ui.intro.classList.remove("overlay-visible");
    ui.result.classList.remove("overlay-visible");
    ui.copy.textContent = "[ COPY RESULT ]";
    resetLog();
    addLog(`identity palette: ${palette.name.toLowerCase()}`);
    addLog("stage 01: acquisition");
    showToast(`${palette.name} // IDENTITY DECRYPTED`, 1900);
    updateHud();
  }

  function resetLog() {
    ui.log.innerHTML = "";
  }

  function addLog(message) {
    const elapsed = Math.max(0, Math.floor((performance.now() - runStartedAt) / 1000));
    const li = document.createElement("li");
    const time = document.createElement("time");
    const span = document.createElement("span");
    time.textContent = `00:${String(elapsed).padStart(2, "0")}`;
    span.textContent = message;
    li.append(time, span);
    ui.log.prepend(li);
    while (ui.log.children.length > 7) ui.log.lastElementChild.remove();
  }

  function spawnPickup() {
    const margin = 76;
    let candidate;
    let attempts = 0;
    const decoyChance = stage === 1 ? 0 : stage === 2 ? 0.22 : 0.34;
    do {
      candidate = {
        x: margin + rng() * (W - margin * 2),
        y: margin + rng() * (H - margin * 2),
        phase: rng() * Math.PI * 2,
        isDecoy: rng() < decoyChance,
        colorIndex: Math.floor(rng() * palette.colors.length),
      };
      attempts += 1;
    } while (
      attempts < 48 &&
      (distance(candidate, player) < 135 || activeScanners().some((scanner) => distance(candidate, scanner) < 72))
    );
    pickup = candidate;
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    if (state === "playing") update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }

  function update(dt, now) {
    const elapsed = (now - runStartedAt) / 1000;
    const left = keys.has("arrowleft") || keys.has("a") || touchDirections.has("left");
    const right = keys.has("arrowright") || keys.has("d") || touchDirections.has("right");
    const up = keys.has("arrowup") || keys.has("w") || touchDirections.has("up");
    const down = keys.has("arrowdown") || keys.has("s") || touchDirections.has("down");

    let dx = Number(right) - Number(left);
    let dy = Number(down) - Number(up);
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    player.x = clamp(player.x + dx * player.speed * dt, 66, W - 66);
    player.y = clamp(player.y + dy * player.speed * dt, 66, H - 66);

    updateScanners(dt, now);
    const inSafeZone = stage >= 2 && isSafeZoneActive(now) && distance(player, safeZone) < safeZone.radius;

    if (revealLocked && !revealHeld && shieldEnergy >= 14) revealLocked = false;
    revealing = revealHeld && !revealLocked && shieldEnergy > 0;
    if (revealing) {
      shieldEnergy -= (inSafeZone ? 7 : 22 + (stage - 1) * 2.5) * dt;
      if (shieldEnergy <= 0) {
        shieldEnergy = 0;
        revealLocked = true;
        revealing = false;
        showToast("SHIELD DEPLETED // release REVEAL to recharge", 2200);
        addLog("shield energy depleted");
      }
    } else {
      shieldEnergy += (inSafeZone ? 34 : 16) * dt;
    }
    shieldEnergy = clamp(shieldEnergy, 0, 100);

    detected = revealing && !inSafeZone && elapsed > 4.5 && activeScanners().some(isPlayerDetected);
    if (detected) {
      exposure += (39 + stage * 4) * dt;
      shieldEnergy -= 8 * dt;
      if (!wasDetected) {
        if (!detectionLessonShown) {
          detectionLessonShown = true;
          showToast("SCANNER LOCKED // release REVEAL to disappear", 2600);
        } else {
          showToast("TRACE FOUND // SHIELD NOW", 1100);
        }
        combo = 0;
        addLog("scanner lock detected");
      }
    } else if (inSafeZone) {
      exposure -= 27 * dt;
    } else if (!revealing) {
      exposure -= 13 * dt;
    } else {
      exposure -= 2 * dt;
    }
    wasDetected = detected;
    exposure = clamp(exposure, 0, 100);
    shieldEnergy = clamp(shieldEnergy, 0, 100);

    if (revealing && pickup && distance(player, pickup) < 45) {
      collectPickup(now);
      if (state !== "playing") return;
    }

    if (combo > 0 && elapsed - lastCollectAt > COMBO_WINDOW) combo = 0;

    claimedTiles.forEach((tile) => { tile.age += dt; });
    particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    });
    particles = particles.filter((particle) => particle.life > 0);

    timeLeft -= dt;
    if (exposure >= 100) {
      finish(false, "exposed");
      return;
    }
    if (timeLeft <= 0) {
      timeLeft = 0;
      finish(false, "timeout");
      return;
    }

    if (toastTimer && now > toastTimer) hideToast();
    updateHud();
  }

  function updateScanners(dt, now) {
    const speedScale = 1 + (stage - 1) * 0.22;
    scanners.forEach((scanner) => {
      scanner.angle += scanner.speed * speedScale * dt;
      if (stage >= 2) {
        const t = now * 0.00075;
        const moveScale = stage === 3 ? 1.15 : 0.68;
        scanner.x = scanner.baseX + Math.sin(t + scanner.phase) * scanner.ampX * moveScale;
        scanner.y = scanner.baseY + Math.cos(t * 1.2 + scanner.phase) * scanner.ampY * moveScale;
      } else {
        scanner.x = scanner.baseX;
        scanner.y = scanner.baseY;
      }
    });
  }

  function activeScanners() {
    return scanners.slice(0, stage === 1 ? 3 : stage === 2 ? 4 : 5);
  }

  function collectPickup(now) {
    const elapsed = (now - runStartedAt) / 1000;
    if (pickup.isDecoy) {
      exposure = clamp(exposure + 18, 0, 100);
      shieldEnergy = clamp(shieldEnergy - 22, 0, 100);
      score = Math.max(0, score - 250);
      combo = 0;
      burst(pickup.x, pickup.y, "#ff5269", 28);
      showToast("UNSTABLE SIGNAL // DECOY REJECTED // -250", 1700);
      addLog("decoy touched: trace increased");
      spawnPickup();
      return;
    }

    combo = elapsed - lastCollectAt <= COMBO_WINDOW ? combo + 1 : 1;
    maxCombo = Math.max(maxCombo, combo);
    lastCollectAt = elapsed;
    collected += 1;
    const multiplier = 1 + Math.min(combo - 1, 4) * 0.28;
    const gain = Math.round((480 + timeLeft * 10 + (100 - exposure) * 3) * multiplier);
    score += gain;
    claimedTiles.push({
      x: pickup.x,
      y: pickup.y,
      colorIndex: pickup.colorIndex,
      age: 0,
      seed: Math.floor(rng() * 9999),
    });
    burst(pickup.x, pickup.y, palette.colors[pickup.colorIndex], 34);
    addLog(`proof ${String(collected).padStart(2, "0")} verified · combo x${combo}`);

    if (collected >= TOTAL_FRAGMENTS) {
      finish(true, "complete");
      return;
    }

    const nextStage = collected < 3 ? 1 : collected < 5 ? 2 : 3;
    if (nextStage !== stage) {
      stage = nextStage;
      if (stage === 2) {
        showToast("STAGE 02 // NETWORK CONGESTION // DECOYS ONLINE", 2500);
        addLog("moving scanners detected");
      } else {
        showToast("STAGE 03 // FINAL PROOF // FULL NETWORK SWEEP", 2500);
        addLog("five scanner nodes active");
      }
    } else if (combo >= 2) {
      showToast(`ZERO-TRACE COMBO x${combo} // +${gain}`, 950);
    }
    spawnPickup();
  }

  function isPlayerDetected(scanner) {
    const dx = player.x - scanner.x;
    const dy = player.y - scanner.y;
    const dist = Math.hypot(dx, dy);
    const range = scanner.range + (stage - 1) * 14;
    const fov = scanner.fov + (stage - 1) * 0.045;
    if (dist > range) return false;
    const angle = Math.atan2(dy, dx);
    return Math.abs(angleDelta(angle, scanner.angle)) < fov / 2;
  }

  function isSafeZoneActive(now) {
    return Math.sin(now * 0.0021) > -0.28;
  }

  function finish(won, reason) {
    state = won ? "won" : "lost";
    revealHeld = false;
    revealing = false;
    hideToast();
    score += won ? Math.round(timeLeft * 42 + (100 - exposure) * 13 + maxCombo * 180) : collected * 110;
    lastResult = { won, reason, collected, exposure: Math.round(exposure), shieldEnergy: Math.round(shieldEnergy), score, timeLeft, maxCombo, palette };

    ui.resultKicker.textContent = won ? `${palette.name} // TRANSMISSION COMPLETE` : "TRANSMISSION INTERRUPTED";
    ui.resultTitle.textContent = won
      ? "Signal assembled."
      : reason === "exposed"
        ? "Identity exposed."
        : "Window closed.";
    ui.resultMessage.textContent = won
      ? `You revealed only what the network needed. Zero-trace combo x${maxCombo}. Your encrypted identity is ready.`
      : reason === "exposed"
        ? "Your trace reached 100%. Break scanner lock sooner and recharge inside the shielded zone."
        : "The queue moved, but the signal was incomplete. Watch for unstable decoys and save energy for the final sweep.";
    ui.resultProofs.textContent = `${collected}/${TOTAL_FRAGMENTS}`;
    ui.resultExposure.textContent = `${Math.round(exposure)}%`;
    ui.resultScore.textContent = String(score).padStart(4, "0");
    ui.download.hidden = !won;
    ui.copy.hidden = !won;
    renderIdentityCard(lastResult);
    ui.result.classList.add("overlay-visible");
    addLog(won ? "identity assembled" : `run failed: ${reason}`);
  }

  function updateHud() {
    ui.fragments.textContent = collected;
    ui.stage.textContent = `STAGE ${stage}`;
    ui.shieldValue.textContent = `${Math.round(shieldEnergy)}%`;
    ui.shieldFill.style.width = `${shieldEnergy}%`;
    ui.exposureValue.textContent = `${Math.round(exposure)}%`;
    ui.exposureFill.style.width = `${exposure}%`;
    ui.exposureFill.style.background = exposure > 72 ? "#ff5269" : exposure > 42 ? "#ffca65" : "#6dff91";
    ui.time.textContent = timeLeft.toFixed(1);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#030605";
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawClaimedTiles();
    drawAmbience(now);
    if (stage >= 2) drawSafeZone(now);
    activeScanners().forEach((scanner, index) => drawScanner(scanner, index, now));
    drawPickup(now);
    drawPlayer(now);
    drawParticles();
    drawCanvasLabels(now);
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(168,255,189,0.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }
  }

  function drawClaimedTiles() {
    claimedTiles.forEach((tile) => {
      const tileRng = mulberry32(tile.seed);
      const progress = clamp(tile.age * 3, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.07 + progress * 0.11;
      for (let i = 0; i < 20; i += 1) {
        const size = 10 + Math.floor(tileRng() * 4) * 6;
        ctx.fillStyle = palette.colors[(tile.colorIndex + i) % palette.colors.length];
        ctx.fillRect(tile.x - 72 + tileRng() * 144, tile.y - 72 + tileRng() * 144, size, size);
      }
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = palette.colors[tile.colorIndex];
      ctx.strokeRect(tile.x - 42 - progress * 18, tile.y - 42 - progress * 18, 84 + progress * 36, 84 + progress * 36);
      ctx.restore();
    });
  }

  function drawAmbience(now) {
    ambience.forEach((dot, i) => {
      const flicker = 0.75 + Math.sin(now * 0.001 + i) * 0.25;
      ctx.globalAlpha = dot.alpha * flicker;
      ctx.fillStyle = palette.colors[dot.color];
      ctx.fillRect(dot.x, dot.y, dot.size, dot.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawSafeZone(now) {
    const active = isSafeZoneActive(now);
    const pulse = safeZone.radius + Math.sin(now * 0.005) * 6;
    ctx.save();
    ctx.globalAlpha = active ? 0.7 : 0.18;
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = palette.colors[1 % palette.colors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = palette.colors[0];
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(active ? "SHIELDED ZONE" : "ZONE RECHARGING", safeZone.x, safeZone.y + 4);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawScanner(scanner, index, now) {
    const range = scanner.range + (stage - 1) * 14;
    const fov = scanner.fov + (stage - 1) * 0.045;
    const left = scanner.angle - fov / 2;
    const right = scanner.angle + fov / 2;
    const active = revealing && isPlayerDetected(scanner);
    const gradient = ctx.createRadialGradient(scanner.x, scanner.y, 0, scanner.x, scanner.y, range);
    gradient.addColorStop(0, active ? "rgba(255,82,105,0.3)" : "rgba(255,82,105,0.14)");
    gradient.addColorStop(1, "rgba(255,82,105,0)");

    ctx.beginPath();
    ctx.moveTo(scanner.x, scanner.y);
    ctx.arc(scanner.x, scanner.y, range, left, right);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = active ? "rgba(255,82,105,0.88)" : "rgba(255,82,105,0.34)";
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();

    const pulse = 13 + Math.sin(now * 0.004 + index) * 2;
    ctx.fillStyle = "#13090a";
    ctx.fillRect(scanner.x - 9, scanner.y - 9, 18, 18);
    ctx.strokeStyle = active ? "#ff5269" : "rgba(255,82,105,0.55)";
    ctx.strokeRect(scanner.x - pulse / 2, scanner.y - pulse / 2, pulse, pulse);
    ctx.fillStyle = active ? "#ff5269" : "#7a303a";
    ctx.fillRect(scanner.x - 3, scanner.y - 3, 6, 6);
  }

  function drawPickup(now) {
    if (!pickup || state === "won") return;
    const pulse = 1 + Math.sin(now * (pickup.isDecoy ? 0.017 : 0.006) + pickup.phase) * (pickup.isDecoy ? 0.22 : 0.13);
    const color = pickup.isDecoy ? (Math.sin(now * 0.025) > 0 ? "#ff5269" : "#ffca65") : palette.colors[pickup.colorIndex];
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(Math.PI / 4 + (pickup.isDecoy ? Math.sin(now * 0.02) * 0.16 : 0));
    ctx.scale(pulse, pulse);
    ctx.shadowColor = color;
    ctx.shadowBlur = revealing ? 24 : 13;
    ctx.fillStyle = color;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = "#071008";
    if (pickup.isDecoy) {
      ctx.fillRect(-9, -2, 18, 4);
      ctx.fillRect(-2, -9, 4, 18);
    } else {
      ctx.fillRect(-3, -3, 6, 6);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, 25 + Math.sin(now * 0.004) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, pickup.isDecoy ? 0.38 : 0.26);
    ctx.stroke();
  }

  function drawPlayer(now) {
    const alpha = state === "intro" ? 0.6 : revealing ? 1 : 0.34;
    const dangerJitter = detected ? Math.sin(now * 0.09) * 3 : 0;
    const px = 6;

    ctx.save();
    ctx.translate(player.x + dangerJitter, player.y - 1);
    if (!revealing) {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = hexToRgba(palette.colors[0], 0.72);
      ctx.beginPath();
      ctx.arc(0, 0, 64 + Math.sin(now * 0.004) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.shadowColor = detected ? "#ff5269" : palette.colors[0];
    ctx.shadowBlur = revealing ? 18 : 4;
    drawPixelPortrait(ctx, palette, now, {
      pixel: px,
      alpha,
      animated: true,
      detected,
      seed: sessionSeed,
    });
    ctx.restore();
  }

  function drawPixelPortrait(target, portraitPalette, now, options = {}) {
    const pixel = options.pixel ?? 4;
    const alpha = options.alpha ?? 1;
    const animated = options.animated ?? false;
    const isDetected = options.detected ?? false;
    const seed = options.seed ?? 0;
    const originX = -9 * pixel;
    const originY = -9 * pixel;

    target.save();
    target.globalAlpha = alpha;
    PORTRAIT_GLITCH.forEach((fragment, index) => {
      const drift = animated ? Math.round(Math.sin(now * 0.006 + index * 1.37) * 1.5) * pixel : 0;
      target.fillStyle = isDetected
        ? "#ff7185"
        : portraitPalette.colors[portraitPaletteIndex(portraitPalette, fragment.x, fragment.y, now, seed)];
      target.fillRect(
        originX + fragment.x * pixel + drift,
        originY + fragment.y * pixel,
        fragment.w * pixel,
        pixel,
      );
    });

    PORTRAIT_MASK.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== "1") return;
        target.fillStyle = isDetected
          ? "#ff7185"
          : portraitPalette.colors[portraitPaletteIndex(portraitPalette, x, y, now, seed)];
        target.fillRect(originX + x * pixel, originY + y * pixel, pixel, pixel);
      });
    });

    target.shadowBlur = 0;
    target.fillStyle = isDetected ? "#2a090e" : portraitPalette.ink;
    [[10, 5], [14, 5]].forEach(([x, y]) => {
      target.fillRect(originX + x * pixel, originY + y * pixel, pixel * 2, pixel * 2);
      target.fillStyle = portraitPalette.background;
      target.fillRect(originX + (x + 1) * pixel, originY + (y + 1) * pixel, pixel, pixel);
      target.fillStyle = isDetected ? "#2a090e" : portraitPalette.ink;
    });
    target.restore();
  }

  function portraitPaletteIndex(portraitPalette, x, y, now, seed = 0) {
    const length = portraitPalette.colors.length;
    if (portraitPalette.pattern === "bars") return x % length;
    if (portraitPalette.pattern === "checker") return (x + y) % 2 === 0 ? 0 : Math.min(2, length - 1);
    if (portraitPalette.pattern === "rings") return Math.floor(Math.hypot(x - 13, y - 7)) % length;
    if (portraitPalette.pattern === "rain") return (x * 2 + y + Math.floor(now / 420)) % length;
    if (portraitPalette.pattern === "halftone") return (x + y * 2) % length;
    if (portraitPalette.pattern === "noise") return Math.abs(x * 17 + y * 31 + seed) % length;

    const bodyShift = y >= 14 ? 2 : y >= 12 ? 1 : 0;
    const gradient = Math.floor((y * 0.58 + (17 - x) * 0.24) / 3.1) + bodyShift;
    return clamp(gradient, 0, length - 1);
  }

  function drawParticles() {
    particles.forEach((particle) => {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawCanvasLabels(now) {
    ctx.fillStyle = "rgba(210,230,216,0.4)";
    ctx.font = "9px monospace";
    ctx.fillText(`SHIELDED GRID // ${palette.name}`, 18, 24);
    ctx.textAlign = "right";
    ctx.fillText(revealing ? "IDENTITY: REVEALED" : "IDENTITY: ENCRYPTED", W - 18, 24);
    ctx.textAlign = "left";

    if (state === "playing" && !revealing) {
      ctx.fillStyle = "rgba(210,230,216,0.34)";
      ctx.fillText(revealLocked ? "RELEASE REVEAL TO RESET SHIELD" : "HOLD SPACE TO REVEAL", 18, H - 18);
    }

    if (combo > 1) {
      const remaining = clamp(COMBO_WINDOW - ((now - runStartedAt) / 1000 - lastCollectAt), 0, COMBO_WINDOW);
      ctx.textAlign = "right";
      ctx.fillStyle = palette.colors[0];
      ctx.font = "bold 14px monospace";
      ctx.fillText(`ZERO-TRACE x${combo}`, W - 18, H - 35);
      ctx.globalAlpha = 0.45;
      ctx.fillRect(W - 158, H - 25, 140 * (remaining / COMBO_WINDOW), 3);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
    }
  }

  function burst(x, y, color, amount) {
    for (let i = 0; i < amount; i += 1) {
      const angle = rng() * Math.PI * 2;
      const speed = 45 + rng() * 150;
      const life = 0.35 + rng() * 0.6;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.floor(rng() * 4),
        color: i % 3 === 0 ? palette.colors[i % palette.colors.length] : color,
      });
    }
  }

  function showToast(message, duration) {
    ui.toast.textContent = message;
    ui.toast.classList.add("visible");
    toastTimer = performance.now() + duration;
  }

  function hideToast() {
    ui.toast.classList.remove("visible");
    toastTimer = 0;
  }

  function renderIdentityCard(result) {
    const c = resultCtx;
    const p = result.palette;
    c.clearRect(0, 0, 600, 600);
    c.imageSmoothingEnabled = false;
    c.fillStyle = p.background;
    c.fillRect(0, 0, 600, 600);

    c.save();
    c.translate(300, 294);
    drawPixelPortrait(c, p, 0, {
      pixel: 24,
      alpha: 1,
      animated: false,
      detected: !result.won,
      seed: sessionSeed + result.score,
    });
    c.restore();
    c.globalAlpha = 0.2;
    c.fillStyle = result.won ? p.colors[0] : "#ff7185";
    c.fillRect(92, 526, 416, 7);
    c.globalAlpha = 1;
  }

  function downloadIdentity() {
    if (!lastResult?.won) return;
    const link = document.createElement("a");
    link.download = `under-review-node-${String(sessionSeed).padStart(6, "0")}.png`;
    link.href = resultCanvas.toDataURL("image/png");
    link.click();
  }

  async function copyResult() {
    if (!lastResult?.won) return;
    const text = `STATUS: UNDER REVIEW // ${palette.name} // SIGNAL: ASSEMBLED // ${lastResult.collected}/${TOTAL_FRAGMENTS} proofs // zero-trace x${lastResult.maxCombo} // score ${lastResult.score}`;
    try {
      await navigator.clipboard.writeText(text);
      ui.copy.textContent = "[ COPIED ]";
    } catch {
      ui.copy.textContent = "[ COPY FAILED ]";
    }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgba(hex, alpha) {
    const value = Number.parseInt(hex.replace("#", ""), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
})();
