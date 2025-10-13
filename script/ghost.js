import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Ghost {
    constructor(scene, pacman) {
        this.scene = scene;
        this.pacman = pacman;
        this.mesh = null;
        this.mixer = null;

        this.speed = 0.10;

        const loader = new GLTFLoader();
        loader.load("/ghost.glb", (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.scale.set(1, 1, 1);
            this.respawn();

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
        if (dir.length() > 1.5) {
            dir.normalize().multiplyScalar(this.speed);
            this.mesh.position.add(dir);
            this.mesh.lookAt(this.pacman.position.clone().setY(this.mesh.position.y));
        }

        if (this.mixer) this.mixer.update(delta);
    }

    respawn() {
        if (!this.mesh) return;

        const platformSize = 30

        const edgeOffset = platformSize / 2 - 1; // stay slightly inside the edge
        const side = Math.floor(Math.random() * 4); // pick one of 4 sides
        let x, z;

        switch (side) {
            case 0: // top edge
                x = (Math.random() - 0.5) * platformSize;
                z = edgeOffset;
                break;
            case 1: // bottom edge
                x = (Math.random() - 0.5) * platformSize;
                z = -edgeOffset;
                break;
            case 2: // left edge
                x = -edgeOffset;
                z = (Math.random() - 0.5) * platformSize;
                break;
            case 3: // right edge
                x = edgeOffset;
                z = (Math.random() - 0.5) * platformSize;
                break;
        }

        this.mesh.position.set(x, 2.5, z);
    }


}
