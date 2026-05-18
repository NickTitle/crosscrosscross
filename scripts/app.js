import { getAppElements } from './dom.js';
import { getCanvasSize, keepSafariChromePainted, syncAppHeight } from './viewport.js';
import { createSelectedWorks } from './selected-works.js';
import { createUiController } from './ui-controller.js';
import { createRainSystem } from './rain.js';
import { createTerrainSystem } from './terrain.js';
import { loadSceneModels } from './model-loader.js';
import { createBatSystem } from './bat-system.js';

const THREE = window.THREE;

if (!THREE) {
  throw new Error('Three.js failed to load.');
}

syncAppHeight();

// Scene, camera, renderer.
const canvasSize = getCanvasSize();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE8E8E8);
scene.fog = new THREE.Fog(0xE8E8E8, 10, 50);
const camera = new THREE.PerspectiveCamera(75, canvasSize.width / canvasSize.height, 0.01, 1000);
camera.position.set(0, 2, 5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(canvasSize.width, canvasSize.height, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const renderedCanvasSize = getCanvasSize(renderer.domElement);
camera.aspect = renderedCanvasSize.width / renderedCanvasSize.height;
camera.updateProjectionMatrix();
renderer.setSize(renderedCanvasSize.width, renderedCanvasSize.height, false);
const appState = { menuActive: false };
let originalPitch = camera.rotation.x;
const rain = createRainSystem({ THREE, scene, camera, state: appState });

// Lighting.
const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.mapSize.set(4096, 4096);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 1));

const terrain = createTerrainSystem({ THREE, scene });

const elements = getAppElements();
const {
  loadingAmt,
  worksCol1,
  worksCol2,
} = elements;
const selectedWorks = createSelectedWorks({
  firstColumn: worksCol1,
  secondColumn: worksCol2,
});

function updateLoadingProgress(progress) {
  loadingAmt.textContent = `${Math.floor(progress * 100)}%`;
}

loadSceneModels({ THREE, onProgress: updateLoadingProgress }).then(models => {
  const bats = createBatSystem({
    THREE,
    scene,
    camera,
    terrain,
    models: {
      batHi: models.batHi.scene,
      batMid: models.batMid.scene,
      batLow: models.batLow.scene,
      billboard: models.billboard.scene,
    },
  });

  // Camera drag controls.
  let forwardVel = 0, rotationVel = 0, isDragging = false, prevX = 0, prevY = 0;
  function onDragStart(x, y) { isDragging = true; prevX = x; prevY = y; }
  function onDragMove(x, y) {
    if (!isDragging || appState.menuActive) return;
    const deltaX = x - prevX, deltaY = y - prevY;
    rotationVel = deltaX * 0.0025;
    forwardVel = deltaY * 0.01;
    prevX = x; prevY = y;
  }
  function onDragEnd() { isDragging = false; forwardVel = rotationVel = 0; }
  window.addEventListener('mousedown', e => onDragStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onDragMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onDragEnd);

  // Touch event handlers.
  let touchStartedOnScene = false;
  function isUiTarget(target) {
    return !!target.closest('#loadingScreen, #menuContent, #menuCatcher, input, label, a, .menuItem');
  }
  function handleTouchStart(e) {
    if (e.touches.length !== 1 || appState.menuActive || isUiTarget(e.target)) {
      touchStartedOnScene = false;
      return;
    }

    touchStartedOnScene = true;
    e.preventDefault();
    const touch = e.touches[0];
    onDragStart(touch.clientX, touch.clientY);
  }
  function handleTouchMove(e) {
    if (!touchStartedOnScene || e.touches.length !== 1 || appState.menuActive) return;

    e.preventDefault();
    const touch = e.touches[0];
    onDragMove(touch.clientX, touch.clientY);
  }
  function handleTouchEnd() {
    onDragEnd();
    touchStartedOnScene = false;
  }
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);

  // Main animation loop.
  let lastTime = performance.now();
  let batTime = 0;
  let sceneStarted = false;
  function renderFrame(delta) {
    batTime += delta;

    // Initialize yaw and pitch if not already set.
    if (camera.userData.yaw === undefined) {
      const initialEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      camera.userData.yaw = initialEuler.y;
      camera.userData.pitch = initialEuler.x;
    }

    const lerpFactor = 0.02; // Adjust for panning speed

    // Update yaw (rotation around the Y-axis).
    camera.userData.yaw += rotationVel;

    // Determine target pitch.
    const targetPitch = appState.menuActive ? Math.PI / 2 : originalPitch;

    // Lerp the pitch to smoothly interpolate.
    camera.userData.pitch = THREE.MathUtils.lerp(camera.userData.pitch, targetPitch, lerpFactor);

    // Rebuild the quaternion from yaw and pitch (with roll set to 0).
    const newEuler = new THREE.Euler(camera.userData.pitch, camera.userData.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(newEuler);

    // Calculate the forward direction based on the updated quaternion.
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    camera.position.addScaledVector(forwardDir, forwardVel);

    // Adjust the height based on terrain.
    camera.position.y = terrain.getHeight(camera.position.x, camera.position.z) + 2.5;


    terrain.updateVisibleTiles(camera);
    bats.update(batTime);
    rain.update(delta);

    renderer.render(scene, camera);
  }

  function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    let delta = (currentTime - lastTime) / 1000; // seconds
    delta = Math.min(delta, 0.1);
    lastTime = currentTime;
    renderFrame(delta);
  }

  function startScene() {
    if (sceneStarted) return;

    sceneStarted = true;
    keepSafariChromePainted();
    renderFrame(0);
    window.setTimeout(function () {
      lastTime = performance.now();
      animate();
    }, 1000);
  }

  function resizeViewport() {
    const { width, height } = getCanvasSize();
    syncAppHeight();
    if (sceneStarted) {
      keepSafariChromePainted();
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener('resize', resizeViewport);
  window.visualViewport?.addEventListener('resize', resizeViewport);
  terrain.updateVisibleTiles(camera);
  renderFrame(0);

  const ui = createUiController({
    elements,
    selectedWorks,
    state: appState,
    onAccept: startScene,
  });
  ui.showLoadingComplete();
  ui.bindEvents();
}).catch(err => console.error('Error loading models:', err));

selectedWorks.load()
  .catch(error => console.error('Error loading selected-works.json:', error));
