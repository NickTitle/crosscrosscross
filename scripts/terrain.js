const TERRAIN_SIZE = 50;

export function createTerrainSystem({ THREE, scene }) {
  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 50, 50);
  terrainGeo.rotateX(-Math.PI / 2);

  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x151515 });
  const terrains = new Map();

  function getHeight(x, z) {
    return Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.5 +
      Math.cos(x * 0.15) * Math.sin(z * 0.15) * 1.2 +
      Math.sin((x + z) * 0.05) * 2.0;
  }

  function generateHills(geo, offsetX, offsetZ) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const worldX = pos.getX(i) + offsetX;
      const worldZ = pos.getZ(i) + offsetZ;
      pos.setY(i, getHeight(worldX, worldZ));
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

  function updateVisibleTiles(camera) {
    const camX = Math.floor(camera.position.x / TERRAIN_SIZE) * TERRAIN_SIZE;
    const camZ = Math.floor(camera.position.z / TERRAIN_SIZE) * TERRAIN_SIZE;

    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        createTile(camX + i * TERRAIN_SIZE, camZ + j * TERRAIN_SIZE);
      }
    }
  }

  return {
    size: TERRAIN_SIZE,
    forEachTile: callback => terrains.forEach(callback),
    getHeight,
    updateVisibleTiles,
  };
}
