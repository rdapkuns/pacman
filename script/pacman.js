import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';

let scene, camera, renderer;
let pacman, fruit;
let score = 0;

let velocity = new THREE.Vector3(0, 0, 0.2); // Forward speed
let turnSpeed = 0.3; // How fast Pacman turns
let mouseX = 0;

let mouse = new THREE.Vector2();
let targetWorldPos = new THREE.Vector3();

let isFalling = false;
let fallSpeed = 0;
let respawnTimeout = null;

const platformSize = 30



init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 40;
    camera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );
    camera.position.set(-20, 20, 20); // Diagonal corner
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(platformSize, platformSize);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Pacman (sphere)
    const pacmanGeo = new THREE.SphereGeometry(1, 32, 32);
    const pacmanMat = new THREE.MeshPhongMaterial({ color: 0xfccf03 });
    pacman = new THREE.Mesh(pacmanGeo, pacmanMat);
    pacman.position.set(0, 2, 0);
    scene.add(pacman);

    // Fruit (cube)
    spawnFruit();

    // Mouse control
    document.addEventListener('mousemove', onMouseMove);

    window.addEventListener('resize', onWindowResize);
}

function spawnFruit() {
    if (fruit) scene.remove(fruit);

    const fruitGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const fruitMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    fruit = new THREE.Mesh(fruitGeo, fruitMat);
    fruit.position.set(
        (Math.random() - 0.5) * 30,
        0.5,
        (Math.random() - 0.5) * 30
    );
    scene.add(fruit);
}

function onMouseMove(event) {
    // normalized device coords (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // project mouse into 3D world (on the ground plane y=0)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 plane
    raycaster.ray.intersectPlane(plane, targetWorldPos);
}

function animate() {
    requestAnimationFrame(animate);

    if (!isFalling) {
        // Normal movement toward target
        const direction = targetWorldPos.clone().sub(pacman.position);
        direction.y = 0;

        if (direction.length() > 0.05) {
            direction.normalize().multiplyScalar(0.2);
            pacman.position.add(direction);
            pacman.position.y = 1;

            pacman.lookAt(pacman.position.clone().add(direction));
        }

        // Check bounds (ground is 50x50, centered at origin)
        if (Math.abs(pacman.position.x) > platformSize / 2 + 1 || Math.abs(pacman.position.z) > platformSize / 2 + 1) {
            startFalling();
        }

    } else {
        // Falling behavior
        fallSpeed -= 0.02; // gravity
        pacman.position.y += fallSpeed;

        if (pacman.position.y < -10 && !respawnTimeout) {
            // Schedule respawn
            respawnTimeout = setTimeout(respawnPacman, 3000);
        }
    }

    // Collision detection (only if not falling)
    if (!isFalling && pacman.position.distanceTo(fruit.position) < 1.2) {
        score++;
        document.getElementById('score').innerText = "Score: " + score;
        spawnFruit();
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
    
    score = 0
    document.getElementById('score').innerText = "Score: " + score;

}