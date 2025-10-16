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
        loader.load(import.meta.env.BASE_URL + "ghost.glb", (gltf) => {
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

        const edgeOffset = platformSize / 2 - 1;
        const side = Math.floor(Math.random() * 4);
        let x, z;

        switch (side) {
            case 0:
                x = (Math.random() - 0.5) * platformSize;
                z = edgeOffset;
                break;
            case 1:
                x = (Math.random() - 0.5) * platformSize;
                z = -edgeOffset;
                break;
            case 2:
                x = -edgeOffset;
                z = (Math.random() - 0.5) * platformSize;
                break;
            case 3:
                x = edgeOffset;
                z = (Math.random() - 0.5) * platformSize;
                break;
        }

        this.mesh.position.set(x, 2.5, z);
    }


}
