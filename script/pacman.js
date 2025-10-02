import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import groundVertex from './shaders/ground.vert.glsl?raw';
import groundFragment from './shaders/ground.frag.glsl?raw';


let scene, camera, renderer;
// let fruit;
let score = 0;

let mixers = []; // store all animation mixers
let clock = new THREE.Clock();
let pacman;

let mouse = new THREE.Vector2();
let targetWorldPos = new THREE.Vector3();

let groundMaterial, ground;


let isFalling = false;
let fallSpeed = 0;
let respawnTimeout = null;

let fruitTemplate = null; // holds the loaded cherry glTF scene
let fruitAnimations = null;
let fruit = null;
let collectingFruit = false


const platformSize = 30;
const frustumSize = 40; // moved here so it's global

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );
    camera.position.set(-20, 20, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Ground plane
    // const groundGeo = new THREE.PlaneGeometry(platformSize, platformSize);
    // const groundMat = new THREE.MeshPhongMaterial({ color: 0x3b3b3b });
    // const ground = new THREE.Mesh(groundGeo, groundMat);
    // ground.rotation.x = -Math.PI / 2;
    createGround()
    scene.add(ground);

    loadPacman();
    loadFruitModel();
    // spawnFruit();

    // Mouse control
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
}


function createGround() {
    const groundGeo = new THREE.PlaneGeometry(platformSize, platformSize);

    groundMaterial = new THREE.ShaderMaterial({
        vertexShader: groundVertex,
        fragmentShader: groundFragment,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        side: THREE.DoubleSide
    });

    ground = new THREE.Mesh(groundGeo, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
}

function loadPacman() {
    const loader = new GLTFLoader();
    loader.load('/pacman.glb', (gltf) => {
        pacman = gltf.scene;
        pacman.scale.set(1, 1, 1);
        pacman.position.set(0, 1, 0);

        // pacman.traverse((child) => {
        //     if (child.isMesh) {
        //         child.material = new THREE.MeshPhongMaterial({ color: 0xfccf03 }); // Yellow
        //     }
        // });

        pacman.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(pacman);

        if (gltf.animations.length > 0) {
            const pacmanMixer = new THREE.AnimationMixer(pacman);
            const action = pacmanMixer.clipAction(gltf.animations[1]);
            action.play();
            mixers.push(pacmanMixer);
        }
    });
}

function loadFruitModel() {
    const loader = new GLTFLoader();
    loader.load('/cherry.glb', (gltf) => {
        fruitTemplate = gltf.scene;
        fruitTemplate.scale.set(1.5, 1.5, 1.5);

        // Save animations separately (don't attach to userData)
        fruitAnimations = gltf.animations;

        // Spawn the first fruit once the template is ready
        spawnFruit();
    });
}


function spawnFruit() {
    if (!fruitTemplate) return; // not loaded yet

    // remove old fruit
    if (fruit) {
        scene.remove(fruit);
        mixers = mixers.filter(m => m.getRoot() !== fruit);
    }

    // clone the model
    fruit = fruitTemplate.clone(true);
    fruit.position.set(
        (Math.random() - 0.5) * (platformSize - 2),
        0.5,
        (Math.random() - 0.5) * (platformSize - 2)
    );
    scene.add(fruit);

    // Apply animation (reuse original clips)
    if (fruitAnimations && fruitAnimations.length > 0) {
        const fruitMixer = new THREE.AnimationMixer(fruit);
        const action = fruitMixer.clipAction(fruitAnimations[1]); // pick the first animation
        action.play();
        mixers.push(fruitMixer);
    }
}


function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    raycaster.ray.intersectPlane(plane, targetWorldPos);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixers.forEach(m => m.update(delta));

    if (groundMaterial) {
        groundMaterial.uniforms.iTime.value = clock.getElapsedTime();
    }

    if (pacman) {
        if (!isFalling) {
            // Normal movement toward target
            const direction = targetWorldPos.clone().sub(pacman.position);
            direction.y = 0;

            if (direction.length() > 0.2) {
                direction.normalize().multiplyScalar(0.2);
                pacman.position.add(direction);
                pacman.position.y = 1;

                pacman.lookAt(pacman.position.clone().add(direction));
            }

            // Check bounds
            if (
                Math.abs(pacman.position.x) > platformSize / 2 + 1 ||
                Math.abs(pacman.position.z) > platformSize / 2 + 1
            ) {
                startFalling();
            }

        } else {
            // Falling
            fallSpeed -= 0.02;
            pacman.position.y += fallSpeed;

            if (pacman.position.y < -10 && !respawnTimeout) {
                respawnTimeout = setTimeout(respawnPacman, 3000);
            }
        }

        // Collision detection
        if (fruit && !isFalling && pacman.position.distanceTo(fruit.position) < 1.2) {

            if (collectingFruit === false) {
                score++;
                document.getElementById('score').innerText = "Score: " + score;

                const fruitMixer = new THREE.AnimationMixer(fruit);
                const action = fruitMixer.clipAction(fruitAnimations[0]); // pick the first animation

                collectingFruit = true
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                mixers.push(fruitMixer);

                fruitMixer.addEventListener('finished', () => {
                    scene.remove(fruit);
                    mixers = mixers.filter(m => m !== fruitMixer); // cleanup
                    spawnFruit();
                    collectingFruit = false
                });
            }
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startFalling() {
    isFalling = true;
    fallSpeed = 0;
}

function respawnPacman() {
    pacman.position.set(0, 1, 0);
    fallSpeed = 0;
    isFalling = false;
    respawnTimeout = null;

    score = 0;
    document.getElementById('score').innerText = "Score: " + score;
}
