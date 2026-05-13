import { getDomElements } from './core/domElements.js';

const dom = getDomElements();
const appState = {
  menuActive: false,
  originalPitch: 0,
  works: []
};

function isFocused(elem) {
  return elem.classList.contains('focused');
}

function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE8E8E8);
  scene.fog = new THREE.Fog(0xE8E8E8, 10, 50);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(0, 2, 5);
  appState.originalPitch = camera.rotation.x;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  return { scene, camera, renderer };
}

function initLighting(scene) {
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
}

function createEnvironment(scene, camera) {
  const terrainSize = 50;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 50, 50);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x151515 });
  const terrains = new Map();

  const rainPool = [];
  const rainArea = { width: 50, depth: 50, height: 50 };
  const rainSpeed = 40;

  function getTerrainHeight(x, z) {
    return Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.5 + Math.cos(x * 0.15) * Math.sin(z * 0.15) * 1.2 + Math.sin((x + z) * 0.05) * 2.0;
  }

  function generateHills(geo, offsetX, offsetZ) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const worldX = pos.getX(i) + offsetX;
      const worldZ = pos.getZ(i) + offsetZ;
      pos.setY(i, getTerrainHeight(worldX, worldZ));
    }
    pos.needsUpdate = true;
  }

  function createTile(x, z) {
    const key = `${x},${z}`;
    if (terrains.has(key)) return;
    const tile = new THREE.Mesh(terrainGeo.clone(), terrainMat);
    generateHills(tile.geometry, x, z);
    tile.position.set(x, 0, z);
    tile.receiveShadow = true;
    scene.add(tile);
    terrains.set(key, tile);
  }

  function updateTiles() {
    const camX = Math.floor(camera.position.x / terrainSize) * terrainSize;
    const camZ = Math.floor(camera.position.z / terrainSize) * terrainSize;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) createTile(camX + i * terrainSize, camZ + j * terrainSize);
  }

  function createRainDrop() {
    const geometry = new THREE.PlaneGeometry(0.02, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xBBBBBB });
    const drop = new THREE.Mesh(geometry, material);
    drop.rotation.y = -Math.PI / 2;
    drop.material.transparent = true;
    return drop;
  }

  for (let i = 0; i < 600; i++) {
    const drop = createRainDrop();
    drop.position.x = camera.position.x + (Math.random() - 0.5) * rainArea.width;
    drop.position.y = camera.position.y + (Math.random() - 0.5) * rainArea.height;
    drop.position.z = camera.position.z + (Math.random() - 0.5) * rainArea.depth;
    rainPool.push(drop);
    scene.add(drop);
  }

  function updateRainDrops(delta) {
    for (const drop of rainPool) {
      if (appState.menuActive && drop.material.opacity > 0.0) drop.material.opacity -= 0.05;
      else if (!appState.menuActive && drop.material.opacity < 1.0) drop.material.opacity += 0.05;
      drop.position.y -= rainSpeed * delta;
      if (drop.position.y < camera.position.y - rainArea.height / 2) {
        drop.position.y = camera.position.y + rainArea.height / 2;
        drop.position.x = camera.position.x + (Math.random() - 0.5) * rainArea.width;
        drop.position.z = camera.position.z + (Math.random() - 0.5) * rainArea.depth;
      }
      if (Math.abs(drop.position.x - camera.position.x) > rainArea.width / 2) drop.position.x = camera.position.x + (Math.random() - 0.5) * rainArea.width;
      if (Math.abs(drop.position.z - camera.position.z) > rainArea.depth / 2) drop.position.z = camera.position.z + (Math.random() - 0.5) * rainArea.depth;
      drop.quaternion.copy(camera.quaternion);
    }
  }

  return { getTerrainHeight, updateTiles, updateRainDrops, terrains, terrainSize };
}

function rearrangeWorks() {
  dom.worksCol1.innerHTML = '';
  dom.worksCol2.innerHTML = '';
  dom.worksCol1.appendChild(dom.headerBox);
  if (window.innerWidth < 1024) appState.works.forEach(item => dom.worksCol1.appendChild(item));
  else appState.works.forEach((item, i) => (i % 2 ? dom.worksCol1 : dom.worksCol2).appendChild(item));
}

function initWorks() {
  fetch('selected-works.json').then(r => r.json()).then(data => {
    data.works.forEach(work => {
      const workElem = document.createElement('div');
      workElem.className = 'workItem hidden';
      workElem.dataset.title = work.title;
      workElem.dataset.medium = work.medium;
      workElem.dataset.size = work.size;
      workElem.dataset.year = work.year;
      const img = document.createElement('img');
      img.src = `works/${work.filename}`;
      img.alt = work.title;
      workElem.appendChild(img);
      const dataBlock = document.createElement('div');
      dataBlock.className = 'dataBlock';
      dataBlock.innerHTML = `${work.title}</br>${work.medium}</br>${work.size}</br>${work.year}`;
      workElem.appendChild(dataBlock);
      appState.works.push(workElem);
    });
    rearrangeWorks();
  }).catch(error => console.error('Error loading selected-works.json:', error));
  window.addEventListener('resize', rearrangeWorks);
}

function setupMenu() {
  const pairs = [
    [dom.aboutButton, dom.aboutContent],
    [dom.contactButton, dom.contactContent],
    [dom.pressButton, dom.pressContent],
    [dom.selectedWorksButton, dom.selectedWorksContent]
  ];

  function showMenuItem(button, content, shouldShow = true) {
    if (shouldShow) {
      appState.menuActive = true;
      button.classList.add('focused');
      if (button !== dom.selectedWorksButton) content.classList.remove('hidden');
    } else {
      button.classList.remove('focused');
      if (button !== dom.selectedWorksButton) content.classList.add('hidden');
    }
  }

  function showMenu(shouldShow) {
    appState.menuActive = shouldShow;
    dom.menuCatcher.classList.toggle('hidden', !shouldShow);
    dom.menuContent.classList.toggle('fastHidden', !shouldShow);
    dom.menuContent.classList.toggle('fade', !shouldShow);
    if (!shouldShow) pairs.forEach(([button]) => button.classList.remove('focused'));
  }

  function showSection(activeButton) {
    if (isFocused(activeButton)) return showMenu(false);
    if (!appState.menuActive) showMenu(true);
    pairs.forEach(([button, content]) => showMenuItem(button, content, button === activeButton));

    const works = document.querySelectorAll('.workItem');
    const showWorks = activeButton === dom.selectedWorksButton;
    works.forEach(el => {
      el.classList.toggle('fade', showWorks);
      el.classList.toggle('fastHidden', showWorks);
      el.classList.toggle('hidden', !showWorks);
    });
    if (showWorks) rearrangeWorks();
  }

  dom.aboutButton.addEventListener('click', () => showSection(dom.aboutButton));
  dom.contactButton.addEventListener('click', () => showSection(dom.contactButton));
  dom.pressButton.addEventListener('click', () => showSection(dom.pressButton));
  dom.selectedWorksButton.addEventListener('click', () => showSection(dom.selectedWorksButton));
  dom.menuCatcher.addEventListener('click', () => showMenu(false));

  dom.shopButton.addEventListener('click', () => {
    const shopLink = document.createElement('a');
    shopLink.target = '_blank';
    shopLink.href = 'https://www.artsy.net/artist/eduardo-enrique';
    shopLink.click();
  });

  function submitForm() {
    fetch(dom.subscribeForm.action, { method: dom.subscribeForm.method, mode: 'no-cors', body: new FormData(dom.subscribeForm) })
      .then(() => { dom.subscribeInput.value = ''; })
      .catch(error => console.error('Error submitting form:', error));
  }

  dom.subscribeButton.addEventListener('click', submitForm);
  dom.subscribeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); submitForm(); }
  });

  return { showMenu };
}

function boot() {
  const { scene, camera, renderer } = initScene();
  initLighting(scene);
  const env = createEnvironment(scene, camera);
  const { showMenu } = setupMenu();
  initWorks();

  const loader = new THREE.GLTFLoader();
  const progress = { hi: 0, mid: 0, low: 0, billboard: 0 };
  const loadModel = (url, key) => new Promise((resolve, reject) => {
    loader.load(url, gltf => resolve(gltf), xhr => {
      if (xhr.lengthComputable) {
        progress[key] = xhr.loaded / xhr.total;
        const pct = ((progress.hi + progress.mid + progress.low + progress.billboard) / 4) * 100;
        dom.loadingAmt.innerHTML = `${Math.floor(pct)}%`;
      }
    }, reject);
  });

  Promise.all([loadModel('bat_hi.glb', 'hi'), loadModel('bat_mid.glb', 'mid'), loadModel('bat_low.glb', 'low'), loadModel('billboard.glb', 'billboard')])
    .then(([batHi, batMid, batLow, billboard]) => {
      dom.loadingAmt.innerHTML = '100%';
      dom.loadingAmt.classList.add('fastHidden');
      dom.consentBox.classList.add('fade');
      dom.consentBox.classList.remove('hidden');
      dom.acknowledge.addEventListener('click', () => {
        dom.loadingAmt.classList.add('hidden');
        dom.loadingScreen.classList.add('hiddenLoader');
        setTimeout(() => dom.loadingScreen.remove(), 1000);
      });
      dom.takeMeBack.addEventListener('click', () => { document.location = 'https://nicktitle.github.io/meadowtext?text=%20'; });
      showMenu(false);

      const batTemplates = [batHi.scene, batMid.scene, batLow.scene];
      const bats = [];
      const batCount = 36;
      const spawnRadius = 28;

      for (let i = 0; i < batCount; i++) {
        const batRoot = batTemplates[i % batTemplates.length].clone(true);
        batRoot.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
            if (child.material) child.material = child.material.clone();
          }
        });

        const angle = Math.random() * Math.PI * 2;
        const radius = spawnRadius * (0.35 + Math.random() * 0.75);
        const spawnX = camera.position.x + Math.cos(angle) * radius;
        const spawnZ = camera.position.z + Math.sin(angle) * radius;
        const baseY = env.getTerrainHeight(spawnX, spawnZ) + 3 + Math.random() * 7;
        const heading = Math.random() * Math.PI * 2;
        const flapPhase = Math.random() * Math.PI * 2;

        batRoot.position.set(spawnX, baseY, spawnZ);
        batRoot.rotation.set(0, heading, 0);
        bats.push({ batRoot, baseY, flapPhase });
        scene.add(batRoot);
      }

      const billboardRoot = billboard.scene;
      billboardRoot.scale.setScalar(1.5);
      billboardRoot.position.set(0, env.getTerrainHeight(0, 0) + 2.2, -8);
      billboardRoot.rotation.y = Math.PI;
      billboardRoot.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(billboardRoot);

      let forwardVel = 0, rotationVel = 0, isDragging = false, prevX = 0, prevY = 0;
      const onDragStart = (x, y) => { isDragging = true; prevX = x; prevY = y; };
      const onDragMove = (x, y) => {
        if (!isDragging || appState.menuActive) return;
        rotationVel = (x - prevX) * 0.0025;
        forwardVel = (y - prevY) * 0.01;
        prevX = x; prevY = y;
      };
      const onDragEnd = () => { isDragging = false; forwardVel = rotationVel = 0; };
      window.addEventListener('mousedown', e => onDragStart(e.clientX, e.clientY));
      window.addEventListener('mousemove', e => onDragMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onDragEnd);

      let lastTime = performance.now();
      function animate() {
        requestAnimationFrame(animate);
        const currentTime = performance.now();
        let delta = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        if (camera.userData.yaw === undefined) {
          const initialEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
          camera.userData.yaw = initialEuler.y;
          camera.userData.pitch = initialEuler.x;
        }
        camera.userData.yaw += rotationVel;
        camera.userData.pitch = THREE.MathUtils.lerp(camera.userData.pitch, appState.menuActive ? Math.PI / 2 : appState.originalPitch, 0.02);
        camera.quaternion.setFromEuler(new THREE.Euler(camera.userData.pitch, camera.userData.yaw, 0, 'YXZ'));
        camera.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize(), forwardVel);
        camera.position.y = env.getTerrainHeight(camera.position.x, camera.position.z) + 2.5;
        env.updateTiles();
        env.updateRainDrops(delta);

        for (const bat of bats) {
          const wingBounce = Math.sin(currentTime * 0.008 + bat.flapPhase) * 0.12;
          bat.batRoot.position.y = bat.baseY + wingBounce;
        }

        billboardRoot.position.x = camera.position.x + Math.sin(camera.userData.yaw) * 12;
        billboardRoot.position.z = camera.position.z + Math.cos(camera.userData.yaw) * 12;
        billboardRoot.position.y = env.getTerrainHeight(billboardRoot.position.x, billboardRoot.position.z) + 2.2;
        billboardRoot.lookAt(camera.position.x, billboardRoot.position.y, camera.position.z);

        renderer.render(scene, camera);
      }
      animate();
      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
      env.updateTiles();
    })
    .catch(err => console.error('Error loading models:', err));
}

boot();
