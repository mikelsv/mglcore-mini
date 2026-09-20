// Scenes Builder
export class mglScenes {
    constructor(){
        // Touchpad
        if('ontouchstart' in window){
            this.touchId = null;
            this.touchOn = true;
            window.addEventListener('touchstart', this.mglOnTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.mglOnTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.mglOnTouchEnd.bind(this), { passive: false });
            window.addEventListener('click', this.mglOnPointClick.bind(this), { passive: false });
        } else {
            this.touchOn = false;
            window.addEventListener('pointerdown', this.mglOnPointDown.bind(this), false);
            window.addEventListener('pointermove', this.mglOnPointMove.bind(this), false);
            window.addEventListener('pointerup', this.mglOnPointUp.bind(this), false);
            window.addEventListener('click', this.mglOnPointClick.bind(this), { passive: false });
        }
    }

    // Preload
    preloadFiles = [];
    preloadFile(id, file) {
        this.preloadFiles.push({ id, file });
    }

    onLoadApp(mglFiles) {
        this.mglFiles = mglFiles;

        this.preloadFiles.forEach(item => {
            mglFiles.loadFile(item.id, item.file);
        });
    }

    getLoadedFile(id) {
        return this.mglFiles?.getFile(id);
    }

    getTexture(id){
        return this.mglFiles.getTexture(id);
    }

    // Scenes
    scenesList = [];
    scenesActive = [];

    registerScene(id, sceneClass) {
        this.scenesList[id] = sceneClass;
    }

    isActive(id) {
        return this.scenesActive.find(item => item.sceneId == id);
    }

    gotoScene(id, options = {}) {
        const sceneClass = this.scenesList[id];
        if (!sceneClass)
            return console.error(`mglScenes.gotoScene(): Scene ${id} not exist.`);

        // Close active scenes
        if (!options.childscene) {
            for (let index = this.scenesActive.length - 1; index >= 0; index--) {
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

    updateScenes(deltaTime) {
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.update(deltaTime);
        }
    }

    updateScreenScenes(deltaTime) {
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.updateScreen?.();
        }
    }

    // Mouse
    mglOnTouchStart(event) {
        if (this.touchId === null) {
            const touch = event.touches[0];
            this.touchId = touch.identifier;

            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            event.isPrimary = true;

            this.mglOnPointDown(event);
        }
    }

    mglOnTouchMove(event) {
        const touch = Array.from(event.touches).find(t => t.identifier === this.touchId);
        if (touch) {
            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            event.isPrimary = true;

            this.mglOnPointMove(event);
        }
    }

    mglOnTouchEnd(event) {
        if (Array.from(event.changedTouches).some(t => t.identifier === this.touchId)) {
            this.touchId = null;
            event.isPrimary = true;
            this.mglOnPointUp(event);
        }
    }

    mglOnPointDown(event) {
        if (!event.isPrimary)
            return;

        // Begin
        this.pointDown = performance.now();
        this.pointMove = 0;
        this.pointPos = { x: event.clientX, y: event.clientY };
        this.userOnPointDown(event);
    }

    mglOnPointMove(event) {
        if (!event.isPrimary)
            return;

        //if(!this.pointDown)
        //    return ;

        this.pointMove = 1;
        this.userOnPointMove(event);
        this.pointPos = { x: event.clientX, y: event.clientY };

        return;
    }

    mglOnPointUp(event) {
        if (!event.isPrimary)
            return;

        this.pointDown = 0;
        this.userOnPointUp(event);

        return;
    }

    mglOnPointClick(event) {
        this.userOnPointClick(event);
        return;
    }

    // User call
    onStartApp() { }
    userOnPointDown(event){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.userOnPointDown?.(event);
        }
    }

    userOnPointMove(event){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.userOnPointMove?.(event);
        }
    }

    userOnPointUp(event){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.userOnPointUp?.(event);
        }
    }

    userOnPointClick(event){
        for (let index in this.scenesActive) {
            const scene = this.scenesActive[index];
            scene.userOnPointClick?.(event);
        }
    }

    // Callbacks
    callback(data) { console.log('callback', data); } // general
    callbutton(data) { console.log('callbutton', data); } // button

    // Update Animate
    update(time, deltaTime) {
        this.updateScenes(deltaTime);
    }

    // Utils
    testDuplicateValues(enumObj, showAlert) {
        const seen = new Set();
        const duplicates = new Set();

        for (const value of Object.values(enumObj)) {
            if (seen.has(value)) {
                duplicates.add(value);
            } else {
                seen.add(value);
            }
        }

        if (!!showAlert && duplicates.size > 0)
            console.error(showAlert, duplicates);

        return [...duplicates];
    }
}