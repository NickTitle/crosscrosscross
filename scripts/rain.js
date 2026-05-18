const INITIAL_POOL_SIZE = 600;
const RAIN_AREA = { width: 50, depth: 50, height: 50 };
const RAIN_SPEED = 40;

export function createRainSystem({ THREE, scene, camera, state }) {
  const rainPool = [];

  function createRainDrop() {
    const geometry = new THREE.PlaneGeometry(0.02, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xBBBBBB });
    const drop = new THREE.Mesh(geometry, material);
    drop.rotation.y = -Math.PI / 2;
    drop.material.transparent = true;
    return drop;
  }

  for (let i = 0; i < INITIAL_POOL_SIZE; i++) {
    const drop = createRainDrop();
    drop.position.x = camera.position.x + (Math.random() - 0.5) * RAIN_AREA.width;
    drop.position.y = camera.position.y + (Math.random() - 0.5) * RAIN_AREA.height;
    drop.position.z = camera.position.z + (Math.random() - 0.5) * RAIN_AREA.depth;
    rainPool.push(drop);
    scene.add(drop);
  }

  function update(delta) {
    for (const drop of rainPool) {
      if (state.menuActive && drop.material.opacity > 0.0) {
        drop.material.opacity -= 0.05;
      } else if (!state.menuActive && drop.material.opacity < 1.0) {
        drop.material.opacity += 0.05;
      }

      drop.position.y -= RAIN_SPEED * delta;

      if (drop.position.y < camera.position.y - RAIN_AREA.height / 2) {
        drop.position.y = camera.position.y + RAIN_AREA.height / 2;
        drop.position.x = camera.position.x + (Math.random() - 0.5) * RAIN_AREA.width;
        drop.position.z = camera.position.z + (Math.random() - 0.5) * RAIN_AREA.depth;
      }

      if (Math.abs(drop.position.x - camera.position.x) > RAIN_AREA.width / 2) {
        drop.position.x = camera.position.x + (Math.random() - 0.5) * RAIN_AREA.width;
      }

      if (Math.abs(drop.position.z - camera.position.z) > RAIN_AREA.depth / 2) {
        drop.position.z = camera.position.z + (Math.random() - 0.5) * RAIN_AREA.depth;
      }

      drop.quaternion.copy(camera.quaternion);
    }
  }

  return { update };
}
