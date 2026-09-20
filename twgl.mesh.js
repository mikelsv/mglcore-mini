import * as twgl from 'twgl';
import { twglApp, canvas, webgl, webgl as gl, renderInfo, worldTime, deltaTime, camera } from 'mglcore/twgl.app.js';
//import { camera } from './scenes.js';

// Single but slow mesh. Demo only. Use twglMultiMesh.
export class twglSingleMesh {
    constructor({
        position = [0, 0, 0],
        rotationZ = 0,
        size = [1, 1],
        visible = true,
        uniforms = {}
    } = {}) {
        const vs = this.getVertexShader();
        const fs = this.getFragmentShader();

        // Program
        this.programInfo = twgl.createProgramInfo(gl, [vs, fs]);
        renderInfo.programs.length++;

        if (!this.programInfo) {
            console.error("⚠️ createProgramInfo() is FAILED!");
        }

        // Draw buffer
        const planeTransform = twgl.m4.rotationX(-Math.PI / 2);
        this.bufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 1, 1, 1, 1, planeTransform);
        renderInfo.memory.geometries++;

        const sizeArr = Array.isArray(size) ? size : [size, size];

        // Make mesh
        this.position = position;
        this.rotationZ = rotationZ;
        this.size = sizeArr;
        this.visible = visible;
        this.uniforms = uniforms;
    }

    getVertexShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec3 position;
in vec2 texcoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec2 vUv;

void main() {
  vUv = texcoord;
  gl_Position = u_projection * u_view * u_model * vec4(position, 1.0);
}
  `;
    }

    getFragmentShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;

uniform float iTime;

void main() {
  vec2 uv = vUv;
  vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
  fragColor = vec4(col,1.0);
}
`;
    }

    getModelMatrix() {
        let model = twgl.m4.translation([this.position[0], this.position[1], this.position[2]]);
        if (this.rotationZ !== 0) model = twgl.m4.rotateZ(model, this.rotationZ);

        model = twgl.m4.scale(model, [this.size[0], this.size[1], 1]);
        return model;
    }

    hitTest(worldX, worldY) {
        if (!this.visible)
            return;

        // 1. Находим вектор от центра меша до точки клика
        const dx = worldX - this.position[0];
        const dy = worldY - this.position[1];

        // 2. Отменяем поворот (вращаем вектор точки на угол -rotationZ)
        // Если rotationZ = 0, cos=1, sin=0, точка остается на месте
        const cos = Math.cos(-this.rotationZ);
        const sin = Math.sin(-this.rotationZ);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // 3. Вычисляем физические границы (от центра до краев)
        const halfWidth = this.size[0] / 2;
        const halfHeight = this.size[1] / 2;

        // 4. Проверяем, находится ли точка внутри прямоугольника
        return (
            localX >= -halfWidth &&
            localX <= halfWidth &&
            localY >= -halfHeight &&
            localY <= halfHeight
        );
    }

    draw() {
        if (!this.visible || !this.programInfo)
            return;

        gl.useProgram(this.programInfo.program);

        const model = this.getModelMatrix();

        const uniforms = {
            u_projection: camera.projection,
            u_view: camera.view,
            u_model: model,
            iTime: worldTime,
            ...this.uniforms
        };

        twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
        twgl.setUniforms(this.programInfo, uniforms);
        twgl.drawBufferInfo(gl, this.bufferInfo);
        renderInfo.trackBufferInfo(this.bufferInfo);
    }

    dispose(){
        const program = this.programInfo.program;
        const shaders = gl.getAttachedShaders(program);

        if (shaders) {
            for (let i = 0; i < shaders.length; i++) {
                const shader = shaders[i];
                gl.detachShader(program, shader);
                gl.deleteShader(shader);
            }
        }

        gl.deleteProgram(program);

        this.programInfo.program = null;
        this.programInfo.uniformSetters = null;
        this.programInfo.attribSetters = null;

        renderInfo.programs.length --;
    }
};

export class twglTextureMeshOld extends twglSingleMesh {
    getFragmentShader() {
        return /* glsl */ `
#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D iChannel0;

void main() {
    vec4 col = texture(iChannel0, vUv);
    //col.a += .5;
    fragColor = col;
}
        `;
    }

}


export class twglMultiMesh {
    static programCache = new Map();
    static sharedBufferInfo = null;

    constructor({
        position = [0, 0, 0],
        rotationZ = 0,
        size = [1, 1],
        visible = true,
        uniforms = {}
    } = {}) {
        const vs = this.getVertexShader();
        const fs = this.getFragmentShader();
        const cacheKey = vs + "###" + fs;

        if (!twglMultiMesh.programCache.has(cacheKey)) {
            const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
            if (!programInfo) {
                console.error("⚠️ twglMultiMesh: createProgramInfo() FAILED!");
            }
            twglMultiMesh.programCache.set(cacheKey, programInfo);

            if (typeof renderInfo !== 'undefined') {
                renderInfo.programs.length++;
            }
        }

        this.programInfo = twglMultiMesh.programCache.get(cacheKey);

        if (!twglMultiMesh.sharedBufferInfo) {
            const planeTransform = twgl.m4.rotationX(-Math.PI / 2);
            twglMultiMesh.sharedBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 1, 1, 1, 1, planeTransform);

            if (typeof renderInfo !== 'undefined') {
                renderInfo.memory.geometries++;
            }
        }
        this.bufferInfo = twglMultiMesh.sharedBufferInfo;

        const sizeArr = Array.isArray(size) ? size : [size, size];

        this.position = position;
        this.rotationZ = rotationZ;
        this.size = sizeArr;
        this.visible = visible;
        this.uniforms = uniforms;

        this._modelMatrix = twgl.m4.identity();

        this._drawUniforms = {
            u_projection: null,
            u_view: null,
            u_model: this._modelMatrix,
            iTime: 0,
        };
    }

    getVertexShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec3 position;
in vec2 texcoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec2 vUv;

void main() {
    vUv = texcoord;
    gl_Position = u_projection * u_view * u_model * vec4(position, 1.0);
}`;
    }

    getFragmentShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;

uniform float iTime;

void main() {
    vec2 uv = vUv;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    fragColor = vec4(col, 1.0);
}`;
    }

    getModelMatrix() {
        twgl.m4.translation(this.position, this._modelMatrix);
        if (this.rotationZ !== 0) {
            twgl.m4.rotateZ(this._modelMatrix, this.rotationZ, this._modelMatrix);
        }

        twgl.m4.scale(this._modelMatrix, [this.size[0], this.size[1], 1], this._modelMatrix);
        return this._modelMatrix;
    }

    hitTest(worldX, worldY) {
        if (!this.visible) return false;

        const dx = worldX - this.position[0];
        const dy = worldY - this.position[1];

        const cos = Math.cos(-this.rotationZ);
        const sin = Math.sin(-this.rotationZ);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const halfWidth = this.size[0] / 2;
        const halfHeight = this.size[1] / 2;

        return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
    }

  draw() {
        if (!this.visible || !this.programInfo) return;

        gl.useProgram(this.programInfo.program);
        this.getModelMatrix();

        this._drawUniforms.u_projection = camera.projection;
        this._drawUniforms.u_view = camera.view;
        this._drawUniforms.iTime = worldTime;

        twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
        twgl.setUniforms(this.programInfo, this._drawUniforms);

        if (Object.keys(this.uniforms).length > 0) {
            twgl.setUniforms(this.programInfo, this.uniforms);
        }

        twgl.drawBufferInfo(gl, this.bufferInfo);
        renderInfo.trackBufferInfo(this.bufferInfo);
    }

    dispose() {
        // You can realise it
    }
}


export class twglTextureMesh extends twglMultiMesh {
    getFragmentShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D iChannel0;

void main() {
    vec4 col = texture(iChannel0, vUv);
    //col.a += .5;
    fragColor = col;
}
        `;
    }
}

export class twglColoredMesh extends twglMultiMesh {
    getFragmentShader() {
        return /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;

uniform vec4 iColor;

void main() {
    fragColor = iColor;
}
        `;
    }
}