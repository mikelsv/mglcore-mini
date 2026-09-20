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

        this.currentPlatform = null;
        this.platformOffset = new THREE.Vector3();
    }

    // Добавляет коробку по центру (x, y, z) и размерам (ширина, высота, глубина)
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

    // Добавляет коробку по диагональным углам (min и max)
    addBoxMinMax(minX, minY, minZ, maxX, maxY, maxZ) {
        const box = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
        );
        this.boxes.push(box);

        return this.boxes.at(-1);
    }

    // Добавляет круг по центру, радиусу и толщине
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

    // Добавляет сферу
    addSphere(x, y, z, radius) {
        this.spheres.push({ x, y, z, radius });
        return this.spheres.at(-1);
    }

    _getObjectPosition(obj) {
        if (!obj) return null;

        // Если привязан Three.js Mesh или кастомный объект с position
        if (obj.position) return obj.position;

        // Для THREE.Box3 берем центр
        if (obj.isBox3 || (obj.min && obj.max)) {
            return new THREE.Vector3(
                (obj.min.x + obj.max.x) / 2,
                obj.max.y,
                (obj.min.z + obj.max.z) / 2
            );
        }

        // Для сфер и кругов { x, y, z }
        if (obj.x !== undefined && obj.y !== undefined && obj.z !== undefined) {
            return new THREE.Vector3(obj.x, obj.y, obj.z);
        }

        return null;
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

    getFloor(x, y, z) {
        let maxFloorY = -Infinity;
        let floorObject = null;

        const pBox = new THREE.Box3(
            new THREE.Vector3(x - this.playerRadius, y - 1.0, z - this.playerRadius),
            new THREE.Vector3(x + this.playerRadius, y + this.stepHeight, z + this.playerRadius)
        );

        for (let box of this.boxes) {
            if (pBox.intersectsBox(box) && box.max.y <= y + this.stepHeight) {
                if (box.max.y > maxFloorY) {
                    maxFloorY = box.max.y;
                    floorObject = box;
                }
            }
        }

        for (let circle of this.circles) {
            if (circle.y <= y + this.stepHeight && circle.y >= y - 1.0) {
                if (this._intersectsCircleXZ(pBox, circle)) {
                    if (circle.y > maxFloorY) {
                        maxFloorY = circle.y;
                        floorObject = circle;
                    }
                }
            }
        }

        for (let s of this.spheres) {
            const dx = x - s.x;
            const dz = z - s.z;
            const distSqXZ = dx * dx + dz * dz;

            if (distSqXZ <= s.radius * s.radius) {
                const surfaceY = s.y + Math.sqrt(s.radius * s.radius - distSqXZ);
                if (surfaceY <= y + this.stepHeight && surfaceY >= y - 1.0) {
                    if (surfaceY > maxFloorY) {
                        maxFloorY = surfaceY;
                        floorObject = s;
                    }
                }
            }
        }

        return { y: maxFloorY, object: floorObject };
    }

update(moveX, moveZ, jumpPressed, deltaTime) {
        let px = this.camera.position.x;
        let py = this.camera.position.y - this.playerHeight;
        let pz = this.camera.position.z;

        // Движение вместе с платформой
        // Если стоим на платформе, сдвигаем игрока на её новое положение + смещение
        if (this.currentPlatform && this.isGrounded) {
            const platPos = this._getObjectPosition(this.currentPlatform);
            if (platPos) {
                const targetX = platPos.x + this.platformOffset.x;
                const targetZ = platPos.z + this.platformOffset.z;
                const targetY = platPos.y + this.platformOffset.y;

                // Двигаем игрока (с проверкой боковых стен, чтобы платформа не вдавила в стену)
                if (!this.checkCollision(targetX, py, pz)) px = targetX;
                if (!this.checkCollision(px, py, targetZ)) pz = targetZ;
                py = targetY;
            }
        }

        const isStuck = this.checkCollision(px, py, pz);

        // Движение игрока (WASD)
        if (!this.checkCollision(px + moveX, py, pz)) px += moveX;
        if (!this.checkCollision(px, py, pz + moveZ)) pz += moveZ;

        // Гравитация и вертикальное движение
        this.velocityY += this.gravity * deltaTime;
        let nextY = py + this.velocityY * deltaTime;

        if (this.velocityY > 0 && !isStuck && this.checkCollision(px, nextY, pz)) {
            this.velocityY = 0;
            nextY = py;
        }

        const floor = this.getFloor(px, py, pz);
        const floorY = floor.y;
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

        if(!this.isGrounded && onGround)
            this.callbacks?.onGround();

        this.isGrounded = onGround;

        // Прыжок
        if (jumpPressed && (this.isGrounded || isStuck)) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.currentPlatform = null; // При прыжке отлипаем от платформы
            this.callbacks?.onJump();
        }

        // Фиксация смещения относительно платформы
        if (this.isGrounded && floor.object) {
            this.currentPlatform = floor.object;
            const platPos = this._getObjectPosition(floor.object);
            if (platPos) {
                // Запоминаем локальное смещение игрока относительно центра платформы
                this.platformOffset.set(px - platPos.x, nextY - platPos.y, pz - platPos.z);
            }
        } else if (!this.isGrounded) {
            this.currentPlatform = null;
        }

        this.camera.position.set(px, nextY + this.playerHeight, pz);
    }

    update_OLD(moveX, moveZ, jumpPressed, deltaTime) {
        let px = this.camera.position.x;
        let py = this.camera.position.y - this.playerHeight;
        let pz = this.camera.position.z;

        // Проверяем, застрял ли игрок в объекте прямо сейчас
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

        if(!this.isGrounded && onGround)
            this.callbacks?.onGround();

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