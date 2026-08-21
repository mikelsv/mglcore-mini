var mglPackage = {
    mglMain: 'main.js',
    mglLibPath: '../',
    mglExtScripts: [],
    mglScripts:[
        {src: "mglcore/mgl.core.js"},
        {src: "mglcore/mgl.build.js"},
        {src: "mglcore/mgl.gamer.js", bundle_raw: true},
        {src: "gamer.js", local: true },
    ],
    mglLocalMap: false,

    initImportMap() {
        this.importMap = {
            "imports": {
                "mglcore/": `${this.mglLibPath}mglcore/`,
                "three": `${this.mglLibPath}extern/three.module.js`,
                "three/addons/": `${this.mglLibPath}extern/addons/`,
                "lil-gui": `${this.mglLibPath}extern/lil-gui.esm.js`,
                "cannon-es": `${this.mglLibPath}extern/cannon-es.js`,
                "matter-js": `${this.mglLibPath}extern/matter.min.js`,
            }
        };
    },

    initImportMapLocal() {
        this.importMap = {
            "imports": {
                "mglcore/": `${this.mglLibPath}mglcore-mini/`,
                "three": "https://threejs.org/build/three.module.js",
                "three/addons/": "https://threejs.org/examples/jsm/",
                //"three": `${this.mglLibPath}extern/three.module.js`,
                //"three/addons/": `${this.mglLibPath}extern/addons/`,
                "lil-gui": `${this.mglLibPath}extern/lil-gui.esm.js`,
                "cannon-es": `${this.mglLibPath}extern/cannon-es.js`,
                "matter-js": `${this.mglLibPath}extern/matter.min.js`,
            }
        };
    },

    applyImportMap() {
        // Проверяем, инициализирована ли карта импортов
        if (!this.importMap || !this.importMap.imports) {
            this.initImportMap();
        }

        const imports = this.importMap.imports;

        // Перебираем каждый скрипт в массиве
        this.mglScripts = this.mglScripts.map(script => {
            // Ищем подходящий префикс в importMap
            for (const [key, value] of Object.entries(imports)) {
                if (script.src.startsWith(key)) {
                    // Заменяем ключ на реальный путь
                    script.src = script.src.replace(key, value);
                    break; // Прерываем цикл, так как совпадение найдено
                }
            }
            return script;
        });
    },

    injectHtml(){
        if(mglPackage.mglMain)
            this.mglScripts.push({ src: this.mglMain, local: true, type: "module" });

        if(this.mglLocalMap)
            this.initImportMapLocal();
        else
            this.initImportMap();

        this.applyImportMap();

        this.injectImportScripts(this.mglExtScripts);
        this.injectImportScripts(this.mglScripts);
    },

    makeCleanHtml(){
        this.mglScripts.push({ src: this.mglMain, local: true, type: "module" });

        if(this.mglLocalMap)
            this.initImportMapLocal();
        else
            this.initImportMap();

        let html = "<script type=importmap>" + JSON.stringify(this.importMap, null, 2) + "</script>\r\n";
        html = this.addScripts(html, this.mglExtScripts);
        html = this.addScripts(html, this.mglScripts);

        return html;
    },

    addScripts(html, scripts){
        for(let i = 0; i < scripts.length; i ++){
            let item = scripts[i];
            //let src = !item.local ? `${this.mglLibPath}${item.src}` : item.src;
            let src = item.src;
            let type = !item.type ? '' : " type=" + item.type;
            const ext = !item.bundle_ignore ? '' : 'bundle-ignore ';
            const raw = !item.bundle_raw ? '' : 'bundle-raw ';

            // Insert
            if(item.src)
                html += `<script ${ext}${raw}src='${src}'${type}></script>\r\n`;
            if(item.code)
                html += item.code;
        }

        return html;
    },

    // Dynamic Import Map
    injectImportMap(){
        if(this.mglLocalMap)
            this.initImportMapLocal();
        else
            this.initImportMap();

        // Apply importmap
        const script = document.createElement('script');
        script.type = 'importmap';
        script.textContent = JSON.stringify(this.importMap);
        document.head.appendChild(script);
    },

    injectImportScripts(list){
        for(let i = 0; i < list.length; i ++){
            this.loadScript(list[i]);
        }
    },

    loadScript(item) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            //script.src = !item.local ? `${this.mglLibPath}${item.src}` : item.src;
            script.src = item.src;
            script.defer = true;
            script.async = false;

            if(item.type)
                script.type = item.type;

            script.onload = () => {
                //console.log(`${item.src} loaded successfully.`);
                resolve();
            };

            script.onerror = () => {
                console.error(`Error loading script ${item.src}.`);
                reject(new Error(`Error loading script ${item.src}`));
            };

            document.head.appendChild(script);
        });
    }
};

function mglPackageInit(main){
    if(main || main === null)
        mglPackage.mglMain = main;

    mglPackage.injectImportMap();
    mglPackage.injectHtml();
}

function mglPackageInitLocal(main){
    mglPackage.mglLocalMap = true;
    mglPackageInit(main);
}

if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglPackage };
}