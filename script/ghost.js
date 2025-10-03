import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Ghost {
    constructor(scene, pacman) {
        this.scene = scene;
        this.pacman = pacman;
        this.mesh = null;
        this.mixer = null;

        this.speed = 0.05;

        const loader = new GLTFLoader();
        loader.load("/ghost.glb", (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.scale.set(1, 1, 1);
            this.mesh.position.set(
                (Math.random() - 0.5) * 20,
                2.5,
                (Math.random() - 0.5) * 20
            );

            this.scene.add(this.mesh);

            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                const action = this.mixer.clipAction(gltf.animations[2]);
                console.log(gltf.animations[2])
                action.play();
            }
        });
    }

    update(delta) {
        if (!this.mesh || !this.pacman) return;

        // Move toward Pac-Man
        const dir = new THREE.Vector3().subVectors(this.pacman.position, this.mesh.position);
        dir.y = 0;
        if (dir.length() > 0.1) {
            dir.normalize().multiplyScalar(this.speed);
            this.mesh.position.add(dir);
            this.mesh.lookAt(this.pacman.position.clone().setY(this.mesh.position.y));
        }

        if (this.mixer) this.mixer.update(delta);
    }
}
