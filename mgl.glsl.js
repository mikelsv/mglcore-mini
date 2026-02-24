import * as THREE from 'three';

export class mglGlsl {
    constructor(){
        this.shaderCache = new Map();
        this.shaderList = new Map();
    }

    getCommon(){
        return /* glsl */`
// Uniforms
uniform float iTime, iTimeMul, iTimeBegin;
uniform vec2 iResolution, iSize;
uniform sampler2D iChannel0;

// Varying
varying vec2 vUv;
`;
    }

    getVert(){
        const common = this.getCommon();

        return /* glsl */ `
${common}

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
    }

    getFrag_DELETE(options){
        const shaderMainById = {
            ['test']: 'drawTest',
        }

        const main = shaderMainById[options.id] ?? 'mainImage';

        const common = this.getCommon();

        return /* glsl */`
${common}

void mainImage(){
    vec2 uv = vUv;
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    gl_FragColor = vec4(col,1.0);
}

void drawTest(){
    gl_FragColor = vec4(1., 0., 0., 1.);
}

void main(){
    ${main}();
}
`;
    }

    getFrag(options){
        return this.getCommon() + this.getShader(options.id).main;
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

    makeMaterial(_options = {}){
        let options = {
            iChannel0: undefined,
            iSize: [1, 1],
            ... _options
        };

        const vertexShader = this.getVert();
        const fragmentShader = this.getFrag(options);

        // Cache key - based on shader sources
        const cacheKey = vertexShader + '||' + fragmentShader;

        let material;

        if (this.shaderCache.has(cacheKey)) {
            // Clone the material - the shader is not recompiled
            material = this.shaderCache.get(cacheKey).clone();
        } else {
            material = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone({}),
                vertexShader,
                fragmentShader,
                transparent: true,
                side: THREE.DoubleSide
            });
            this.shaderCache.set(cacheKey, material);
            material = material.clone();
        }

        material.uniforms = {
            iTime: { value: 0 },
            iTimeMul: { value: 1 },
            iTimeBegin: { value: performance.now() },
            iResolution: { value: options.iSize },
            iSize: { value: options.iSize },
            iChannel0: { value: options.iChannel0 },
        };

        material.update = function(deltaTime){
            material.uniforms.iTime.value += deltaTime;
        }

        this.finishMaterial(options, material);

        return material;
    }

    finishMaterial(options, material){}
};