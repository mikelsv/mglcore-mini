let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "vkontakte",
    debug: false,
    startedLevel: false,

    // Vkontakte
    vkBridge: undefined,
    bestScore: 0,

    bonusFlags: {
        BONUS_OPEN: 1,
        BONUS_REWARDED: 2,
        BONUS_ERROR: 3,
        BONUS_CLOSE: 4,
        BONUS_SKIP: 5
    },

    leaderboardFlags: {
        GET: 1,
        SET: 2,
        GETSET: 3,
        SETUP: 4,
        //SETREP: 6,
        //GETSETREP: 7
    },

    init(){
        mglBuild.log("mglBuild.init() for ", this.platform);
    },

    startApp(){
        mglBuild.log("mglBuild. App started!");
    },

    startLevel(){
        this.startedLevel = true;
        mglBuild.log("mglBuild. Level started!");
    },

    stateLevel(){
        return this.startedLevel;
    },

    stopLevel(){
        this.startedLevel = false;
        mglBuild.log("mglBuild. Level ended!");
    },

    loadPlayerData(key){
        return mglBuild.gameData["gamerdata"];
    },

    async savePlayerData(key, value) {
        try {
            const stringifiedValue = JSON.stringify(value);
            await this.vkBridge.send("VKWebAppStorageSet", {
                key: "gamerdata",
                value: stringifiedValue
            });
            this.gameData["gamerdata"] = value;
            return true;
        } catch (e) {
            console.error("mglBuild. Save data error:", e);
            return false;
        }
    },

    // Token
    async getAuthToken() {
        if (this.vkToken) return this.vkToken;

        try {
            // Берем appId из GET-параметров URL (?vk_app_id=123456)
            const urlParams = new URLSearchParams(window.location.search);
            const appId = parseInt(urlParams.get('vk_app_id'), 10);

            if (!appId) {
                console.warn("mglBuild: vk_app_id not found in URL");
                return null;
            }

            const data = await this.vkBridge.send("VKWebAppGetAuthToken", {
                app_id: appId,
                scope: "" // Пустые права, окно разрешений обычно не беспокоит игрока
            });

            if (data && data.access_token) {
                this.vkToken = data.access_token;
                return this.vkToken;
            }
        } catch (e) {
            console.warn("mglBuild: Failed to get auth token:", e);
        }
        return null;
    },

    // Adversiting
    async showReward(callback) {
        callback(this.bonusFlags.BONUS_OPEN);
        try {
            const data = await this.vkBridge.send("VKWebAppShowNativeAds", {
                ad_format: "reward"
            });

            if (data.result) {
                // Реклама просмотрена полностью
                callback(this.bonusFlags.BONUS_REWARDED);
                callback(this.bonusFlags.BONUS_CLOSE, true);
            } else {
                callback(this.bonusFlags.BONUS_ERROR);
            }
        } catch (error) {
            console.error("mglBuild. Rewarded Ad error:", error);
            callback(this.bonusFlags.BONUS_ERROR);
            callback(this.bonusFlags.BONUS_CLOSE, false);
        }
    },

    async showAdversiteInterstitial(callback) {
        const config = gamer.advertise.interstitial;
        const currentTime = Date.now() / 1000;

        if (config.enable && (currentTime - config.lastTime >= config.interval)) {
            callback(this.bonusFlags.BONUS_OPEN);
            try {
                const data = await this.vkBridge.send("VKWebAppShowNativeAds", {
                    ad_format: "interstitial"
                });

                if (data.result) {
                    config.lastTime = Date.now() / 1000;
                    callback(this.bonusFlags.BONUS_CLOSE, true);
                } else {
                    callback(this.bonusFlags.BONUS_ERROR);
                }
            } catch (error) {
                console.error("mglBuild. Interstitial Ad error:", error);
                callback(this.bonusFlags.BONUS_ERROR);
                callback(this.bonusFlags.BONUS_CLOSE, false);
            }
        } else {
            callback(this.bonusFlags.BONUS_CLOSE, false);
            this.log('mglBuild Ad skipped: cooldown or disabled');
        }
    },

    // Leaderboards
 // Автоматический лидерборд
    async autoLeaderboard(leaderboardName, newScore, flags) {
        try {
            // 1. SET: Тихо сохраняем счёт в фоне, БЕЗ показа окна
            if (flags & this.leaderboardFlags.SET) {
                newScore = Math.floor(newScore);

                if (newScore > this.bestScore) {
                    this.bestScore = newScore;

                    // Сохраняем в облако ВК, чтобы рекорд не сбросился при перезапуске
                    this.vkBridge.send("VKWebAppStorageSet", {
                        key: "best_score",
                        value: String(newScore)
                    }).catch(err => console.warn("mglBuild: Failed to save best_score", err));

                    console.log("mglBuild: New best score saved silently:", this.bestScore);
                }
            }

            // 2. GET: Открываем окно лидерборда ВК ТОЛЬКО при запросе
            if (flags & this.leaderboardFlags.GET) {
                console.log("mglBuild: Leaderboard requested, showing VK box...");
                await this.vkBridge.send("VKWebAppShowLeaderBoardBox", {
                    user_result: this.bestScore
                });

                // Возвращаем пустой массив, чтобы движок игры не падал
                return [];
            }
        } catch (error) {
            console.error('mglBuild.autoLeaderboard() error:', error);
            return [];
        }
    },

    // Прямой вызов лидерборда (обновляет рекорд и открывает окно)
    async resultToLiderboard(liderboardName, newScore) {
        newScore = Math.floor(newScore);

        if (newScore > this.bestScore) {
            this.bestScore = newScore;
            this.vkBridge.send("VKWebAppStorageSet", {
                key: "best_score",
                value: String(newScore)
            }).catch(() => {});
        }

        try {
            await this.vkBridge.send("VKWebAppShowLeaderBoardBox", {
                user_result: this.bestScore
            });
        } catch (error) {
            console.error("mglBuild. Leaderboard error:", error);
        }

        return [];
    },

    // Local language control
    isLocalLang(){
        return false;
    },

    updateLang(){
        const urlParams = new URLSearchParams(window.location.search);
        const vkLang = urlParams.get('vk_language') || 'ru';

        if (vkLang === "ru") {
            gamer.gameData.lang = "ru";
        } else {
            gamer.gameData.lang = "en";
        }
    },

    // Auth html message
    getAuthHtml(text = 'Clickt to auth'){
        return '';
    },

    getSdkScripts(){
        return [
            { src: 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js', bundle_ignore: true }
        ];
    }
};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);

    mglBuild.vkBridge = window.vkBridge;

    try {
        await mglBuild.vkBridge.send('VKWebAppInit');
        mglBuild.log("VK Bridge initialized successfully");
    } catch (e) {
        console.error("VK Bridge init error:", e);
    }

       // 3. Получаем ID пользователя из GET-параметров окна запуска
    const urlParams = new URLSearchParams(window.location.search);
    mglBuild.playerId = urlParams.get('vk_user_id');

    // 4. Загрузка сохранений пользователя из VK Cloud Storage
    try {
        const storageData = await mglBuild.vkBridge.send("VKWebAppStorageGet", {
            keys: ["gamerdata"]
        });

        if (storageData && storageData.keys && storageData.keys[0]) {
            const rawValue = storageData.keys[0].value;
            // Если данные есть, парсим JSON
            mglBuild.gameData = {
                gamerdata: rawValue ? JSON.parse(rawValue) : {}
            };
        } else {
            mglBuild.gameData = { gamerdata: {} };
        }
    } catch (e) {
        console.warn("mglBuild: Failed to load player data from VK Storage", e);
        mglBuild.gameData = { gamerdata: {} };
    }

    const scoreData = await mglBuild.vkBridge.send("VKWebAppStorageGet", { keys: ["best_score"] });
    if (scoreData?.keys?.[0]?.value) {
        mglBuild.bestScore = parseInt(scoreData.keys[0].value, 10) || 0;
    }
}

// Module
if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild };
}