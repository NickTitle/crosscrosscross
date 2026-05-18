export function getViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width || window.innerWidth),
    height: Math.round(viewport?.height || window.innerHeight)
  };
}

export function getCanvasSize(canvas = document.querySelector('canvas')) {
  if (canvas) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width && bounds.height) {
      return {
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      };
    }
  }

  return {
    width: Math.round(window.innerWidth),
    height: Math.round(window.innerHeight)
  };
}

export function syncAppHeight() {
  const { height } = getViewportSize();
  document.documentElement.style.setProperty('--app-height', `${height}px`);

  const screenCssHeight = screen.height * (window.innerWidth / screen.width);
  const canvasHeight = Math.ceil(Math.max(
    height,
    window.innerHeight,
    document.documentElement.clientHeight,
    screen.height,
    Number.isFinite(screenCssHeight) ? screenCssHeight : 0
  ));
  document.documentElement.style.setProperty('--canvas-height', `${canvasHeight}px`);

  const extraCanvasHeight = Math.max(0, canvasHeight - height);
  const isTouchViewport = navigator.maxTouchPoints > 0 && window.visualViewport;
  const topOverscan = isTouchViewport
    ? Math.ceil(Math.max(48, Math.min(120, extraCanvasHeight * 0.4)))
    : 0;
  document.documentElement.style.setProperty('--canvas-top-overscan', `${topOverscan}px`);
  document.documentElement.style.setProperty('--canvas-top-offset', `${-topOverscan}px`);
  document.documentElement.style.setProperty('--page-scroll-slack', `${topOverscan + 1}px`);
}

export function keepSafariChromePainted() {
  if (navigator.maxTouchPoints > 0 && window.visualViewport && window.scrollY === 0) {
    window.scrollTo(0, 1);
  }
}
