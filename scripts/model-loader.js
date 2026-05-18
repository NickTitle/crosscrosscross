const MODEL_URLS = {
  batHi: 'bat_hi.glb',
  batMid: 'bat_mid.glb',
  batLow: 'bat_low.glb',
  billboard: 'billboard.glb',
};

export function loadSceneModels({ THREE, onProgress }) {
  const loader = new THREE.GLTFLoader();
  const progress = {
    batHi: 0,
    batMid: 0,
    batLow: 0,
    billboard: 0,
  };

  function updateProgress(key, value) {
    progress[key] = value;
    const average = Object.values(progress).reduce((sum, item) => sum + item, 0) / Object.keys(progress).length;
    onProgress(average);
  }

  function loadModel(key, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, xhr => {
        if (xhr.lengthComputable) {
          updateProgress(key, xhr.loaded / xhr.total);
        }
      }, reject);
    });
  }

  return Promise.all([
    loadModel('batHi', MODEL_URLS.batHi),
    loadModel('batMid', MODEL_URLS.batMid),
    loadModel('batLow', MODEL_URLS.batLow),
    loadModel('billboard', MODEL_URLS.billboard),
  ]).then(([batHi, batMid, batLow, billboard]) => ({
    batHi,
    batMid,
    batLow,
    billboard,
  }));
}
