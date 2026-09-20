// KINETIC STUDIO — Direct Screen Gesture Scrubbing & 3D Text Drum Engine
// 120-Frame Sequence: Borosilicate Flask -> Meniscus Surge -> Molten Chrome Cascade -> Chromed 3D Tools

const TOTAL_FRAMES = 120;
const frameImages = [];
let currentFrameDrawn = -1;

const canvas = document.getElementById('bg-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
const alchemyBar = document.getElementById('alchemy-bar');
const studioStage = document.getElementById('studio-stage') || document.body;

// Gesture & Animation State
let targetProgress = 0;
let smoothProgress = 0;
let isDragging = false;
let startY = 0;
let startProgress = 0;
let lastY = 0;
let lastTime = 0;
let velocityY = 0;
let momentumVel = 0;
let hasMoved = false;
let lastHapticFrame = 1;

// Device & Android Detection
const isAndroid = /Android/i.test(navigator.userAgent) || window.location.search.includes('android') || window.location.search.includes('scrub');
const isMobileTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 820;

if (isAndroid || isMobileTouch) {
  document.documentElement.classList.add('is-android');
  document.body.classList.add('is-android');
}

// 1. Draw frame onto canvas
function drawFrame(frameNumber) {
  if (!ctx || !canvas) return;
  const clampedNum = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(frameNumber)));
  const img = frameImages[clampedNum - 1];

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentFrameDrawn = clampedNum;
  }
}

// 2. Preload the 120 extracted frames
function preloadFrames() {
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const pad = String(i).padStart(3, '0');
    img.src = `assets/scroll_frames/frame_${pad}.jpg`;
    img.onload = () => {
      if (i === 1 && currentFrameDrawn === -1) {
        drawFrame(1);
      }
    };
    if (img.complete && i === 1 && currentFrameDrawn === -1) {
      drawFrame(1);
    }
    frameImages.push(img);
  }
}
preloadFrames();

// 3. 3D Cylindrical Text Drum Transform
function updateTextDrum(progress) {
  const beats = document.querySelectorAll('.text-drum-beat');
  if (!beats.length) return;
  const beatCount = beats.length;
  const drumPosition = progress * (beatCount - 1);

  beats.forEach((beat, index) => {
    const offset = index - drumPosition;
    const translateY = offset * 100;
    const rotateX = -(offset * 40);
    beat.style.transform = `perspective(900px) translateY(${translateY}%) rotateX(${rotateX}deg)`;
    beat.style.opacity = Math.max(0, 1 - Math.abs(offset) * 1.5);
    beat.style.pointerEvents = Math.abs(offset) < 0.35 ? 'auto' : 'none';
  });
}

function updateTopBar(progress) {
  if (alchemyBar) {
    alchemyBar.style.width = `${Math.round(progress * 100)}%`;
  }
}

function triggerHapticTick(frameNum) {
  if (frameNum !== lastHapticFrame && frameNum % 6 === 0) {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(4);
    }
    lastHapticFrame = frameNum;
  }
}

// 4. Sensitivity Calculation
function getTravelDistance() {
  // ~1.8x screen height for smooth pacing across all 5 narrative beats
  return Math.max(900, window.innerHeight * 1.8);
}

// 5. Continuous render loop with inertia
function renderLoop(time) {
  const t = time || performance.now();
  update3DChromeBubble(t);

  if (isDragging) {
    // 1:1 direct tracking while dragging finger
    const targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(1 + targetProgress * (TOTAL_FRAMES - 1))));
    if (targetFrame !== currentFrameDrawn) {
      drawFrame(targetFrame);
      triggerHapticTick(targetFrame);
    }
    updateTextDrum(targetProgress);
    updateTopBar(targetProgress);
    smoothProgress = targetProgress;
  } else {
    // Handle momentum gliding after release
    if (Math.abs(momentumVel) > 0.00008) {
      targetProgress = Math.min(1, Math.max(0, targetProgress + momentumVel));
      momentumVel *= 0.92; // Smooth exponential friction decay
      smoothProgress = targetProgress;

      const targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(1 + targetProgress * (TOTAL_FRAMES - 1))));
      if (targetFrame !== currentFrameDrawn) {
        drawFrame(targetFrame);
        triggerHapticTick(targetFrame);
      }
      updateTextDrum(targetProgress);
      updateTopBar(targetProgress);
    } else {
      momentumVel = 0;
      // Minor lerp settling for wheel or discrete step inputs
      const diff = targetProgress - smoothProgress;
      if (Math.abs(diff) > 0.0005) {
        smoothProgress += diff * 0.35;
        const targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(1 + smoothProgress * (TOTAL_FRAMES - 1))));
        if (targetFrame !== currentFrameDrawn) {
          drawFrame(targetFrame);
          triggerHapticTick(targetFrame);
        }
        updateTextDrum(smoothProgress);
        updateTopBar(smoothProgress);
      }
    }
  }

  requestAnimationFrame(renderLoop);
}

// 6. Direct Gesture Handling (Entire Viewport)
function onGestureStart(clientY, target) {
  // If user tapped a modal element or form input, let them interact normally
  if (target && (target.closest('#commission-modal') || target.closest('#artifact-modal') || target.closest('#messenger-widget') || target.closest('#live-messenger-drawer'))) return;

  isDragging = true;
  hasMoved = false;
  startY = clientY;
  startProgress = targetProgress;
  lastY = clientY;
  lastTime = performance.now();
  velocityY = 0;
  momentumVel = 0;
}

function onGestureMove(clientY) {
  if (!isDragging) return;
  const deltaY = startY - clientY; // Swiping up moves forward
  const now = performance.now();
  const dt = Math.max(1, now - lastTime);

  if (Math.abs(deltaY) > 6) {
    hasMoved = true;
  }

  // Instantaneous velocity calculation (px/ms)
  const dy = lastY - clientY;
  velocityY = (dy / dt) * 0.7 + velocityY * 0.3;
  lastY = clientY;
  lastTime = now;

  const travel = getTravelDistance();
  const progressDelta = deltaY / travel;
  targetProgress = Math.min(1, Math.max(0, startProgress + progressDelta));
}

function onGestureEnd() {
  if (!isDragging) return;
  isDragging = false;

  // Apply release momentum if user flicked
  if (hasMoved && Math.abs(velocityY) > 0.12) {
    const travel = getTravelDistance();
    // Convert px/ms to progress/frame (~16ms per frame)
    momentumVel = (velocityY / travel) * 16.0;
    // Cap maximum momentum
    momentumVel = Math.min(0.04, Math.max(-0.04, momentumVel));
  }
}

// Touch Events across Window / Stage
window.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  onGestureStart(e.touches[0].clientY, e.target);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  // Prevent browser default pull-to-refresh or page bounces while swiping
  if (e.cancelable && hasMoved) {
    e.preventDefault();
  }
  onGestureMove(e.touches[0].clientY);
}, { passive: false });

window.addEventListener('touchend', () => {
  onGestureEnd();
}, { passive: true });

window.addEventListener('touchcancel', () => {
  onGestureEnd();
}, { passive: true });

// Mouse Drag Events for Desktop Testing
window.addEventListener('mousedown', (e) => {
  // Only left-click drags
  if (e.button !== 0) return;
  // Don't intercept clicks inside modals or messenger widget
  if (e.target.closest('#commission-modal') || e.target.closest('#artifact-modal') || e.target.closest('#messenger-widget') || e.target.closest('#live-messenger-drawer')) return;
  onGestureStart(e.clientY, e.target);
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  onGestureMove(e.clientY);
});

window.addEventListener('mouseup', () => {
  if (isDragging) onGestureEnd();
});

// Trackpad / Mouse Wheel Support for Desktop
window.addEventListener('wheel', (e) => {
  if (document.getElementById('commission-modal')?.classList.contains('opacity-100') ||
      document.getElementById('artifact-modal')?.classList.contains('opacity-100') ||
      document.getElementById('live-messenger-drawer')?.classList.contains('opacity-100')) return;
  momentumVel = 0;
  const normalizedDelta = e.deltaY * 0.00085;
  targetProgress = Math.min(1, Math.max(0, targetProgress + normalizedDelta));
}, { passive: true });

// Modal Controllers
function openModal() {
  const modal = document.getElementById('commission-modal');
  if (modal) {
    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');
  }
}

function closeModal() {
  const modal = document.getElementById('commission-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('opacity-100');
  }
}

// =========================================================================
// KINETIC // 01 CYBER-PHYSICAL HARDWARE SYNTHESIZER ENGINE
// =========================================================================

class KineticHardwareSynth {
  constructor() {
    this.ctx = null;
    this.isPowered = false;
    this.osc1 = null;
    this.osc2 = null;
    this.subOsc = null;
    this.filter = null;
    this.driveNode = null;
    this.masterGain = null;
    this.analyser = null;
    this.dataArray = null;

    // Acoustic parameters
    this.cutoffFreq = 2400; // 20Hz - 18000Hz
    this.resonance = 7.5;   // Q factor
    this.waveform = 'sawtooth';
    this.driveMode = 'warm'; // 'clean', 'warm', 'overdrive'
    
    // Audition sequencer state
    this.isAuditioning = false;
    this.stepIndex = 0;
    this.arpInterval = null;
    this.bassPattern = [55, 55, 110, 55, 73.4, 55, 82.4, 65.4, 55, 55, 110, 98, 55, 82.4, 73.4, 65.4]; // Notes in Hz
    
    // Dial physics state
    this.dialAngle = 180; // 0 - 360 deg
    this.currentDetent = 12; // 0 to 23
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  togglePower(forceOn) {
    this.ensureContext();
    if (forceOn !== undefined) {
      this.isPowered = forceOn;
    } else {
      this.isPowered = !this.isPowered;
    }

    const toggle = document.getElementById('synth-power-toggle');
    const led = document.getElementById('crt-status-led');
    const overlay = document.getElementById('crt-standby-overlay');
    const readout = document.getElementById('crt-freq-readout');

    if (this.isPowered) {
      if (toggle) toggle.classList.add('analog-toggle-active');
      if (led) {
        led.classList.remove('bg-zinc-600');
        led.classList.add('bg-acid', 'shadow-[0_0_8px_#CCFF00]');
      }
      if (overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
      if (readout) readout.innerText = `${Math.round(this.cutoffFreq).toLocaleString()} Hz · CUTOFF ACTIVE`;
      
      this.playIgnitionHum();
      this.startSynthGraph();
      this.startAudition();
    } else {
      if (toggle) toggle.classList.remove('analog-toggle-active');
      if (led) {
        led.classList.remove('bg-acid', 'shadow-[0_0_8px_#CCFF00]');
        led.classList.add('bg-zinc-600');
      }
      if (overlay) overlay.classList.remove('opacity-0', 'pointer-events-none');
      if (readout) readout.innerText = `STANDBY // CLICK POWER`;
      
      this.stopAudition();
      this.stopSynthGraph();
    }
  }

  createDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  startSynthGraph() {
    if (!this.ctx || this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Analyser Node for CRT Screen
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // 2. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 3. Nonlinear Waveshaper (Drive)
    this.driveNode = this.ctx.createWaveShaper();
    this.updateDriveCurve();

    // 4. Resonant 24dB Ladder Lowpass Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(this.cutoffFreq, now);
    this.filter.Q.setValueAtTime(this.resonance, now);

    this.filter.connect(this.driveNode);
    this.driveNode.connect(this.masterGain);

    // 5. Dual Oscillators + Sub
    this.osc1 = this.ctx.createOscillator();
    this.osc2 = this.ctx.createOscillator();
    this.subOsc = this.ctx.createOscillator();

    this.osc1.type = this.waveform === 'fm' ? 'sawtooth' : this.waveform;
    this.osc2.type = 'sawtooth';
    this.subOsc.type = 'square';

    this.osc1.frequency.setValueAtTime(55, now);
    this.osc2.frequency.setValueAtTime(55.22, now); // Warm analog chorusing detune
    this.subOsc.frequency.setValueAtTime(27.5, now); // Sub-bass

    const osc1Gain = this.ctx.createGain();
    const osc2Gain = this.ctx.createGain();
    const subGain = this.ctx.createGain();

    osc1Gain.gain.setValueAtTime(0.45, now);
    osc2Gain.gain.setValueAtTime(0.35, now);
    subGain.gain.setValueAtTime(0.3, now);

    this.osc1.connect(osc1Gain);
    this.osc2.connect(osc2Gain);
    this.subOsc.connect(subGain);

    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    subGain.connect(this.filter);

    this.osc1.start(now);
    this.osc2.start(now);
    this.subOsc.start(now);
  }

  stopSynthGraph() {
    if (!this.masterGain || !this.ctx) return;
    try {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.osc1) this.osc1.stop();
      if (this.osc2) this.osc2.stop();
      if (this.subOsc) this.subOsc.stop();
    } catch(e) {}
    this.masterGain = null;
    this.filter = null;
  }

  playIgnitionHum() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const humOsc = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();

    humOsc.type = 'sawtooth';
    humOsc.frequency.setValueAtTime(60, now);
    humOsc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    humGain.gain.setValueAtTime(0.3, now);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    humOsc.connect(humGain);
    humGain.connect(this.ctx.destination);

    humOsc.start(now);
    humOsc.stop(now + 0.2);

    if (navigator.vibrate) {
      navigator.vibrate([15, 30, 20]);
    }
  }

  // Discrete 1.5ms Acoustic Transient on Mechanical Detent Crossing
  triggerDetentClick() {
    if (!this.ctx || !this.isPowered) return;
    try {
      const now = this.ctx.currentTime;
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      const clickFilter = this.ctx.createBiquadFilter();

      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(3400, now);

      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(900, now);
      clickOsc.frequency.exponentialRampToValueAtTime(140, now + 0.003);

      clickGain.gain.setValueAtTime(0.4, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.003);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      clickOsc.start(now);
      clickOsc.stop(now + 0.004);

      if (navigator.vibrate) {
        navigator.vibrate([8]);
      }
    } catch(e) {}
  }

  updateCutoff(angle) {
    // 0 deg -> 20 Hz, 360 deg -> 18000 Hz (exponential scale)
    this.dialAngle = Math.max(0, Math.min(360, angle));
    const normalized = this.dialAngle / 360;
    this.cutoffFreq = 20 * Math.pow(18000 / 20, normalized);

    if (this.filter && this.ctx) {
      this.filter.frequency.setTargetAtTime(this.cutoffFreq, this.ctx.currentTime, 0.015);
    }

    // Check 24 detent boundaries across 360 deg (15 deg per notch)
    const newDetent = Math.round(this.dialAngle / 15);
    if (newDetent !== this.currentDetent) {
      this.currentDetent = newDetent;
      this.triggerDetentClick();
    }

    // Update UI labels
    const readout = document.getElementById('dial-detent-readout');
    const freqReadout = document.getElementById('crt-freq-readout');
    if (readout) {
      readout.innerText = `${Math.round(this.cutoffFreq).toLocaleString()} Hz · DETENT ${this.currentDetent}/24`;
    }
    if (freqReadout && this.isPowered) {
      freqReadout.innerText = `${Math.round(this.cutoffFreq).toLocaleString()} Hz · CUTOFF ACTIVE`;
    }

    // Rotate dial face
    const dial = document.getElementById('synth-knurled-dial');
    if (dial) {
      dial.style.transform = `rotate(${this.dialAngle}deg)`;
    }
  }

  updateDriveCurve() {
    if (!this.driveNode) return;
    if (this.driveMode === 'clean') {
      this.driveNode.curve = null;
    } else if (this.driveMode === 'warm') {
      this.driveNode.curve = this.createDistortionCurve(20);
    } else if (this.driveMode === 'overdrive') {
      this.driveNode.curve = this.createDistortionCurve(120);
    }
  }

  setWaveform(type) {
    this.waveform = type;
    if (this.osc1) {
      this.osc1.type = type === 'fm' ? 'sawtooth' : type;
    }
    ['saw', 'square', 'sine', 'fm'].forEach((w) => {
      const btn = document.getElementById(`wave-${w}`);
      if (btn) {
        if (w === type || (w === 'square' && type === 'square') || (w === 'saw' && type === 'sawtooth')) {
          btn.className = 'py-1 rounded bg-acid text-black text-[9px] font-bold transition-all';
        } else {
          btn.className = 'py-1 rounded bg-white/10 text-zinc-300 hover:text-white text-[9px] font-bold transition-all';
        }
      }
    });
    this.triggerDetentClick();
  }

  setDrive(mode) {
    this.driveMode = mode;
    this.updateDriveCurve();
    ['clean', 'warm', 'overdrive'].forEach((d) => {
      const btn = document.getElementById(`drive-${d}`);
      if (btn) {
        if (d === mode) {
          btn.className = 'py-1 rounded bg-acid text-black text-[9px] font-bold transition-all';
        } else {
          btn.className = 'py-1 rounded bg-white/10 text-zinc-300 hover:text-white text-[9px] font-bold transition-all';
        }
      }
    });
    this.triggerDetentClick();
  }

  loadPreset(name) {
    if (!this.isPowered) {
      this.togglePower(true);
    }

    if (name === 'acid') {
      this.setWaveform('sawtooth');
      this.setDrive('warm');
      this.resonance = 14;
      this.updateCutoff(135); // ~1,200 Hz
    } else if (name === 'lead') {
      this.setWaveform('square');
      this.setDrive('overdrive');
      this.resonance = 6;
      this.updateCutoff(255); // ~6,800 Hz
    } else if (name === 'sizzle') {
      this.setWaveform('fm');
      this.setDrive('clean');
      this.resonance = 10;
      this.updateCutoff(315); // ~12,400 Hz
    }

    if (this.filter && this.ctx) {
      this.filter.Q.setValueAtTime(this.resonance, this.ctx.currentTime);
    }

    ['acid', 'lead', 'sizzle'].forEach((p) => {
      const btn = document.getElementById(`preset-${p}-btn`);
      if (btn) {
        if (p === name) {
          btn.className = 'px-2.5 py-1 rounded bg-acid text-black font-bold text-[9px] transition-all';
        } else {
          btn.className = 'px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-200 font-bold text-[9px] transition-all';
        }
      }
    });

    this.triggerDetentClick();
  }

  toggleAudition() {
    if (!this.isPowered) {
      this.togglePower(true);
      return;
    }
    if (this.isAuditioning) {
      this.stopAudition();
    } else {
      this.startAudition();
    }
  }

  startAudition() {
    if (!this.isPowered || this.isAuditioning) return;
    this.isAuditioning = true;
    const btn = document.getElementById('synth-audition-btn');
    const icon = document.getElementById('audition-icon');
    const label = document.getElementById('audition-label');
    if (btn) btn.className = 'mt-3 w-full py-2 rounded-lg bg-acid text-black font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-acid/20';
    if (icon) icon.innerText = '⏸';
    if (label) label.innerText = 'PAUSE AUDITION';

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    }

    this.stepIndex = 0;
    this.arpInterval = setInterval(() => {
      if (!this.isAuditioning || !this.ctx || !this.osc1) return;
      const noteHz = this.bassPattern[this.stepIndex % this.bassPattern.length];
      const now = this.ctx.currentTime;
      this.osc1.frequency.setValueAtTime(noteHz, now);
      this.osc2.frequency.setValueAtTime(noteHz * 1.004, now);
      this.subOsc.frequency.setValueAtTime(noteHz / 2, now);

      // Micro filter envelope pluck on each step
      if (this.filter) {
        const peakCutoff = Math.min(18000, this.cutoffFreq * 1.6);
        this.filter.frequency.setValueAtTime(peakCutoff, now);
        this.filter.frequency.exponentialRampToValueAtTime(this.cutoffFreq, now + 0.12);
      }

      this.stepIndex++;
    }, 135); // ~111 BPM 16th notes
  }

  stopAudition() {
    this.isAuditioning = false;
    clearInterval(this.arpInterval);
    this.arpInterval = null;

    const btn = document.getElementById('synth-audition-btn');
    const icon = document.getElementById('audition-icon');
    const label = document.getElementById('audition-label');
    if (btn) btn.className = 'mt-3 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all';
    if (icon) icon.innerText = '▶';
    if (label) label.innerText = 'AUDITION SYNTH BASS';

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

// Global Synth & Oscilloscope Handlers
let kineticSynth = null;
let crtAnimFrame = null;
let isDialInitialized = false;

function initKnurledDial() {
  if (isDialInitialized) return;
  const container = document.getElementById('knurled-cutoff-container');
  if (!container) return;
  isDialInitialized = true;

  let isDragging = false;
  let startAngle = 0;
  let startDialAngle = 0;

  function getPointerAngle(e) {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  }

  function onStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    startAngle = getPointerAngle(e);
    startDialAngle = kineticSynth ? kineticSynth.dialAngle : 180;
  }

  function onMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    const currentAngle = getPointerAngle(e);
    let delta = currentAngle - startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    let targetDialAngle = startDialAngle + delta;
    while (targetDialAngle < 0) targetDialAngle += 360;
    while (targetDialAngle > 360) targetDialAngle -= 360;

    if (kineticSynth) {
      kineticSynth.updateCutoff(targetDialAngle);
    }
  }

  function onEnd() {
    isDragging = false;
  }

  container.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  container.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
}

function startCRTOscilloscope() {
  const canvas = document.getElementById('crt-oscilloscope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  function renderCRT() {
    // 1. Phosphor Persistence Decay
    ctx.fillStyle = 'rgba(4, 9, 4, 0.24)';
    ctx.fillRect(0, 0, width, height);

    if (kineticSynth && kineticSynth.isPowered && kineticSynth.analyser && kineticSynth.dataArray) {
      kineticSynth.analyser.getByteTimeDomainData(kineticSynth.dataArray);

      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#39FF14';
      ctx.shadowColor = '#CCFF00';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const sliceWidth = width / kineticSynth.dataArray.length;
      let x = 0;

      for (let i = 0; i < kineticSynth.dataArray.length; i++) {
        const v = kineticSynth.dataArray[i] / 128.0; // 0.0 to 2.0
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    } else {
      // Idle Phosphor Beam Scanline
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.25)';
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      const midY = height / 2;
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
    }

    crtAnimFrame = requestAnimationFrame(renderCRT);
  }

  if (crtAnimFrame) cancelAnimationFrame(crtAnimFrame);
  crtAnimFrame = requestAnimationFrame(renderCRT);
}

// Controller Wrapper Handlers
function toggleSynthPower(forceOn) {
  if (!kineticSynth) kineticSynth = new KineticHardwareSynth();
  kineticSynth.togglePower(forceOn);
}

function setSynthWave(type) {
  if (!kineticSynth) kineticSynth = new KineticHardwareSynth();
  kineticSynth.setWaveform(type);
}

function setSynthDrive(mode) {
  if (!kineticSynth) kineticSynth = new KineticHardwareSynth();
  kineticSynth.setDrive(mode);
}

function loadSynthPreset(name) {
  if (!kineticSynth) kineticSynth = new KineticHardwareSynth();
  kineticSynth.loadPreset(name);
}

function toggleSynthAudition() {
  if (!kineticSynth) kineticSynth = new KineticHardwareSynth();
  kineticSynth.toggleAudition();
}

function preselectHardwareTier() {
  const scope = document.getElementById('commission-scope-select');
  const tier = document.getElementById('commission-tier-select');
  if (scope) scope.value = 'hardware-twin';
  if (tier) tier.value = 'tier-2';
}

function openArtifactModal(artifactId) {
  const modal = document.getElementById('artifact-modal');
  if (modal) {
    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');
    if (!kineticSynth) {
      kineticSynth = new KineticHardwareSynth();
    }
    initKnurledDial();
    startCRTOscilloscope();
  }
}

function closeArtifactModal() {
  const modal = document.getElementById('artifact-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('opacity-100');
    if (kineticSynth && kineticSynth.isAuditioning) {
      kineticSynth.stopAudition();
    }
  }
}

// Inquiry Form Handler
function handleInquiry(e) {
  e.preventDefault();
  const form = e.target;
  const success = document.getElementById('inquiry-success');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');
}

// =========================================================================
// 3D CHROME LIVE MESSENGER & FLOATING BUBBLE ENGINE
// =========================================================================
let bubbleEntered = false;
let targetMouseTiltX = 0;
let targetMouseTiltY = 0;
let smoothMouseTiltX = 0;
let smoothMouseTiltY = 0;
let isMessengerOpen = false;

// Mouse proximity magnetism for 3D chrome sphere
window.addEventListener('mousemove', (e) => {
  const widget = document.getElementById('messenger-widget');
  if (!widget) return;
  const rect = widget.getBoundingClientRect();
  const widgetCenterX = rect.left + rect.width / 2;
  const widgetCenterY = rect.top + rect.height / 2;
  
  const dx = e.clientX - widgetCenterX;
  const dy = e.clientY - widgetCenterY;
  const dist = Math.hypot(dx, dy);

  if (dist < 450) {
    targetMouseTiltY = Math.max(-26, Math.min(26, (dx / 450) * 26));
    targetMouseTiltX = Math.max(-20, Math.min(20, (-dy / 450) * 20));
  } else {
    targetMouseTiltX = 0;
    targetMouseTiltY = 0;
  }
});

// Update continuous 3D floating and specular tracking across all angles
function update3DChromeBubble(t) {
  if (!bubbleEntered) return;
  const bubble3D = document.getElementById('chrome-bubble-3d');
  const specular = document.getElementById('chrome-specular');
  const shadow = document.getElementById('chrome-bubble-shadow');
  if (!bubble3D || !specular || !shadow) return;

  // 3D harmonic positional floating in all directions
  const floatX = Math.sin(t * 0.0016) * 7.5 + Math.cos(t * 0.0028) * 3.5;
  const floatY = Math.cos(t * 0.0012) * 11.0 + Math.sin(t * 0.0033) * 4.0;
  const floatZ = Math.sin(t * 0.0019) * 12.0;

  // Smooth damping of mouse tilt
  smoothMouseTiltX += (targetMouseTiltX - smoothMouseTiltX) * 0.08;
  smoothMouseTiltY += (targetMouseTiltY - smoothMouseTiltY) * 0.08;

  // 3D Euler angular rotations across ALL angles (pitch, yaw, roll)
  const rotX = Math.sin(t * 0.0014) * 15.0 + smoothMouseTiltX;
  const rotY = Math.cos(t * 0.0018) * 22.0 + smoothMouseTiltY;
  const rotZ = Math.sin(t * 0.0011) * 11.0;

  bubble3D.style.transform = `translate3d(${floatX.toFixed(2)}px, ${floatY.toFixed(2)}px, ${floatZ.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`;

  // Optical specular reflection moves opposite to sphere tilt
  const specX = -rotY * 0.5;
  const specY = -rotX * 0.5;
  specular.style.transform = `translate(${specX.toFixed(2)}px, ${specY.toFixed(2)}px) rotate(-25deg)`;

  // Dynamic floor contact shadow response
  const shadowScale = 1 - (floatY / 60);
  const shadowOpacity = 0.65 - (floatY / 80);
  shadow.style.transform = `translate3d(${(floatX * 0.6).toFixed(2)}px, 0px, 0px) scale(${Math.max(0.65, Math.min(1.35, shadowScale)).toFixed(2)})`;
  shadow.style.opacity = Math.max(0.25, Math.min(0.85, shadowOpacity)).toFixed(2);
}

// Blown-In Bubble Entrance Sequence
function triggerBubbleEntrance() {
  const bubble3D = document.getElementById('chrome-bubble-3d');
  const container = document.getElementById('bubble-particles-container');
  if (!bubble3D || !container) return;

  // Cluster of micro-bubbles blown in from edge
  const bubbleSpecs = [
    { size: 14, tx15: -15, ty15: -25, tx75: -55, ty75: -90, tx92: -70, ty92: -110, txEnd: -75, tyEnd: -115, delay: 0 },
    { size: 22, tx15: -20, ty15: -35, tx75: -80, ty75: -130, tx92: -95, ty92: -150, txEnd: -105, tyEnd: -160, delay: 120 },
    { size: 10, tx15: -10, ty15: -20, tx75: -40, ty75: -70, tx92: -50, ty92: -85, txEnd: -55, tyEnd: -90, delay: 220 },
    { size: 18, tx15: -25, ty15: -30, tx75: -70, ty75: -80, tx92: -85, ty92: -95, txEnd: -90, tyEnd: -100, delay: 350 },
    { size: 12, tx15: -8, ty15: -18, tx75: -30, ty75: -110, tx92: -40, ty92: -130, txEnd: -45, tyEnd: -135, delay: 480 },
  ];

  bubbleSpecs.forEach((spec) => {
    setTimeout(() => {
      spawnSingleBlownBubble(spec);
    }, spec.delay);
  });

  // Elastic inflation of main 3D chrome bubble
  setTimeout(() => {
    bubble3D.style.transition = 'transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
    bubble3D.style.opacity = '1';
    bubble3D.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

    setTimeout(() => {
      bubble3D.style.transition = '';
      bubbleEntered = true;
    }, 950);
  }, 450);
}

function spawnSingleBlownBubble(spec) {
  const container = document.getElementById('bubble-particles-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'blown-bubble-particle';
  el.style.width = spec.size + 'px';
  el.style.height = spec.size + 'px';
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.setProperty('--tx-15', spec.tx15 + 'px');
  el.style.setProperty('--ty-15', spec.ty15 + 'px');
  el.style.setProperty('--tx-75', spec.tx75 + 'px');
  el.style.setProperty('--ty-75', spec.ty75 + 'px');
  el.style.setProperty('--tx-92', spec.tx92 + 'px');
  el.style.setProperty('--ty-92', spec.ty92 + 'px');
  el.style.setProperty('--tx-end', spec.txEnd + 'px');
  el.style.setProperty('--ty-end', spec.tyEnd + 'px');

  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2300);
}

// Periodic Ambient Micro-Bubble Drift
function scheduleAmbientBubbles() {
  setInterval(() => {
    if (!bubbleEntered) return;
    const randomSpec = {
      size: 10 + Math.floor(Math.random() * 12),
      tx15: -10 - Math.random() * 15,
      ty15: -20 - Math.random() * 20,
      tx75: -40 - Math.random() * 50,
      ty75: -80 - Math.random() * 70,
      tx92: -55 - Math.random() * 60,
      ty92: -100 - Math.random() * 80,
      txEnd: -60 - Math.random() * 65,
      tyEnd: -110 - Math.random() * 85,
    };
    spawnSingleBlownBubble(randomSpec);
  }, 6500);
}

// Live Messenger Drawer Controller
function toggleLiveMessenger() {
  const drawer = document.getElementById('live-messenger-drawer');
  const chatGlyph = document.getElementById('messenger-glyph-chat');
  const closeGlyph = document.getElementById('messenger-glyph-close');
  const livePulse = document.getElementById('messenger-live-pulse');
  if (!drawer) return;

  isMessengerOpen = !isMessengerOpen;

  if (isMessengerOpen) {
    drawer.classList.remove('pointer-events-none', 'opacity-0', 'translate-y-4', 'scale-95');
    drawer.classList.add('opacity-100', 'translate-y-0', 'scale-100');
    if (chatGlyph) chatGlyph.classList.add('hidden');
    if (closeGlyph) closeGlyph.classList.remove('hidden');
    if (livePulse) livePulse.classList.add('opacity-40');
  } else {
    drawer.classList.add('pointer-events-none', 'opacity-0', 'translate-y-4', 'scale-95');
    drawer.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    if (chatGlyph) chatGlyph.classList.remove('hidden');
    if (closeGlyph) closeGlyph.classList.add('hidden');
    if (livePulse) livePulse.classList.remove('opacity-40');
  }
}

function handleLiveDispatch(e) {
  e.preventDefault();
  const form = document.getElementById('live-dispatch-form');
  const success = document.getElementById('dispatch-success-state');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  if (navigator.vibrate) {
    navigator.vibrate([15, 30, 20]);
  }
}

// Dismiss live messenger drawer on outside click
window.addEventListener('click', (e) => {
  if (!isMessengerOpen) return;
  if (!e.target.closest('#live-messenger-drawer') && !e.target.closest('#messenger-widget')) {
    toggleLiveMessenger();
  }
});

// Initialization
function init() {
  drawFrame(1);
  updateTextDrum(0);
  updateTopBar(0);
  renderLoop();

  // Trigger bubble entrance and ambient particle scheduler
  setTimeout(() => {
    triggerBubbleEntrance();
    scheduleAmbientBubbles();
  }, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
