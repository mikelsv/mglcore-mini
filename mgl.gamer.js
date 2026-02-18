// Gamer JS - load, store, save game values.

// Gamer:
// use gamer.loadGameData(); for load game data
// use gamer.gameData .value for get/set values
// use gamer.saveGameData() for save game data

// gamer.base: for base values
// gameg.init() for extended logic

// Set gamer:
// projectName: name of project
// projectVers: versions of project
// base: base values + update() for generated values
// lang: translate

// Use:
// gameData for get / set values

let gamer = {
    projectName: 'undefined',
    projectVers: [ // New to up
        ["0.0", "00.00.0000 00:00", "Not created yet."],
    ],

    base: {
        // Base values
        lang: 'en',

        update(){
            // update generate values
        }
    },

    gameData: {
        new(){
            // Set base values
            for(var key in gamer.base){
                const value = gamer.base[key];

                if (typeof value === 'function') {
                    this[key] = value;
                } else {
                    this[key] = JSON.parse(JSON.stringify(value));
                }
            }
        },

        init(){
            this.update();
        }
    },

    loadGameData(){
        const savedData = mglBuild.loadPlayerData(this.projectName + 'gameData');
        this.gameData.new();

        if (savedData){
            const gameData = JSON.parse(savedData); // Parsing data from a string

            this.gameData = {
                ...this.gameData, // Existing data
                ...gameData     // New data from saved JSON
            };
        }

        this.gameData.init();
    },

    saveGameData(){
        mglBuild.savePlayerData(this.projectName + 'gameData', JSON.stringify(this.gameData));

        if(mglBuild.debug)
            console.log('saveGameData', JSON.stringify(this.gameData));
    },

    resetGame(){
        for (let key in this.gameData) {
            if (typeof this.gameData[key] !== 'function') {
                delete this.gameData[key];
            }
        }

        this.gameData.new();
        this.gameData.init();
        this.saveGameData();
    },

    lang(id){
        let lang = this.langs[id];

        if(lang){
            let txt = lang[this.gameData.lang];

            if(txt)
                return txt;
        }

        console.error("Lang error: " + id);
        return id;
    },

    // Translations
    langs: {},

    // i18n
    init_i18n(){
        this.updateui_i18n();
    },

    updateui_i18n(root = document){
        root.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.dataset.i18n;
            el.innerHTML = this.lang_i18n(key);
        });

        root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            const key = el.dataset.i18nAriaLabel;
            el.setAttribute('aria-label', this.lang_i18n(key));
        });

        root.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            const key = el.dataset.i18nAlt;
            el.setAttribute('alt', this.lang_i18n(key));
        });

        root.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.dataset.i18nTitle;
            el.setAttribute('title', this.lang_i18n(key));
        });
    },

    lang_i18n(key, params) {
        const dict = gamer.i18n[gamer.gameData.lang] || {};
        const fallback = gamer.i18n.en || {};
        const value = dict[key] ?? fallback[key] ?? key;

        if (dict[key] === undefined) {
            console.warn(`mgl_i18n: Key "${key}" is missing in current language [${gamer.gameData.lang}]`);
        }

        return params ? gamer.interpolate_i18n(value, params) : value;
    },

    lang_i18n2(key, id, params) {
        const dict = gamer.i18n[gamer.gameData.lang] || {};
        const fallback = gamer.i18n.en || {};
        const value = dict[key]?.[id] ?? fallback[key]?.[id] ?? key;

        if (dict[key]?.[id] === undefined){
            console.warn(`mgl_i18n2: Key "${key}" is missing in current language [${gamer.gameData.lang}]`);
        }


        return params ? gamer.interpolate_i18n(value, params) : value;
    },


    interpolate_i18n(template, params = {}) {
        return String(template).replace(/\{(\w+)\}/g, (_, key) => (params[key] ?? `{${key}}`));
    },

    // Debug
    debug: {},

    // Temp
    tmp: [],
};