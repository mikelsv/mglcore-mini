let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "playgama",
    debug: false,

    bonusFlags: {
        BONUS_OPEN: 1,
        BONUS_REWARDED: 2,
        BONUS_ERROR: 3,
        BONUS_CLOSE: 4
    },

    init(){},

    startApp(){
        mglBuild.log("mglBuild. App started!");
        bridge.platform.sendMessage("game_ready");
    },

    startLevel(){
        window.Playgama.sdk.game.gameplayStart();
        bridge.platform.sendMessage("gameplay_started");
    },

    stopLevel(){
        window.Playgama.sdk.game.gameplayStop();
        bridge.platform.sendMessage("gameplay_stopped");
    },

    loadPlayerData(key){
        return mglBuild.gameData;
    },

    savePlayerData(key, value){
        return bridge.storage.set(mglBuild.project + 'xDATA', value)
        .then(() => {
            mglBuild.log("mglBuild.savePlayerData() ", 'Data successfully saved');
        })
        .catch(error => {
            mglBuild.log("mglBuild.savePlayerData() ", 'Error, something went wrong');
        })
    },

    async showReward(callback){
        // 1. Подписываемся на события рекламы
        // Сработает, когда реклама открылась
        bridge.advertisement.on('rewarded_video_opened', () => {
            callback(this.bonusFlags.BONUS_OPEN);
        });

        // Сработает, если пользователь досмотрел до конца (получает награду)
        bridge.advertisement.on('rewarded_video_rewarded', () => {
            callback(this.bonusFlags.BONUS_REWARDED);
        });

        // Сработает при закрытии (успешном или нет)
        bridge.advertisement.on('rewarded_video_closed', () => {
            callback(this.bonusFlags.BONUS_CLOSE);
        });

        // Сработает, если произошла ошибка (реклама не загрузилась или заблокирована)
        bridge.advertisement.on('rewarded_video_failed', () => {
            console.warn("Реклама не удалась");
            callback(this.bonusFlags.BONUS_ERROR); // Закрываем интерфейс, если всё сломалось
        });

        // 2. Запускаем показ
        bridge.advertisement.showRewardedVideo();
    },

    updateLang(){
        gamer.gameData.lang = bridge.platform.language;
    },

    getSdkScripts(){
        return [
            { src: 'https://bridge.playgama.com/v1/stable/playgama-bridge.js', local: true }
        ];
    },

    isLocalLang(){
        return false;
    },

    getAuthHtml(){
        return '<span style="color: #f1c40f; cursor: pointer;" onclick="bridge.player.authorize({ wait: true });">Login</span>';
    }
};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init(). ", mglBuild.build, mglBuild.platform);

    await bridge.initialize()
    .then(() => {
        // initialization was successful, SDK can be used
        console.log('mglBuild.init(). ', 'initialization was successful, SDK can be used');
    })
    .catch(error => {
        // error, something went wrong
        console.log('mglBuild.init(). ', 'error, something went wrong');
    });

    mglBuild.sdk = bridge.platform.sdk;
    mglBuild.playerId = bridge.player.id;
    //mglBuild.lang = bridge.platform.language;
    mglBuild.gameData = await bridge.storage.get(mglBuild.project + 'xDATA', bridge.storage.defaultType);
}

if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild };
}
