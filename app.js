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
  // ~1.5x screen height to comfortably swipe through all 120 frames
  return Math.max(750, window.innerHeight * 1.5);
}

// 5. Continuous render loop with inertia
function renderLoop() {
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
  if (target && target.closest('#commission-modal')) return;

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
  // Don't intercept clicks inside the modal form
  if (e.target.closest('#commission-modal')) return;
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
  if (document.getElementById('commission-modal')?.classList.contains('opacity-100')) return;
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

// Inquiry Form Handler
function handleInquiry(e) {
  e.preventDefault();
  const form = e.target;
  const success = document.getElementById('inquiry-success');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');
}

// Initialization
function init() {
  drawFrame(1);
  updateTextDrum(0);
  updateTopBar(0);
  renderLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
