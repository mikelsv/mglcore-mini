import * as THREE from 'three';
import { scene, camera, renderer } from 'mglcore/mgl.app.js';

// level builder class

export class mglLevelBuilder{
    // Screen
    screen = [];
    mouse = [];

    mglSetScreen(){
        const fov = camera.fov * (Math.PI / 180); // Преобразуем FOV в радианы
        const distance = camera.position.z; // Расстояние до камеры

        // Вычисляем высоту видимой области
        const height = 2 * Math.tan(fov / 2) * distance;

        // Вычисляем ширину видимой области с учетом соотношения сторон
        const aspect = window.innerWidth / window.innerHeight;
        const width = height * aspect;

        // Screen
        //const shelveWidth = Math.min(width / 3, height / 1.5 / 16 * 9);

        this.screen.size = [width, height];
        this.screen.ratio = width / height;

        //this.shelveSize = [shelveWidth, shelveWidth / 16 * 9];
        this.textSize = Math.min(this.screen.size[0] / (8 * .6), this.screen.size[1] / 4);//this.screenSize[1] / 4;

        console.log("New screen!", window.innerWidth, window.innerHeight, this.screen.size);
    }

    // Scene
    sceneId = 0;

    // Textures
    textures = [];
    gitems = [];

    getTexture(id){
        let item = this.textures.find(item => item.id == id);
        if(item)
            return item.texture;

        return undefined;
    }

    addTexture(id, texture){
        let item = {
            id: id,
            texture: texture
        };

        this.textures.push(item);
    }

    removeTexture(id){
        let index = this.textures.findIndex(item => item.id === id);

        if(index !== -1){
            this.textures.splice(index, 1);
        }
    }

    clearTextures(){
        this.textures.length = 0;
    }

    // Font
    setFont(font){
        this.mglFont = font;
    }

    setFontTexture(font){
        this.mglFontTexture = font;
    }

    // Gitems
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

        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
        }
    }

    removeGitem(gitem){
        scene.remove(gitem.mesh);
        this.disposeGitem(gitem);
        //console.log('removeGitem', gitem);

        const index = this.gitems.indexOf(gitem);
        if(index > -1)
            this.gitems.splice(index, 1);
        else
            console.error("removeGitem() index fail!");
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

    // Mouse
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

    // Draw
    drawText2d(_optiopns = {}){
        let options = {
            text: "test",
            size: 1,
            color: 0xffffff,
            position: new THREE.Vector3(0, 0, 0),
            ... _optiopns
        };

        const material = new THREE.MeshBasicMaterial({
            color: options.color,
            side: THREE.DoubleSide
        });

        const shapes = this.mglFont.generateShapes(options.text, options.size);
        const geometry = new THREE.ShapeGeometry(shapes);

        geometry.computeBoundingBox();

        const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        geometry.translate(xMid, 0, 0);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(options.position);

        return mesh;
    }

    // Buttons
    makeText2d(text, color, size){
        const matLite = new THREE.MeshBasicMaterial( {
                    color: color,
                    //transparent: true,
                    //opacity: 0.4,
                    side: THREE.DoubleSide
                } );

        const shapes = this.mglFont.generateShapes(text, size);

        const geometry = new THREE.ShapeGeometry(shapes);

        geometry.computeBoundingBox();

        const xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );

        geometry.translate( xMid, 0, 0 );

        const mesh = new THREE.Mesh( geometry, matLite );

        return mesh;

        //let mesh = this.font.makeShapeText(text, 0xFFFFFF, size);
        //return mesh;
    }

    drawText(_options = {}){
        let options = {
            id: 0,
            size: 1,
            text: "",
            border: .5,
            texture: undefined,
            material: undefined,
            position: new THREE.Vector3(0, 0, 0),
            disable: false,
            dgreen: false,
            clickback: this.callbutton,
            clickdata: {},
            ... _options
        };

        // Text
        let txt = this.makeText2d(options.text, 0xffffff, options.size);
        txt.geometry.center();
        txt.position.copy(options.position);
        txt.position.z += .005;

        // Callback
        if(!options.disable){
            txt.clickback = options.clickback;
            txt.clickdata = options.clickdata;

            if(txt.clickdata)
                txt.clickdata.buttonId = options.id;
        }

        // Gitem
        let gitem = {
            id: options.id,
            mesh: txt
        };

        this.addGitem(gitem);

        return gitem;
    }

    drawButton(_options = {}){
        let options = {
            id: 0,
            size: 1,
            text: "",
            border: .5,
            texture: undefined,
            material: undefined,
            position: new THREE.Vector3(0, 0, 0),
            disable: false,
            dgreen: false,
            clickback: this.callbutton,
            clickdata: {},
            ... _options
        };

        // Text
        let txt = this.makeText2d(options.text, 0xffffff, options.size);
        txt.geometry.center();
        //txt.position.copy(options.position);
        txt.position.z += .005;

        // Card
        const width = txt.geometry.boundingBox.max.x - txt.geometry.boundingBox.min.x + options.border;
        const height = txt.geometry.boundingBox.max.y - txt.geometry.boundingBox.min.y + options.border;

        const cardGeometry = new THREE.PlaneGeometry(width, height);
        //const cardMaterial = this.matButton(width, height); //new THREE.MeshBasicMaterial({ color: 0x0077ff, side: THREE.DoubleSide });
        if(!options.material)
            if(!options.disable)
                options.material = new THREE.MeshBasicMaterial({ color: 0x0077ff, side: THREE.DoubleSide });
            else
                new THREE.MeshBasicMaterial({ color: options.dgreen ? 0x00ff77 : 0xD5E1EE, side: THREE.DoubleSide });

        const card = new THREE.Mesh(cardGeometry, options.material);


        // data
        //data.txt = txt;
        //data.aColor = 0xff0000;
        //{ type: type, txt: txt, aColor: 0xff0000, nColor: 0xffffff };

        // Callback
        if(!options.disable){
            card.clickback = options.clickback;
            card.clickdata = options.clickdata;

            if(card.clickdata)
                card.clickdata.buttonId = options.id;
        }

        let group = new THREE.Group();

        group.add(card);
        group.add(txt);
        group.position.copy(options.position);

        // Gitem
        let gitem = {
            id: options.id,
            mesh: group,
            size: { x: width, y: height }
        };

        this.addGitem(gitem);

        return gitem;
    }

    drawImageButton(_options = {}){
        let options = {
            id: 0,
            size: [1, 1],
            texture: undefined,
            material: undefined,
            position: new THREE.Vector3(0, 0, 0),
            geometryName: undefined,
            clickback: this.callbutton,
            clickdata: {},
            ... _options
        };

        if(!options.texture && !options.material){
            console.error("msLevelBuilder.makeImageButton(): texture or material is undefined!");
        }

        if(!options.material)
            options.material = new THREE.MeshBasicMaterial({
                map: options.texture,
                transparent: true,
                side: THREE.DoubleSide
            });

        let geometry;
        if(options.geometryName == "circle")
            geometry = new THREE.CircleGeometry(options.size / 2);
        else
            geometry = new THREE.PlaneGeometry(... options.size);
        const mesh = new THREE.Mesh(geometry, options.material);

        mesh.position.copy(options.position);

        // Callback
        if(options.clickdata && !options.clickdata.buttonId)
            options.clickdata.buttonId = options.id;

        mesh.clickback = options.clickback;
        mesh.clickdata = options.clickdata;

        // Gitem
        let gitem = {
            id: options.id,
            mesh: mesh
        };

        if(options.material.update)
            gitem.update = (time, deltaTime) => options.material.update(deltaTime);

        this.addGitem(gitem);

        return gitem;
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

                    //this.onStartTweak(tweak);

                    // if(tweak.type == msEnum.TWEAK_MOVE){
                    //     tweak.moveTo = new THREE.Vector3(tweak.moveTo.x, tweak.moveTo.y, 0.009);
                    //     tweak.position = item.tweaks[0].mesh.position.clone();
                    // }
                } else {
                    this.tweaks.splice(i, 1);
                    continue;
                }
            } else {
                const tweak = item.tweaks[0];
                tweak.value = item.tweak.value();
                item.tweak.onTime?.();
                //this.onWorkTweak(tweak);

                // if(tweak.type == msEnum.TWEAK_MOVE){
                //     const scale = tweak.scaleTo ? this.lerpValue(1, tweak.scaleTo, item.tweak.value()) : 1;

                //     tweak.mesh.position.copy(new THREE.Vector3().lerpVectors(tweak.position, tweak.moveTo, item.tweak.value()));
                //     tweak.mesh.scale.set(scale, scale, scale);
                //     //console.log(item.tweak.value(), tweak.position, tweak.moveTo, new THREE.Vector3().lerpVectors(tweak.position, tweak.moveTo, item.tweak.value()));
                // }

                if(item.tweak.end()){
                    item.tweak.onEnd?.();
                    //this.onEndTweak(tweak);
                    // if(tweak.type == msEnum.TWEAK_MOVE){
                    //     tweak.mesh.position.copy(tweak.moveTo);

                    //     if(tweak.scaleTo)
                    //         tweak.mesh.scale.set(tweak.scaleTo, tweak.scaleTo, tweak.scaleTo);

                    // }

                    // if(tweak.type == msEnum.TWEAK_CALL){
                    //     const call = tweak.call.bind(this);
                    //     call(tweak);
                    // }

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

    onStartTweak(tweak){}
    onWorkTweak(tweak){}
    onEndTweak(tweak){}

    // Callbacks
    callback(){} // general
    callbutton(data){} // button

    // Update
    update(time, deltaTime){} // Animate

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

    // Test
    testDuplicateValues(enumObj){
        const values = Object.values(enumObj);
        const uniqueValues = new Set(values);
        return values.length !== uniqueValues.size;
    }
};

export class mglGlslBuilder {
    buildCommon(){
        let timeBegin = performance.now();

        const commonShader = `
// Time uniforms
uniform float iTime, iTimeMul;
const float iTimeBegin = float(${timeBegin});

// Resolution
uniform vec2 iResolution;

// Channels
uniform sampler2D iChannel0;
uniform sampler2D iFontTexture;

// Varying
varying vec2 vUv;
`;

        return commonShader;
    }

        buildVert(){
        const commonShader = this.buildCommon();

        const vertexShader = `
${commonShader}

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

        return vertexShader;
    }

    buildFrag(options){
        let main = 'MainImage';

        const commonShader = this.buildCommon();

        const fragmentShader = `
${commonShader}

void MainImage(){
    vec2 uv = vUv;
    vec3 col = 0.5 + 0.5 * cos(iTime+uv.xyx+vec3(0,2,4));
    gl_FragColor = vec4(col, 1.);
}

void main(){
    ${main}();
}

`;

        return fragmentShader;
    }

    buildGlsl(_options = {}){
        let options = {
            type: 0,
            ... _options
        };

        const vertexShader = this.buildVert();
        const fragmentShader = this.buildFrag(options);

        const uniforms = {
            iResolution: { value: [1, 1] },
            iChannel0: { value: 0 },
            iFontTexture: { value: 0 },
            iTime: { value: 0 },
            iTimeMul: { value: 1 },
        };

        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        material.update = function(time, deltaTime){
            material.uniforms.iTime.value += deltaTime;
        }

        return material;
    }
};