import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import groundVertex from './shaders/ground.vert.glsl?raw';
import groundFragment from './shaders/ground.frag.glsl?raw';

import { gsap } from "gsap";
import { thickness } from "three/tsl";

import Ghost from "./ghost.js";



let scene, camera, renderer;
// let fruit;
let score = 0;

let mixers = []; // store all animation mixers
let clock = new THREE.Clock();
let pacman;
let ghost;

let pacmanMixer;
let pacmanActions = {};
let activeAction;


let mouse = new THREE.Vector2();
let targetWorldPos = new THREE.Vector3();

let groundMaterial, ground;

let isCaught = false
let isFalling = false;
let fallSpeed = 0;
let respawnTimeout = null;

let fruitTemplate = null; // holds the loaded cherry glTF scene
let fruitAnimations = null;
let fruit = null;
let collectingFruit = false


const platformSize = 30;
const frustumSize = 40; // moved here so it's global
let shaderProps = { speed: 1 };


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

    createGround()
    scene.add(ground);

    loadPacman();
    loadFruitModel();

    // spawnFruit();

    // Mouse control
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
}

function playPacmanAnimation(name, { once = false } = {}) {
    if (!pacmanMixer || !pacmanActions[name]) return;

    const newAction = pacmanActions[name];

    if (activeAction !== newAction) {
        // Configure looping mode
        if (once) {
            newAction.setLoop(THREE.LoopOnce, 0);
            newAction.clampWhenFinished = true;
        } else {
            newAction.setLoop(THREE.LoopRepeat);
            newAction.clampWhenFinished = false;
        }

        // Crossfade
        if (activeAction) {
            activeAction.fadeOut(0.2);
        }
        newAction.reset().fadeIn(0.2).play();

        activeAction = newAction;
    }
}



function createGround() {
    const groundGeo = new THREE.PlaneGeometry(platformSize, platformSize);

    groundMaterial = new THREE.ShaderMaterial({
        vertexShader: groundVertex,
        fragmentShader: groundFragment,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            color1: { value: new THREE.Color(0.082, 0.384, 0.522) },
            color2: { value: new THREE.Color(0.0, 0.18, 0.42) },
            color3: { value: new THREE.Color(0.5, 0.4, 0.8) },
            color4: { value: new THREE.Color(0.23, 0.18, 0.56) },
            thickness: { value: 2.2 }
        },
        side: THREE.DoubleSide
    });

    ground = new THREE.Mesh(groundGeo, groundMaterial);
    ground.rotation.x = -Math.PI / 2;

    const baseGeo = new THREE.BoxGeometry(platformSize, 4, platformSize);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x050a1a });
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.set(0, -2.1, 0)

    scene.add(ground);
    scene.add(base);

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

        // if (gltf.animations.length > 0) {
        //     const pacmanMixer = new THREE.AnimationMixer(pacman);
        //     console.log(gltf.animations[2])
        //     const action = pacmanMixer.clipAction(gltf.animations[2]);
        //     action.play();
        //     mixers.push(pacmanMixer);
        // }

        pacmanMixer = new THREE.AnimationMixer(pacman);

        gltf.animations.forEach((clip) => {
            // console.log(pacmanMixer.clipAction(clip))
            pacmanActions[clip.name] = pacmanMixer.clipAction(clip);
            // console.log(pacmanActions)
        });

        activeAction = pacmanActions["JUMP"];
        activeAction.play();

        ghost = new Ghost(scene, pacman);

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

    // shaderProps = mouse.x + 1

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    raycaster.ray.intersectPlane(plane, targetWorldPos);
}

function shaderAnimationDie() {
    var tl = gsap.timeline({

    });

    tl.to(shaderProps, {
        speed: shaderProps.speed + 10,
        duration: 2.5,
        ease: "circ.out",
    }).to(groundMaterial.uniforms.color1.value, {
        r: 0.5,
        g: 0.8,
        b: 0.9,
        duration: 0.5,
        ease: "circ.out",
    }, ('<')).to(groundMaterial.uniforms.thickness, {
        value: 3.4,
        duration: 1.5,
        ease: "circ.out",
    }, ('<50%')).to(groundMaterial.uniforms.color1.value, {
        r: 0.082,
        g: 0.384,
        b: 0.522,
        duration: 1.0,
        delay: 1.5,
        ease: "power1.inOut",
    }, ('<')).to(groundMaterial.uniforms.thickness, {
        value: 2.2,
        duration: 1.0,
        ease: "circ.out",
    })
}


function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixers.forEach(m => m.update(delta));
    if (pacmanMixer) pacmanMixer.update(delta);

    if (ghost) ghost.update(delta);

    if (groundMaterial) {
        groundMaterial.uniforms.iTime.value = clock.getElapsedTime() + shaderProps.speed;
    }

    if (pacman) {
        if (!isFalling && !isCaught) {
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
                isFalling = true
                fallSpeed = 0;
            }

        } else if (isFalling) {
            // Falling
            fallSpeed -= 0.02;
            pacman.position.y += fallSpeed;

            if (pacman.position.y < -10 && !respawnTimeout) {

                // var tl = gsap.timeline({

                // });

                // tl.to(shaderProps, {
                //     speed: shaderProps.speed + 10,
                //     duration: 2.5,
                //     ease: "circ.out",
                // }).to(groundMaterial.uniforms.color1.value, {
                //     r: 0.5,
                //     g: 0.8,
                //     b: 0.9,
                //     duration: 0.5,
                //     ease: "circ.out",
                // }, ('<')).to(groundMaterial.uniforms.thickness, {
                //     value: 3.4,
                //     duration: 1.5,
                //     ease: "circ.out",
                // }, ('<50%')).to(groundMaterial.uniforms.color1.value, {
                //     r: 0.082,
                //     g: 0.384,
                //     b: 0.522,
                //     duration: 1.0,
                //     delay: 1.5,
                //     ease: "power1.inOut",
                // }, ('<')).to(groundMaterial.uniforms.thickness, {
                //     value: 2.2,
                //     duration: 1.0,
                //     ease: "circ.out",
                // })
                shaderAnimationDie()
                respawnTimeout = setTimeout(respawnPacman, 3000);
            }
            // if (pacman.position.y > 20) {
            //     isFalling = false
            //     fallSpeed = 0;
            //     // pacman.position.y = 1
            //     gsap.to(pacman.position, {
            //         y: 1,
            //         duration: 2,
            //         delay: 3000,
            //         ease: "bounce.out",
            //         onUpdate: () => {
            //             console.log(pacman.position.y)
            //         },
            //     })
            // }
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

                var tl = gsap.timeline({
                    onUpdate: () => {
                        // console.log(shaderProps.speed)
                    },
                });

                tl.to(shaderProps, {
                    speed: shaderProps.speed + 7,
                    duration: 1.5,
                    ease: "circ.out",
                }).to(groundMaterial.uniforms.color1.value, {
                    r: 0.5,
                    g: 0.8,
                    b: 0.9,
                    duration: 0.5,
                    ease: "circ.out",
                }, ('<')).to(groundMaterial.uniforms.color1.value, {
                    r: 0.082,
                    g: 0.384,
                    b: 0.522,
                    duration: 0.5,
                    delay: 0.6,
                    ease: "power1.inOut",
                }, ('<'));
                // tl.to(shaderProps, { speed: 1, duration: 1 });

                fruitMixer.addEventListener('finished', () => {
                    scene.remove(fruit);
                    mixers = mixers.filter(m => m !== fruitMixer); // cleanup
                    spawnFruit();
                    collectingFruit = false

                });
            }
        }

        //IF CAUGHT BY GHOST

        if (ghost && !isCaught && pacman.position.distanceTo(ghost.mesh.position) < 2) {
            // console.log("caught")
            isCaught = true
            playPacmanAnimation("DIE", { once: true });
            shaderAnimationDie()
            respawnTimeout = setTimeout(respawnPacman, 3000);
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


function respawnPacman() {
    pacman.position.set(0, 30, 0);
    fallSpeed = 0;
    isFalling = false;
    isCaught = false
    respawnTimeout = null;

    score = 0;
    document.getElementById('score').innerText = "Score: " + score;
    playPacmanAnimation("JUMP");
}
