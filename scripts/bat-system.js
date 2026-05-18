const INITIAL_POOL_SIZE = 500;
const SINE_TABLE_SIZE = 4096;
const SINE_TABLE_MASK = SINE_TABLE_SIZE - 1;
const BAT_MOTION_SPEED_SCALE = 0.5;

function createSimpleCross(THREE) {
  const crossMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x82531D });
  const simple = new THREE.Group();
  const simpleMaterial = crossMaterial.clone();
  simpleMaterial.side = THREE.DoubleSide;

  const verticalGeometryA = new THREE.PlaneGeometry(0.15, 1.5);
  const verticalBarA = new THREE.Mesh(verticalGeometryA, simpleMaterial);
  verticalBarA.position.y = 1.25;
  const verticalBarASide = verticalBarA.clone();
  verticalBarASide.rotation.y = Math.PI / 2;

  const verticalGeometryB = new THREE.PlaneGeometry(0.08, 0.75);
  const verticalBarB = new THREE.Mesh(verticalGeometryB, handleMaterial);
  verticalBarB.position.y = 0.25;
  const verticalBarBSide = verticalBarB.clone();
  verticalBarBSide.rotation.y = Math.PI / 2;

  const horizontalGeometry = new THREE.PlaneGeometry(0.8, 0.2);
  const horizontalBar = new THREE.Mesh(horizontalGeometry, simpleMaterial);
  horizontalBar.position.y = 1.6;

  simple.add(verticalBarA, verticalBarASide, verticalBarB, verticalBarBSide, horizontalBar);
  simple.position.y = 1.1;

  return simple;
}

function createSineTable() {
  const sineTable = new Float32Array(SINE_TABLE_SIZE);
  for (let i = 0; i < SINE_TABLE_SIZE; i++) {
    sineTable[i] = Math.sin((i / SINE_TABLE_SIZE) * Math.PI * 2);
  }
  return sineTable;
}

function hash2D(x, z, salt = 0) {
  const raw = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return raw - Math.floor(raw);
}

function getBatMotionFromPosition(x, z) {
  return {
    baseOffset: (hash2D(x, z, 1) - 0.5) * 0.08,
    primaryAmplitude: 0.025 + hash2D(x, z, 2) * 0.03,
    secondaryAmplitude: 0.008 + hash2D(x, z, 3) * 0.015,
    primaryFrequency: 0.045 + hash2D(x, z, 4) * 0.055,
    secondaryFrequency: 0.08 + hash2D(x, z, 5) * 0.095,
    primaryPhase: hash2D(x, z, 6),
    secondaryPhase: hash2D(x, z, 7)
  };
}

export function createBatSystem({ THREE, scene, camera, terrain, models }) {
  const batHiModel = models.batHi;
  const batMidModel = models.batMid;
  const batLowModel = models.batLow;
  const billboardModel = models.billboard;
  const simple = createSimpleCross(THREE);
  const sineTable = createSineTable();
  const batPool = [];
  const terrainSize = terrain.size;

  [batHiModel, batMidModel, batLowModel].forEach(model => {
    model.scale.set(3, 3, 3);
    model.position.y = 2.1;
    model.rotation.y = Math.PI / 2;
  });

  billboardModel.scale.set(3, 3, 3);
  billboardModel.position.set(0.5, -2, -35);

  function sampleSine(normalizedCycle) {
    const wrapped = normalizedCycle - Math.floor(normalizedCycle);
    const index = wrapped * SINE_TABLE_SIZE;
    const indexA = index & SINE_TABLE_MASK;
    const indexB = (indexA + 1) & SINE_TABLE_MASK;
    const mix = index - indexA;
    return sineTable[indexA] * (1 - mix) + sineTable[indexB] * mix;
  }

  function createBat() {
    const lod = new THREE.LOD();
    lod.addLevel(batHiModel.clone(), 0);
    lod.addLevel(batMidModel.clone(), 5);
    lod.addLevel(simple.clone(), 30);
    lod.traverse(child => { if (child.isMesh) child.castShadow = true; });
    return lod;
  }

  function registerBat() {
    const bat = createBat();
    batPool.push(bat);
    scene.add(bat);
  }

  for (let i = 0; i < INITIAL_POOL_SIZE; i++) {
    registerBat();
  }
  scene.add(billboardModel);

  function collectTargetPositions() {
    const targetPositions = [];
    const margin = 3;

    terrain.forEachTile(tile => {
      const baseX = tile.position.x, baseZ = tile.position.z;
      for (let cx = -terrainSize / 2; cx <= terrainSize / 2; cx += 3) {
        for (let cz = -terrainSize / 2; cz <= terrainSize / 2; cz += 3) {
          const pos = new THREE.Vector3(baseX + cx, 0, baseZ + cz);
          pos.y = terrain.getHeight(pos.x, pos.z);
          const projected = pos.clone().project(camera);
          if (projected.x >= -margin && projected.x <= margin &&
            projected.y >= -margin && projected.y <= margin &&
            projected.z >= 0 && projected.z <= 1 &&
            pos.distanceTo(camera.position) <= 50) {
            targetPositions.push(pos);
          }
        }
      }
    });

    return targetPositions;
  }

  function update(elapsedTime) {
    const targetPositions = collectTargetPositions();
    while (batPool.length < targetPositions.length) {
      registerBat();
    }

    for (let i = 0; i < batPool.length; i++) {
      if (i < targetPositions.length) {
        batPool[i].visible = true;
        const target = targetPositions[i];
        const motion = getBatMotionFromPosition(target.x, target.z);
        const distanceToCamera = target.distanceTo(camera.position);
        let lodFrequencyScale = 1;
        if (distanceToCamera > 30) {
          lodFrequencyScale = 0.25;
        } else if (distanceToCamera > 5) {
          lodFrequencyScale = 0.5;
        }
        const cycleTime = elapsedTime * BAT_MOTION_SPEED_SCALE * lodFrequencyScale;
        const primaryWave = sampleSine(cycleTime * motion.primaryFrequency + motion.primaryPhase);
        const secondaryWave = sampleSine(cycleTime * motion.secondaryFrequency + motion.secondaryPhase);
        batPool[i].position.set(
          target.x,
          target.y + motion.baseOffset + primaryWave * motion.primaryAmplitude + secondaryWave * motion.secondaryAmplitude,
          target.z
        );
        batPool[i].update(camera);
      } else {
        batPool[i].visible = false;
      }
    }
  }

  return { update };
}
