import * as twgl from 'twgl';
import { mglStats } from 'mglcore/mgl.stats.js';
import { twglImageLoader } from './twgl.loader.js';

// Canvas
export let canvas, webgl;
export let realTime = 0;
export let worldTime = 0;
export let deltaTime = 0;

export const renderInfo = {
    render: { calls: 0, triangles: 0, points: 0, lines: 0 },
    memory: { geometries: 0, textures: 0 },
    programs: { length: 0 },
};

// Camera
export let camera;

export class twglApp {
    constructor(){
        this.mglFiles = new twglImageLoader();
    }

    runApp(options = { alpha: true, depth: false, cameraType: 'orto' }){
        this.canvas = options.canvas;
        let size = !options.canvas ? { width: window.innerWidth, height: window.innerHeight } : { width: options.canvas.offsetWidth, height: options.canvas.offsetHeight };

        // Canvas
        if(!this.canvas){
            this.canvas = document.createElement('canvas');
            document.body.appendChild(this.canvas);
        }
        canvas = this.canvas;

        // Webgl
        webgl = this.canvas.getContext("webgl2", { alpha: true });
        if (!webgl) {
            console.error("WebGL2 is not supported by this browser!");
            console.error("WebGL2 не поддерживается этим браузером!");
            return;
        }

        // Depth
        if(options.depth){
            webgl.enable(webgl.DEPTH_TEST);
            webgl.depthFunc(webgl.LEQUAL);
        }

        // Alpha
        if(options.alpha){
            webgl.enable(webgl.BLEND);
            webgl.blendFunc(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA);
            //webgl.blendFuncSeparate(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA, webgl.ZERO, webgl.ONE);
        }

        // Twgl
        const arrays = {
            position: [
                -1, -1, 0, 1, -1, 0, -1, 1, 0,
                -1, 1, 0, 1, -1, 0, 1, 1, 0
            ],
        };

        twgl.createBufferInfoFromArrays(webgl, arrays);

        twgl.resizeCanvasToDisplaySize(webgl.canvas);
        webgl.viewport(0, 0, webgl.canvas.width, webgl.canvas.height);

        // Camera
        if(options.cameraType == 'orto')
            camera = new twglOrthoCamera({ position: [0, -0.01, 0.1], viewHeight: 4 });
        else if(options.cameraType == 'iso')
            camera = new twglIsoCamera({ position: [0, -0.01, 0.1], viewHeight: 4 });
        else if(options.cameraType == '2d')
            camera = new twgl2dCamera({ position: [0, 0, 0] });
        else if(options.cameraType == '2dlock')
            camera = new twgl2dLockCamera();

        // Style
        if(!options.canvas)
            Object.assign(this.canvas.style, {
            'top': '0',
            'left': '0',
            'width': '100%',
            'height': '100%',
            'outline': 'none',
            'position': 'fixed',
            'user-select': 'none',
            'touch-action': 'none',
            'overscroll-behavior': 'none',
            '-khtml-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none',
            '-webkit-text-size-adjust': 'none',
            '-webkit-touch-callout': 'none',
            '-webkit-user-drag': 'none',
            '-webkit-user-select': 'none',
        });

        // Info
        this.canvas.info = renderInfo;

        // Resize
        window.addEventListener('resize', () => {
            //camera.aspect = window.innerWidth / window.innerHeight;
            //camera.updateProjectionMatrix();
            //renderer.setSize(window.innerWidth, window.innerHeight);

            //if(options.onWindowResize)
            //    options.onWindowResize(window.innerWidth, window.innerHeight);
            this.onResizeApp();

            console.log("Window resized!", window.innerWidth, window.innerHeight);
        });

        // User call
        this.#loadApp();
    }

    #loadApp() {
        this.onLoadApp();

        this.mglFiles.asyncLoad()
            .then(() => {
                this.mglFiles.buildTextures(twgl, webgl);
                this.#initApp();
            })
            .catch((error) => {
                //this.mglFiles.getScreen().setError(error);
                console.error("error:", error);
            });
    }

    async #initApp(){
        // Init build
        await mglBuildInit();

        // Load game data
        gamer.loadGameData();
        mglBuild.updateLang();

        if(gamer.gameData.debug != undefined)
            mglBuild.debug = gamer.gameData.debug;

        const url = new URL(window.location.href);

        // Lock the context menu
        if(!mglBuild.debug && !url.searchParams.get("mglmenu")){
            //const canvas = renderer.domElement;
            canvas.addEventListener('contextmenu', (e) => {
                console.log("!contextmenu");
                e.preventDefault();
                return false;
            }, { passive: false });
        }

        // Stats
        if (mglBuild.debug) {
            this.stats = new mglStats(this.canvas);
            this.stats.showAllPanels();
        }

        this.onInitApp();
        this.#startApp();
    }

    #startApp(){
        mglBuild.log("Start app!", gamer.projectName, gamer.projectVers[0]);
        mglBuild.startApp();

        this.onStartApp();

        // Animate
        this.animateApp(performance.now());
    }

    // render stats
    resetRenderStats(){
        this.canvas.info.render.calls = 0;
        this.canvas.info.render.triangles = 0;
        this.canvas.info.render.points = 0;
        this.canvas.info.render.lines = 0;
    };

    animateApp(time){
         this.animationId = requestAnimationFrame(this.animateApp.bind(this));

        // Stats
        if(mglBuild.debug)
            this.stats.beginAnimate();

        // Calculate the time elapsed since the last frame
        const t = time / 1000;
        deltaTime = Math.min(t - realTime, 0.1);
        worldTime += deltaTime;
        realTime = t;

        // Draw
        this.resetRenderStats();
        twgl.resizeCanvasToDisplaySize(webgl.canvas);
        webgl.viewport(0, 0, webgl.canvas.width, webgl.canvas.height);
        webgl.clearColor(0.0, 0.0, 0.0, 0.0);
        webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

        // User call
        this.onAnimateApp();

        // Stats
        if(mglBuild.debug)
            this.stats.endAnimate();
    }

    onLoadApp(){}
    onInitApp(){}
    onStartApp(){}
    onAnimateApp(deltaTime){}

    onResizeApp(){}
};


export class twglOrthoCamera {
  constructor({
    position = [0, 0, 0],
    target = [0, 0, 0],
    up = [0, 0, 1],
    viewHeight = 1, // Сколько единиц 3D-мира помещается по высоте экрана
    near = -1000,
    far = 1000
  } = {}) {
    this.position = position;
    this.target = target;
    this.up = up;
    this.viewHeight = viewHeight; // Это и есть реальный масштаб/зум
    this.near = near;
    this.far = far;

    this.aspect = 1;
    this.view = twgl.m4.identity();
    this.projection = twgl.m4.identity();
    this.viewProj = twgl.m4.identity();
    this.invViewProj = twgl.m4.identity();

    //this.update();
  }

    get worldHeight() {
        return this.viewHeight;
    }

    get worldWidth() {
        return this.viewHeight * this.aspect;
    }

    get halfWidth() {
        return this.worldWidth / 2;
    }

    get halfHeight() {
        return this.worldHeight / 2;
    }

  /**
   * Обновляет матрицы под текущий размер canvas
   */
  update() {
    const m4 = twgl.m4;
    this.aspect = canvas.width / canvas.height;

    // 1. Матрица вида (LookAt)
    const cameraMat = m4.lookAt(this.position, this.target, this.up);
    this.view = m4.inverse(cameraMat);

    // 2. Ортографическая проекция
    const halfH = this.viewHeight / 2;
    const halfW = halfH * this.aspect;

    this.projection = m4.ortho(
      -halfW, halfW,
      -halfH, halfH,
      this.near, this.far
    );

    // 3. View-Projection и обратная матрица (для мыши)
    this.viewProj = m4.multiply(this.projection, this.view);
    this.invViewProj = m4.inverse(this.viewProj);
  }

  /**
   * Переводит экранные пиксели клика (clientX, clientY) в 3D точку на плоскости Z = 0
   */
  screenToPlane(screenX, screenY) {
    const m4 = twgl.m4;
    const v3 = twgl.v3;
    const rect = canvas.getBoundingClientRect();

    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

    const nearPt = m4.transformPoint(this.invViewProj, [ndcX, ndcY, -1]);
    const farPt  = m4.transformPoint(this.invViewProj, [ndcX, ndcY,  1]);
    const rayDir = v3.subtract(farPt, nearPt);

    if (Math.abs(rayDir[2]) < 1e-6) return [0, 0, 0];
    const t = -nearPt[2] / rayDir[2];

    return [
      nearPt[0] + rayDir[0] * t,
      nearPt[1] + rayDir[1] * t,
      0
    ];
  }
}

export class twglIsoCamera {
  constructor({
    // Точка в мире (на земле), которая находится в центре экрана
    position = [0, 0, 0],
    zoom = 12,
    near = -1000,
    far = 1000
  } = {}) {
    this.position = [...position];
    this.zoom = zoom;
    this.near = near;
    this.far = far;

    this.aspect = 1;
    this.view = twgl.m4.identity();
    this.projection = twgl.m4.identity();
    this.viewProj = twgl.m4.identity();
    this.invViewProj = twgl.m4.identity();
  }

  // Для совместимости: target ссылается на position
  get target() {
    return this.position;
  }
  set target(val) {
    this.position = val;
  }

  update(canvasElement) {
    const m4 = twgl.m4;

    // Берем переданный canvas или глобальный
    const c = canvasElement || (typeof canvas !== 'undefined' ? canvas : gl.canvas);
    this.aspect = c.width / c.height;

    // Точка, на которую направлен центр экрана
    const target = [this.position[0], this.position[1] || 0, this.position[2]];

    // Смещение камеры: сохраняем правильный угол (минус по X для осей как на скриншоте)
    const distance = 100;
    const eye = [
      target[0] - distance * 0.707, // минус X
      target[1] + distance * 0.816, // Y (подъем)
      target[2] + distance * 0.707  // плюс Z
    ];

    // 1. Матрица вида (смотрим из eye в target)
    const cameraMat = m4.lookAt(eye, target, [0, 1, 0]);
    this.view = m4.inverse(cameraMat);

    // 2. Ортографическая проекция
    const halfH = this.zoom / 2;
    const halfW = halfH * this.aspect;

    this.projection = m4.ortho(
      -halfW, halfW,
      -halfH, halfH,
      this.near, this.far
    );

    // 3. Итоговые матрицы
    this.viewProj = m4.multiply(this.projection, this.view);
    this.invViewProj = m4.inverse(this.viewProj);
  }

  /**
   * Клик по экрану -> точка на плоскости земли Y = 0
   */
  screenToGround(screenX, screenY, canvasElement) {
    const m4 = twgl.m4;
    const v3 = twgl.v3;
    const c = canvasElement || (typeof canvas !== 'undefined' ? canvas : gl.canvas);
    const rect = c.getBoundingClientRect();

    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

    const nearPt = m4.transformPoint(this.invViewProj, [ndcX, ndcY, -1]);
    const farPt  = m4.transformPoint(this.invViewProj, [ndcX, ndcY,  1]);
    const rayDir = v3.subtract(farPt, nearPt);

    if (Math.abs(rayDir[1]) < 1e-6) return [0, 0, 0];
    const t = -nearPt[1] / rayDir[1];

    return [
      nearPt[0] + rayDir[0] * t,
      0,
      nearPt[2] + rayDir[2] * t
    ];
  }
}

export class twgl2dCamera {
 constructor({
    // X, Y - позиция на карте. Z - высота камеры (отвечает за зум)
    position = [0, 0, 10],
    // В 2D-режиме "верх" экрана - это положительная ось Y
    up = [0, 1, 0],
    near = -1000,
    far = 1000
  } = {}) {
    this.position = [...position];
    this.up = up;
    this.near = near;
    this.far = far;

    this.aspect = 1;
    this.view = twgl.m4.identity();
    this.projection = twgl.m4.identity();
    this.viewProj = twgl.m4.identity();
    this.invViewProj = twgl.m4.identity();
  }

  // В этой версии зум привязан к высоте камеры (ось Z).
  // Чем выше камера (больше Z), тем больше юнитов мира попадает в экран.
  get viewHeight() {
    return Math.max(this.position[2], 0.1); // Ограничиваем минимальный зум 0.1
  }

  get worldWidth() {
    return this.viewHeight * this.aspect;
  }

  get halfWidth() {
    return this.worldWidth / 2;
  }

  get halfHeight() {
    return this.viewHeight / 2;
  }

  /**
   * Обновляет матрицы под текущий размер canvas
   */
  update() {
    const m4 = twgl.m4;
    this.aspect = canvas.width / canvas.height;

    // Камера всегда смотрит ровно в ту же точку X и Y, но на плоскости Z = 0
    // Это избавляет от любых перспективных перекосов!
    const target = [this.position[0], this.position[1], 0];

    // 1. Матрица вида (LookAt)
    const cameraMat = m4.lookAt(this.position, target, this.up);
    this.view = m4.inverse(cameraMat);

    // 2. Ортографическая проекция
    const halfH = this.viewHeight / 2;
    const halfW = halfH * this.aspect;

    this.projection = m4.ortho(
      -halfW, halfW,
      -halfH, halfH,
      this.near, this.far
    );

    // 3. View-Projection и обратная матрица (для мыши)
    this.viewProj = m4.multiply(this.projection, this.view);
    this.invViewProj = m4.inverse(this.viewProj);
  }

  /**
   * Переводит экранные пиксели клика в 3D точку на плоскости игры (Z = 0)
   */
  screenToPlane(screenX, screenY) {
    const m4 = twgl.m4;
    const v3 = twgl.v3;
    const rect = canvas.getBoundingClientRect();

    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

    const nearPt = m4.transformPoint(this.invViewProj, [ndcX, ndcY, -1]);
    const farPt  = m4.transformPoint(this.invViewProj, [ndcX, ndcY,  1]);
    const rayDir = v3.subtract(farPt, nearPt);

    // В этот раз мы ищем пересечение с плоскостью Z = 0
    if (Math.abs(rayDir[2]) < 1e-6) return [0, 0, 0];
    const t = -nearPt[2] / rayDir[2];

    return [
      nearPt[0] + rayDir[0] * t,
      nearPt[1] + rayDir[1] * t,
      0 // Z всегда 0
    ];
  }
}

export class twgl2dLockCamera {
    constructor(){
        this.position = [0, 0, 0];
        this.view = twgl.m4.identity();
        this.projection = twgl.m4.identity();
        this.gameWidth = 720;
        this.gameHeight = 1280;
    }

    // update() {
    //     // Проекция: 0 вверху слева, GAME_W/GAME_H внизу справа
    //     // twgl.m4.ortho(left, right, bottom, top, near, far)
    //     this.projection = twgl.m4.ortho(0, this.gameWidth, this.gameHeight, 0, -1000, 1000);
    //     this.view = twgl.m4.identity();
    // }

    update() {
        const targetAspect = this.gameWidth / this.gameHeight; // 720 / 1280 = 0.5625
        const screenAspect = canvas.width / canvas.height;

        let left = 0;
        let right = this.gameWidth;
        let top = 0;
        let bottom = this.gameHeight;

        if (screenAspect > targetAspect) {
            // Экран шире, чем 9:16 (например, ПК или планшет)
            // Расширяем видимую область по горизонтали влево и вправо
            const actualWidth = this.gameHeight * screenAspect;
            const deltaX = (actualWidth - this.gameWidth) / 2;
            left = -deltaX;
            right = this.gameWidth + deltaX;
            this.isWide = true;
        } else {
            // Экран уже, чем 9:16 (например, современные вытянутые смартфоны)
            // Расширяем видимую область по вертикали вверх и вниз
            const actualHeight = this.gameWidth / screenAspect;
            const deltaY = (actualHeight - this.gameHeight) / 2;
            top = -deltaY;
            bottom = this.gameHeight + deltaY;
            this.isWide = false;
        }

        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;

        // Строим проекцию с учетом новых границ.
        // Координаты (0, 0) до (720, 1280) гарантированно останутся в центре экрана без искажений.
        this.projection = twgl.m4.ortho(left, right, bottom, top, -1000, 1000);
        this.view = twgl.m4.identity();
    }

};




// Render info
renderInfo.trackBufferInfo = (bufferInfo, type = webgl.TRIANGLES) => {
    const count = bufferInfo.numElements || 0;

    if (type === webgl.TRIANGLES) {
        renderInfo.render.triangles += Math.floor(count / 3);
    } else if (type === webgl.LINES) {
        renderInfo.render.lines += Math.floor(count / 2);
    } else if (type === webgl.POINTS) {
        renderInfo.render.points += count;
    }

    renderInfo.render.calls++;
}

renderInfo.createTexture = (options) => {
    const texture = twgl.createTexture(webgl, options);

    renderInfo.memory.textures ++;

    texture.width = options.src.width;
    texture.height = options.src.height;

    return texture;
}

renderInfo.disposeTexture = (texture) => {
    if(texture){
        webgl.deleteTexture(texture);
        renderInfo.memory.textures --;
    }
}