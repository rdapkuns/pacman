import * as THREE from "three";

export default class Ghost {
    constructor(scene, pacman) {
        this.scene = scene;
        this.pacman = pacman;

        // Create a simple cube for now
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);

        this.mesh.position.set(
            (Math.random() - 0.5) * 20,
            1,
            (Math.random() - 0.5) * 20
        );

        this.speed = 0.05;

        scene.add(this.mesh);
    }

    update() {
        if (!this.pacman) return;
        
        // Direction from ghost to pacman
        const dir = new THREE.Vector3().subVectors(this.pacman.position, this.mesh.position);

        dir.y = 0; // Keep movement flat on ground
        if (dir.length() > 0.1) {
            dir.normalize().multiplyScalar(this.speed);
            this.mesh.position.add(dir);

            // Face Pac-Man
            this.mesh.lookAt(this.pacman.position.clone().setY(this.mesh.position.y));
        }
    }
}
