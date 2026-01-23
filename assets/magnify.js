// Zoom configuration
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const DESKTOP_INITIAL_ZOOM = 2;
const MOBILE_INITIAL_ZOOM = 1.2;

function isMobile() {
  return window.innerWidth <= 749;
}

function getInitialZoom() {
  return isMobile() ? MOBILE_INITIAL_ZOOM : DESKTOP_INITIAL_ZOOM;
}

// State for current zoom session
let currentZoomRatio = getInitialZoom();
let currentOverlay = null;
let currentImage = null;

// Touch state
let initialPinchDistance = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let backgroundPosX = 50;
let backgroundPosY = 50;

// create a container and set the full-size image as its background
function createOverlay(image) {
  const overlayImage = document.createElement('img');
  overlayImage.setAttribute('src', `${image.src}`);
  const overlay = document.createElement('div');
  prepareOverlay(overlay, overlayImage);

  image.style.opacity = '50%';
  toggleLoadingSpinner(image);

  overlayImage.onload = () => {
    toggleLoadingSpinner(image);
    image.parentElement.insertBefore(overlay, image);
    image.style.opacity = '100%';
  };

  return overlay;
}

function prepareOverlay(container, image) {
  container.setAttribute('class', 'image-magnify-full-size');
  container.setAttribute('aria-hidden', 'true');
  container.style.backgroundImage = `url('${image.src}')`;
  container.style.backgroundColor = 'var(--gradient-background)';
  container.style.touchAction = 'none'; // Prevent default touch behaviors
}

function toggleLoadingSpinner(image) {
  const loadingSpinner = image.parentElement.parentElement.querySelector(`.loading__spinner`);
  loadingSpinner.classList.toggle('hidden');
}

function updateBackgroundPosition(overlay, xPercent, yPercent, image, zoomRatio) {
  overlay.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
  overlay.style.backgroundSize = `${image.width * zoomRatio}px`;
}

function moveWithHover(image, event, zoomRatio) {
  // calculate mouse position
  const ratio = image.height / image.width;
  const container = event.target.getBoundingClientRect();
  const xPosition = event.clientX - container.left;
  const yPosition = event.clientY - container.top;
  const xPercent = xPosition / (image.clientWidth / 100);
  const yPercent = yPosition / ((image.clientWidth * ratio) / 100);

  // Update global position state
  backgroundPosX = xPercent;
  backgroundPosY = yPercent;

  // determine what to show in the frame
  updateBackgroundPosition(currentOverlay, xPercent, yPercent, image, zoomRatio);
}

function handleWheel(event) {
  event.preventDefault();

  // Zoom in or out based on scroll direction
  if (event.deltaY < 0) {
    currentZoomRatio = Math.min(MAX_ZOOM, currentZoomRatio + ZOOM_STEP);
  } else {
    currentZoomRatio = Math.max(MIN_ZOOM, currentZoomRatio - ZOOM_STEP);
  }

  // Update the zoom level
  updateBackgroundPosition(currentOverlay, backgroundPosX, backgroundPosY, currentImage, currentZoomRatio);
}

function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleTouchStart(event) {
  if (event.touches.length === 2) {
    // Pinch gesture start
    event.preventDefault();
    initialPinchDistance = getDistance(event.touches[0], event.touches[1]);
  } else if (event.touches.length === 1) {
    // Single touch for panning
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  }
}

function handleTouchMove(event) {
  event.preventDefault();

  if (event.touches.length === 2) {
    // Pinch gesture
    const currentDistance = getDistance(event.touches[0], event.touches[1]);
    const scale = currentDistance / initialPinchDistance;

    if (scale > 1.05) {
      currentZoomRatio = Math.min(MAX_ZOOM, currentZoomRatio + ZOOM_STEP * 0.1);
      initialPinchDistance = currentDistance;
    } else if (scale < 0.95) {
      currentZoomRatio = Math.max(MIN_ZOOM, currentZoomRatio - ZOOM_STEP * 0.1);
      initialPinchDistance = currentDistance;
    }

    updateBackgroundPosition(currentOverlay, backgroundPosX, backgroundPosY, currentImage, currentZoomRatio);
  } else if (event.touches.length === 1) {
    // Single touch pan
    const touch = event.touches[0];
    const container = currentOverlay.getBoundingClientRect();

    const deltaX = (lastTouchX - touch.clientX) / container.width * 100 * (currentZoomRatio / 2);
    const deltaY = (lastTouchY - touch.clientY) / container.height * 100 * (currentZoomRatio / 2);

    backgroundPosX = Math.max(0, Math.min(100, backgroundPosX + deltaX));
    backgroundPosY = Math.max(0, Math.min(100, backgroundPosY + deltaY));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    updateBackgroundPosition(currentOverlay, backgroundPosX, backgroundPosY, currentImage, currentZoomRatio);
  }
}

function handleTouchEnd(event) {
  if (event.touches.length === 0 && event.changedTouches.length === 1) {
    // Check if it was a tap (not a pan or pinch)
    const touchDuration = event.timeStamp - (event.target.touchStartTime || 0);
    if (touchDuration < 200) {
      cleanupOverlay();
    }
  }
  initialPinchDistance = 0;
}

function cleanupOverlay() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
    currentImage = null;
    currentZoomRatio = getInitialZoom();
    backgroundPosX = 50;
    backgroundPosY = 50;
  }
}

function magnify(image) {
  // Reset state for new zoom session
  currentZoomRatio = getInitialZoom();
  currentImage = image;
  backgroundPosX = 50;
  backgroundPosY = 50;

  const overlay = createOverlay(image);
  currentOverlay = overlay;

  // Mouse events
  overlay.onclick = () => cleanupOverlay();
  overlay.onmousemove = (event) => moveWithHover(image, event, currentZoomRatio);
  overlay.onmouseleave = () => cleanupOverlay();

  // Mouse wheel zoom
  overlay.addEventListener('wheel', handleWheel, { passive: false });

  // Touch events
  overlay.addEventListener('touchstart', (event) => {
    event.target.touchStartTime = event.timeStamp;
    handleTouchStart(event);
  }, { passive: false });
  overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
  overlay.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function enableZoomOnHover() {
  const images = document.querySelectorAll('.image-magnify-hover');
  images.forEach((image) => {
    image.onclick = (event) => {
      magnify(image);
      moveWithHover(image, event, currentZoomRatio);
    };

    // Also support touch tap to open zoom
    image.addEventListener('touchend', (event) => {
      if (event.changedTouches.length === 1) {
        event.preventDefault();
        magnify(image);
        // Set initial position to center
        backgroundPosX = 50;
        backgroundPosY = 50;
        updateBackgroundPosition(currentOverlay, backgroundPosX, backgroundPosY, image, currentZoomRatio);
      }
    }, { passive: false });
  });
}

enableZoomOnHover();
