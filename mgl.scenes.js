import * as THREE from 'three';
import { scene, camera, renderer } from 'mglcore/mgl.app.js';



// Graphics Items class
export class mglGitems {
    // Gitems
    gitems = [];

    addGitem(item){
        item.sceneId = this.sceneId;
        this.gitems.push(item);
        scene.add(item.mesh);
    }

    getGitemById(id){
        return this.gitems.find(item => item.id == id);
    }

    getGitemByType(type){
        return this.gitems.find(item => item.type == type);
    }

    getAllGitemByType(type){
        return this.gitems.filter(item => item.type == type);
    }

    disposeGitem(gitem){
        const mesh = gitem.mesh;
        //this.disposeGitem(gitem);

        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
        }
    }

    removeGitem(gitem){
        const index = this.gitems.indexOf(gitem);

        if(index < 0){
            console.error("removeGitem() index fail!", gitem);
            return ;
        }

        this.disposeGitem(gitem);
        scene.remove(gitem.mesh);
        this.gitems.splice(index, 1);
    }

    removeGitemsById(id){
        for(let i = this.gitems.length - 1; i >= 0; i --){
            if(this.gitems[i].id == id){
                //console.log('removeGitemsById', id, this.gitems[i]);
                this.removeGitem(this.gitems[i]);
                //this.gitems.splice(i, 1);
            }
        }
    }

    removeGitemsByGid(gid){
        for(let i = this.gitems.length - 1; i >= 0; i --){
            if(this.gitems[i].gid == gid){
                //console.log('removeGitemsById', id, this.gitems[i]);
                this.removeGitem(this.gitems[i]);
                //this.gitems.splice(i, 1);
            }
        }
    }

    removeGitemsByType(type){
        for(let i = this.gitems.length - 1; i >= 0; i --){
            if(this.gitems[i].type == type){
                this.removeGitem(this.gitems[i]);
                this.gitems.splice(i, 1);
            }
        }
    }

    removeGitemsBySceneId(id){
        for(let i = this.gitems.length - 1; i >= 0; i --){
            if(this.gitems[i].sceneId == id){
                this.removeGitem(this.gitems[i]);
                this.gitems.splice(i, 1);
            }
        }
    }

    removeGitemsAll(){
        for(let i = this.gitems.length - 1; i >= 0; i --){
                this.removeGitem(this.gitems[i]);
        }
    }

    makeBaseGitem(id){
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            undefined
        );

        const gitem = {
            id: id,
            mesh
        }

        return { gitem, mesh };
    }

    makeStaticGitem(_options = {}){
        const options = {
            id: 0,
            size: [1, 1],
            pos: { x: 0, y: 0, z: 0 },
            ... _options
        };

        // Mesh
        const mesh = new THREE.Mesh(undefined, undefined);
        mesh.position.set(options.pos.x, options.pos.y, options.pos.z);

        // Geometry
        mesh.geometry = new THREE.PlaneGeometry(...options.size);

        // Glsl
        const glsl = {
            id: options.id,
            iSize: options.size ?? [1, 1],
            ...options.glsl
        };

        mesh.material = ggGlslBuilder.buildGlsl(glsl);

        // Gitem
        const gitem = {
            id: options.id,
            mesh,
            pos: options.pos,
            size: options.size,
            update: (deltaTime) => mesh.material.update(deltaTime)
        };

        this.addGitem(gitem);

        return { gitem, mesh };
    }

    updateBaseGitem(gitem, options = {}){ console.log(gitem.mesh.geometry);
        // geometry
        // if(!gitem.mesh.geometry){
        //     gitem.mesh.geometry = new THREE.PlaneGeometry(1, 1);
        // }

        // Size
        if(options.size){
            gitem.size = options.size;

            if(gitem?.mesh?.material?.uniforms?.iSize)
                gitem.mesh.material.uniforms.iSize.value = options.size;

            if(gitem?.mesh?.material?.uniforms?.iResolution)
                gitem.mesh.material.uniforms.iResolution.value = options.size;

            gitem.mesh.scale.x = options.size[0];
            gitem.mesh.scale.y = options.size[1];

            //gitem.mesh.geometry.dispose?.();
            //gitem.mesh.geometry = new THREE.PlaneGeometry(...gitem.size);
            //gitem.mesh.geometry = new THREE.PlaneGeometry(...gitem.size);
        }

        // Positions
        if(options.pos){
            gitem.mesh.position.set(options.pos.x, options.pos.y, options.pos.z);
            gitem.position = gitem.mesh.position.clone();
        }

        // Glsl
        if(options.glsl && gitem.mesh.material.type === 'MeshBasicMaterial'){
            gitem.mesh.material.dispose();

            const glsl = {
                id: gitem.id,
                iSize: options.size ?? [1, 1],
                ...options.glsl
            };

            gitem.mesh.material = this.makeMaterial(glsl);
            gitem.update = (deltaTime) => gitem.mesh.material.update(deltaTime);
        }
    }

    makeAutoGitem(options = {}){
        const glsl = {
            id: options.id,
            iSize: options.size ?? [1, 1],
            ...options.material
        };

        const material = this.makeMaterial(glsl);

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            material
        );

        if(options.pos)
            mesh.position.set(options.pos.x, options.pos.y, options.pos.z);

        if(options.size)
            mesh.scale.set(options.size.x, options.size.y, 1);

        const gitem = {
            id: options.id,
            mesh,
        };

        mesh.gitem = gitem;

        if(options.gid)
            gitem.gid = options.gid;

        if(options.clickback){
            mesh.clickback = options.clickback;
        }

        if(options.getScreen && !gitem.updateScreen){
            gitem.updateScreen = () => {
                const item = options.getScreen();

                if (item.size) {
                    gitem.size = item.size;

                    if (gitem?.mesh?.material?.uniforms?.iSize)
                        gitem.mesh.material.uniforms.iSize.value = item.size;

                    if (gitem?.mesh?.material?.uniforms?.iResolution)
                        gitem.mesh.material.uniforms.iResolution.value = item.size;

                    gitem.mesh.scale.x = item.size.x;
                    gitem.mesh.scale.y = item.size.y;
                }

                if (item.pos) {
                    gitem.mesh.position.set(item.pos.x, item.pos.y, item.pos.z);
                    gitem.position = gitem.mesh.position.clone();
                }
            }

            gitem.updateScreen();
        }

        if(options.update){
            gitem.update = () => { options.update(); }
        } else if(material.update)
            gitem.update = (deltaTime) => material.update(deltaTime);

        this.addGitem(gitem);

        return gitem;
    }

    update(deltaTime) {
        for (let i = this.gitems.length - 1; i >= 0; i--) {
            const gitem = this.gitems[i];

            if (gitem.update)
                gitem.update(deltaTime);

            if (gitem.remove)
                this.removeGitem(gitem);
        }
    }

    updateScreen(){
        for(const item of this.gitems){
            if(item.updateScreen)
                item.updateScreen();
        }
    }

    // Tweaks
    tweaks = [];

    addTweak(item, _tweak = {}){
        if(!item.tweaks)
            item.tweaks = [];

        // Init
        let tweak = {
            time : 1000,
            onStart: undefined,
            onTime: undefined,
            onEnd: undefined,
            ... _tweak
        };

        // Add
        item.tweaks.push(tweak);

        // Exsist
        let ext = this.tweaks.find(obj => obj == item);
        if(!ext)
            this.tweaks.push(item);
    }

    updateTweaks(){
        for(let i = this.tweaks.length - 1; i >= 0; i --){
            const item = this.tweaks[i];

            // New
            if(!item.tweak){
                if(item.tweaks.length){
                    const tweak = item.tweaks[0];

                    // New tweak
                    item.tweak = new mglTweak();
                    item.tweak.start(tweak.time ? tweak.time : 1000);

                    // Calls
                    item.tweak.onStart = tweak.onStart;
                    item.tweak.onTime = tweak.onTime;
                    item.tweak.onEnd = tweak.onEnd;

                    item.tweak.onStart?.();
                } else {
                    this.tweaks.splice(i, 1);
                    continue;
                }
            } else {
                const tweak = item.tweaks[0];
                tweak.value = item.tweak.value();
                item.tweak.onTime?.();

                if(item.tweak.end()){
                    item.tweak.onEnd?.();
                    const remove = tweak.remove == true ? tweak.item : undefined;

                    item.tweaks.splice(0, 1);
                    delete item.tweak;

                    if(remove){
                        this.tweaks.splice(i, 1);
                        this.removeGitem(remove);
                    }
                }
            }
        }
    }

};

// Scene class
export class mglScene extends mglGitems {
    constructor() {
        super();
    }

    onStart(){
    }

    makeMaterial(){
        return new THREE.MeshBasicMaterial({ color: 0xffffff });
    }

    onStop(){
        this.removeGitemsAll();
    }
};

// Scenes Builder
export class mglScenes {
    // Preload
    preloadFiles = [];
    preloadFile(id, file){
        this.preloadFiles.push({ id, file });
    }

    onLoadApp(mglFiles){
        this.mglFiles = mglFiles;

        this.preloadFiles.forEach(item => {
            mglFiles.loadFile(item.id, item.file);
        });
    }

    getLoadedFile(id){
        return this.mglFiles?.getFile(id);
    }

    // Scenes
    scenesList = [];
    scenesActive = [];

    registerScene(id, sceneClass){
        this.scenesList[id] = sceneClass;
    }

    gotoScene(id, options = {}){
        const sceneClass = this.scenesList[id];
        if(!sceneClass)
            return console.error(`mglScenes.gotoScene(): Scene ${id} not exist.`);

        // Close active scenes
        if(!options.childscene){
            for(let index = this.scenesActive.length - 1; index >= 0; index --){
                //this.closeScene(this.scenesActive[i].sceneId);
                this.scenesActive[index].onStop();
                this.scenesActive.splice(index, 1);
            }
        }

        // Add new scene
        const sceneInstance = new sceneClass(this);
        this.scenesActive.push(sceneInstance);
        sceneInstance.sceneId = id;

        sceneInstance.onStart();
    }

    updateScenes(deltaTime){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.update(deltaTime);
        }
    }

    updateScreenScenes(deltaTime){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.updateScreen();
        }
    }

    // Screen
    screen = [];

    setScreen(){
        // Screen for static Z
        const fov = camera.fov * (Math.PI / 180); // Преобразуем FOV в радианы
        const distance = camera.position.z; // Расстояние до камеры

        // Вычисляем высоту видимой области
        const height = 2 * Math.tan(fov / 2) * distance;

        // Вычисляем ширину видимой области с учетом соотношения сторон
        const aspect = window.innerWidth / window.innerHeight;
        const width = height * aspect;

        // Screen
        this.screen = {
            px: window.innerWidth, // Pixels
            py: window.innerHeight,
            sx: width, // Three screen size
            sy: height,
            size: [width, height],
            ratio: width / height,
            textSize: Math.min(width / (8 * .6), height / 4)
        };

        if(this.screen.ratio > 1.5)
            this.screen.areaType = 0;
        else
            this.screen.areaType = 1;

        console.log("New screen!", window.innerWidth, window.innerHeight, this.screen.size, this.screen);

        this.updateScreenScenes();
    }

    // Mouse
    mouse = [];

    mglOnTouchStart(event){
        if(this.touchId === null){
            const touch = event.touches[0];
            this.touchId = touch.identifier;

            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            event.isPrimary = true;

            this.mglOnPointDown(event);
        }
    }

    mglOnTouchMove(event){
        const touch = Array.from(event.touches).find(t => t.identifier === this.touchId);
        if(touch){
            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            event.isPrimary = true;

            this.mglOnPointMove(event);
        }
    }

    mglOnTouchEnd(event){
        if (Array.from(event.changedTouches).some(t => t.identifier === this.touchId)){
            this.touchId = null;
            event.isPrimary = true;
            this.mglOnPointUp(event);
        }
    }

    mglOnPointDown(event){
        if(!event.isPrimary)
            return ;

        // Begin
        this.pointDown = performance.now();
        this.pointMove = 0;
        this.pointPos = {x: event.clientX, y: event.clientY};
        this.userOnPointDown(event);
    }

    mglOnPointMove(event){
        if(!event.isPrimary)
            return ;

        //if(!this.pointDown)
        //    return ;

        this.pointMove = 1;
        this.userOnPointMove(event);
        this.pointPos = {x: event.clientX, y: event.clientY};

        return ;
    }

    mglOnPointUp(event){
        if(!event.isPrimary)
            return ;

        this.pointDown = 0;
        this.userOnPointUp(event);

        return ;
    }

    mglOnPointClick(event){
        this.userOnPointClick(event);
        return ;
    }

    // User call
    onStartApp(){}

    // Callbacks
    callback(data){ console.log('callback', data); } // general
    callbutton(data){ console.log('callbutton', data);} // button

    // Update Animate
    update(time, deltaTime){
        this.updateScenes(deltaTime);
    }

    // Screen
    getScreenPointAtXY(camera, z, normalizedX, normalizedY){
        // Convert normalized coordinates (0..1) to NDC (-1..1)
        const ndcX = (normalizedX * 2) - 1; // 0..1 -> -1..1
        const ndcY = -(normalizedY * 2) + 1; // 0..1 -> 1..-1 (invert Y)

        // Cast a ray from the camera through the specified screen point
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

        // Plane at the specified Y height
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);

        // Find the intersection of the ray with the plane
        const point = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, point);

        return point;
    }

    getScreenCornersAtY(y) {
        // Нормализованные координаты углов экрана (-1..1)
        const cornersNDC = [
            new THREE.Vector3(-1, -1, -1), // Левый нижний (near)
            new THREE.Vector3(1, -1, -1),  // Правый нижний
            new THREE.Vector3(1, 1, -1),    // Правый верхний
            new THREE.Vector3(-1, 1, -1),  // Левый верхний
            new THREE.Vector3(-1, -1, -1), // Левый нижний снова
        ];

        const raycaster = new THREE.Raycaster();
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y); // Плоскость y = yValue
        const worldCorners = [];

        cornersNDC.forEach(ndc => {
            raycaster.setFromCamera(ndc, camera);
            const point = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, point);
            worldCorners.push(point);
        });

        return worldCorners; // [leftBottom, rightBottom, leftTop, rightTop]
    }

    getScreenPointByCorners(corners, x, y) {
        // Проверяем, что x и y находятся в диапазоне от 0 до 1
        //if (x < 0 || x > 1 || y < 0 || y > 1) {
        //    throw new Error("x и y должны быть в диапазоне от 0 до 1");
        //}

        // Интерполяция по вертикали между верхними и нижними углами
        const top = corners[0].clone().lerp(corners[1], x); // верхняя линия
        const bottom = corners[3].clone().lerp(corners[2], x); // нижняя линия

        // Интерполяция по горизонтали между верхней и нижней линиями
        const point = top.lerp(bottom, y);

        return point;
    }

    // Test
    // testDuplicateValues(enumObj){
    //     const values = Object.values(enumObj);
    //     const uniqueValues = new Set(values);
    //     return values.length !== uniqueValues.size;
    // }

    // getDuplicateValues(enumObj){
    //     const values = Object.values(enumObj);
    //     return values.filter((item, index) => values.indexOf(item) !== index);
    // }

    testDuplicateValues(enumObj) {
        const seen = new Set();
        const duplicates = new Set();

        for (const value of Object.values(enumObj)) {
            if (seen.has(value)) {
                duplicates.add(value);
            } else {
                seen.add(value);
            }
        }
        return [...duplicates];
    }

};