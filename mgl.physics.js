import * as THREE from 'three';

export class mglPhysicsEngine {
    constructor(camera, options = {}) {
        this.camera = camera;
        this.playerHeight = 2;
        this.playerRadius = 0.3;
        this.callbacks = options.callbacks;

        this.stepHeight = 0.9;

        this.boxes = [];
        this.circles = [];
        this.spheres = [];

        this.velocityY = 0;
        this.gravity = -20;
        this.jumpForce = 8;
        this.isGrounded = false;
    }

    // Задает коробку по центру (x, y, z) и размерам (ширина, высота, глубина)
    addBox(centerX, centerY, centerZ, width, height, depth) {
        const halfW = width / 2;
        const halfH = height / 2;
        const halfD = depth / 2;

        const box = new THREE.Box3(
            new THREE.Vector3(centerX - halfW, centerY - halfH, centerZ - halfD),
            new THREE.Vector3(centerX + halfW, centerY + halfH, centerZ + halfD)
        );
        this.boxes.push(box);

        return this.boxes.at(-1);
    }

    // Задает коробку по диагональным углам (min и max)
    addBoxMinMax(minX, minY, minZ, maxX, maxY, maxZ) {
        const box = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
        );
        this.boxes.push(box);

        return this.boxes.at(-1);
    }

    // Задает круг по центру, радиусу и толщине
    addCircle(x, y, z, radius, thickness = 1.0) {
        this.circles.push({
            x: x,
            y: y,                 // Верхняя грань (пол)
            z: z,
            radius: radius,
            bottomY: y - thickness / 2 // Нижняя грань
        });

        return this.circles.at(-1);
    }

    addSphere(x, y, z, radius) {
        this.spheres.push({ x, y, z, radius });
        return this.spheres.at(-1);
    }

    _intersectsCircleXZ(box, circle) {
        const closestX = Math.max(box.min.x, Math.min(circle.x, box.max.x));
        const closestZ = Math.max(box.min.z, Math.min(circle.z, box.max.z));

        const dx = circle.x - closestX;
        const dz = circle.z - closestZ;

        return (dx * dx + dz * dz) <= (circle.radius * circle.radius);
    }

    checkCollision(x, y, z) {
        const playerBox = new THREE.Box3(
            new THREE.Vector3(x - this.playerRadius, y + this.stepHeight, z - this.playerRadius),
            new THREE.Vector3(x + this.playerRadius, y + this.playerHeight, z + this.playerRadius)
        );

        for (let box of this.boxes) {
            if (playerBox.intersectsBox(box)) return true;
        }

        for (let circle of this.circles) {
            if (circle.y > y + this.stepHeight && circle.bottomY < y + this.playerHeight) {
                if (this._intersectsCircleXZ(playerBox, circle)) return true;
            }
        }

        for (let s of this.spheres) {
            // Находим ближайшую точку хитбокса игрока к центру сферы
            const cx = Math.max(x - this.playerRadius, Math.min(s.x, x + this.playerRadius));
            const cy = Math.max(y + this.stepHeight, Math.min(s.y, y + this.playerHeight));
            const cz = Math.max(z - this.playerRadius, Math.min(s.z, z + this.playerRadius));

            const distSq = (s.x - cx) ** 2 + (s.y - cy) ** 2 + (s.z - cz) ** 2;
            if (distSq <= s.radius * s.radius) {
                return true;
            }
        }

        return false;
    }

    getFloorY(x, y, z) {
        let maxFloorY = -Infinity;

        const pBox = new THREE.Box3(
            new THREE.Vector3(x - this.playerRadius, y - 1.0, z - this.playerRadius),
            new THREE.Vector3(x + this.playerRadius, y + this.stepHeight, z + this.playerRadius)
        );

        for (let box of this.boxes) {
            if (pBox.intersectsBox(box) && box.max.y <= y + this.stepHeight) {
                maxFloorY = Math.max(maxFloorY, box.max.y);
            }
        }

        for (let circle of this.circles) {
            if (circle.y <= y + this.stepHeight && circle.y >= y - 1.0) {
                if (this._intersectsCircleXZ(pBox, circle)) {
                    maxFloorY = Math.max(maxFloorY, circle.y);
                }
            }
        }

        for (let s of this.spheres) {
            const dx = x - s.x;
            const dz = z - s.z;
            const distSqXZ = dx * dx + dz * dz;

            // Если игрок находится в пределах горизонтальной проекции сферы
            if (distSqXZ <= s.radius * s.radius) {
                // Вычисляем высоту верхней точки сферы под ногами игрока
                const surfaceY = s.y + Math.sqrt(s.radius * s.radius - distSqXZ);

                if (surfaceY <= y + this.stepHeight && surfaceY >= y - 1.0) {
                    maxFloorY = Math.max(maxFloorY, surfaceY);
                }
            }
        }

        return maxFloorY;
    }

    update(moveX, moveZ, jumpPressed, deltaTime) {
        let px = this.camera.position.x;
        let py = this.camera.position.y - this.playerHeight;
        let pz = this.camera.position.z;

        // 1. Проверяем, застрял ли игрок в объекте прямо сейчас
        const isStuck = this.checkCollision(px, py, pz);

        if (!this.checkCollision(px + moveX, py, pz)) px += moveX;
        if (!this.checkCollision(px, py, pz + moveZ)) pz += moveZ;

        this.velocityY += this.gravity * deltaTime;
        let nextY = py + this.velocityY * deltaTime;

        // Блокируем движение вверх в потолок ТОЛЬКО если мы не застряли.
        // Если мы уже внутри объекта — даем беспрепятственно лететь вверх, чтобы выпрыгнуть.
        if (this.velocityY > 0 && !isStuck && this.checkCollision(px, nextY, pz)) {
            this.velocityY = 0;
            nextY = py;
        }

        const floorY = this.getFloorY(px, py, pz);
        let onGround = false;

        const lerpAlpha = Math.min(15 * deltaTime, 1);

        if (this.velocityY <= 0) {
            if (floorY > py && floorY <= py + this.stepHeight) {
                nextY = THREE.MathUtils.lerp(py, floorY, lerpAlpha);
                this.velocityY = 0;
                onGround = true;
            }
            else if (nextY <= floorY) {
                nextY = floorY;
                this.velocityY = 0;
                onGround = true;
            }
            else if (this.isGrounded && py > floorY && py - floorY <= this.stepHeight) {
                nextY = THREE.MathUtils.lerp(py, floorY, lerpAlpha);
                this.velocityY = 0;
                onGround = true;
            }
        }

        this.isGrounded = onGround;

        // Разрешаем прыжок, если игрок на земле ИЛИ если он застрял внутри объекта
        if (jumpPressed && (this.isGrounded || isStuck)) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.callbacks?.onJump();
        }

        this.camera.position.set(px, nextY + this.playerHeight, pz);
    }
}