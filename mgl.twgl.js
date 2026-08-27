import * as twgl from 'twgl';
import {mglStats} from 'mglcore/mgl.stats.js';

export let canvas, webgl;
export let deltaTime = 0;
export let worldTime = 0;
export let renderInfo;

export class twglApp {
    runApp(options = { alpha: true }){
        this.canvas = options.canvas;
        let size = !options.canvas ? { width: window.innerWidth, height: window.innerHeight } : { width: options.canvas.offsetWidth, height: options.canvas.offsetHeight };

        // Canvas
        if(!this.canvas){
            this.canvas = document.createElement('canvas');
            document.body.appendChild(this.canvas);
        }
        canvas = this.canvas;

        // Webgl
        webgl = this.canvas.getContext("webgl2");
        if (!webgl) {
            console.error("WebGL2 is not supported by this browser!");
            console.error("WebGL2 не поддерживается этим браузером!");
            return;
        }

        // Alpha
        if(options.alpha){
            webgl.enable(webgl.BLEND);
            webgl.blendFunc(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA);
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
        this.canvas.info = {
            render: { calls: 0, triangles: 0, points: 0, lines: 0 },
            memory: { geometries: 0, textures: 0 },
            programs: { length: 0 },
        };

        renderInfo = this.canvas.info;

        renderInfo.trackBufferInfo = (bufferInfo, type = webgl.TRIANGLES) => {
                const count = bufferInfo.numElements || 0;

                if (type === webgl.TRIANGLES) {
                    renderInfo.render.triangles += Math.floor(count / 3);
                } else if (type === webgl.LINES) {
                    renderInfo.render.lines += Math.floor(count / 2);
                } else if (type === webgl.POINTS) {
                    renderInfo.render.points += count;
                }

                renderInfo.render.calls ++;
            }

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

    #loadApp(){
        this.onLoadApp();
        this.#initApp();
    }

    async #initApp(){
        // Init build
        await mglBuildInit();

        // Load game data
        gamer.loadGameData();
        mglBuild.updateLang();

        // Lock the context menu
        if(!mglBuild.debug && !url.searchParams.get("mglmenu")){
            const canvas = renderer.domElement;
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
        deltaTime = (time - worldTime) / 1000;
        worldTime = time;

        // Draw
        this.resetRenderStats();
        webgl.viewport(0, 0, webgl.canvas.width, webgl.canvas.height);
        webgl.clearColor(1, 1, 1, 1);
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


export class twglMesh {
    constructor(){
        this.shaderList = new Map();
        this.bufferInfo = {};

        this.#init();
    }

    #init() {
        const arrays = {
            position: {
                numComponents: 2,
                data: [
                    -1, -1, 1, -1, -1, 1,
                    -1, 1, 1, -1, 1, 1
                ]
            },
            texcoord: {
                numComponents: 2,
                data: [
                    0, 0, 1, 0, 0, 1,
                    0, 1, 1, 0, 1, 1
                ]
            }
        };
        this.bufferInfo = twgl.createBufferInfoFromArrays(webgl, arrays);
    }

    getCommon(){
        return /* glsl */ `
#version 300 es
// Uniforms
precision mediump float;
uniform float iTime, iTimeBegin;
uniform vec2 iResolution;
uniform sampler2D iChannel0;

in vec2 vUv;

#define gl_FragColor mgl_FragColor
out vec4 mgl_FragColor;
`;
    }

    getVert(){
        return /* glsl */ `
#version 300 es
in vec2 position;
in vec2 texcoord;

uniform vec2 u_translation;
uniform vec2 u_scale;
uniform vec2 u_game_size;

out vec2 vUv;

void main() {
    vec2 pixel_pos = position * u_scale + u_translation;
    vec2 ndc = (pixel_pos / u_game_size) * 2.0 - 1.0;
    gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

    // Передаем текстурные координаты во фрагментный шейдер
    vUv = texcoord;
}
`;
    }

    setShader(shaderData = {}){
        if(!shaderData.id){
            console.log("mglGlsl.setShader() shaderData.id is empty!");
            return ;
        }

        this.shaderList.set(shaderData.id, shaderData);
    }

    getShader(id){
        if (!this.shaderList.has(id)) {
                console.warn(`mglGlsl.getShader() Shader with id "${id}" not found!`);
            return {
                main: /* glsl */ `
void main(){
    vec2 uv = vUv;
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    gl_FragColor = vec4(col,1.0);
}`
            };
        }

        return this.shaderList.get(id);
    }

    makeMesh(_options = {}){
        let options = {
            position: { x: 0, y: 0, sx: 100, sy: 100 },
            ..._options
        };

        const vertexShader = this.getVert();
        const shader = this.getShader(options.id);
        const fragmentShader = this.getCommon() + shader.main;

        const programInfo = twgl.createProgramInfo(webgl, [vertexShader, fragmentShader]);
        const uniforms = {};
        renderInfo.programs.length ++;

        // Shader uniforms
        shader.uniforms?.forEach(key => {
            if (key in options) {
                uniforms[key] = options[key];
            } else
                uniforms[key] = undefined;
        });

        return {
            // Базовые свойства, которые можно менять в любой момент из JS
            x: options.position.x,
            y: options.position.y,
            w: options.position.sx,
            h: options.position.sy,
            uniforms: uniforms, // Сюда можно докидывать любые кастомные uniforms (время, цвета и т.д.)
            bufferInfo: this.bufferInfo,

            // Метод отрисовки принимает глобальные параметры (например, u_resolution, u_time)
            draw(globalUniforms = {}) {
                webgl.useProgram(programInfo.program);
                twgl.setBuffersAndAttributes(webgl, programInfo, this.bufferInfo);

                // Собираем все uniform-переменные вместе
                const finalUniforms = {
                    u_game_size: [canvas.width, canvas.height],
                    // Центрируем сдвиг и размер, как в предыдущем шаге
                    u_translation: [this.x, this.y],
                    u_scale: [this.w / 2, this.h / 2],
                    ...this.uniforms,  // Применяем специфичные для меша данные
                    ...globalUniforms  // Применяем общие данные сцены (время, разрешение)
                };

                twgl.setUniforms(programInfo, finalUniforms);
                twgl.drawBufferInfo(webgl, this.bufferInfo);

                // Info
                const count = this.bufferInfo.numElements || 0;

                renderInfo.render.calls ++;
                renderInfo.render.triangles += Math.floor(count / 3);
            }
        }
    }
};