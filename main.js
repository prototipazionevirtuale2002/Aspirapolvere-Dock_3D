import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
const playBtn = document.getElementById('playAnimations');
const resetBtn = document.getElementById('resetAnimation');
const loaderElem = document.getElementById('loader');
const progressBar = document.getElementById('progressBar');
const loadingText = document.getElementById('loadingText');

let scene, camera, renderer, mixer, model, controls;
let clock = new THREE.Clock();
let actions = [];

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x777777); // <-- sfondo grigio più chiaro
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const loader = new GLTFLoader();

  loader.load(
    'animazione_web_completa.glb',

    (gltf) => {
      model = gltf.scene;
      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));

      cameraZ *= 1.5;
      camera.position.set(0, maxDim * 0.5, cameraZ);
      camera.lookAt(0, 0, 0);

      controls.target.set(0, 0, 0);
      controls.update();

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);

        actions = gltf.animations.map((clip) => {
          const action = mixer.clipAction(clip);
          action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
          return action;
        });

        playBtn.style.display = 'block';
        resetBtn.style.display = 'block';
      }

      loaderElem.style.display = 'none';
      loadingText.style.display = 'none';
    },

    (xhr) => {
      if (xhr.lengthComputable) {
        let percentComplete = (xhr.loaded / xhr.total) * 100;
        if (percentComplete > 100) percentComplete = 100;
        progressBar.style.width = percentComplete + '%';
        loadingText.textContent = `Caricamento modello... ${Math.floor(percentComplete)}%`;
      }
    },

    (error) => {
      console.error('Errore caricamento modello:', error);
      loadingText.textContent = 'Errore caricamento modello.';
    }
  );

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  controls.update();
  renderer.render(scene, camera);
}

// ▶️ Avvia animazioni
playBtn.addEventListener('click', () => {
  if (!mixer || !model || actions.length === 0) return;

  mixer.stopAllAction();

  actions.forEach(action => {
    action.reset();
    action.play();
  });
});

// 🔁 Reset animazioni (senza riprodurle)
resetBtn.addEventListener('click', () => {
  if (!mixer || actions.length === 0) return;

  mixer.stopAllAction();
  mixer.setTime(0);

  actions.forEach(action => {
    const clip = action.getClip();

    action.enabled = true;
    action.paused = true;
    action.reset();
    action.play();     // forza l'applicazione del primo frame
  });

  mixer.setTime(0);     // assicura che il tempo sia 0
  actions.forEach(action => action.stop()); // non farle ripartire
});
