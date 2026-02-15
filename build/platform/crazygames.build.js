let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "crazygames",
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
        window.CrazyGames.SDK.game.loadingStop();
    },

    startGame(){
        mglBuild.log("mglBuild. Game started! But, this call is deprecated! Use startApp().");
        window.CrazyGames.SDK.game.loadingStop();
    },

    startLevel(){
        window.CrazyGames.SDK.game.gameplayStart();
    },

    stopLevel(){
        window.CrazyGames.SDK.game.gameplayStop();
    },

    loadPlayerData(key){
        return window.CrazyGames.SDK.data.getItem(key);
    },

    savePlayerData(key, value){
        window.CrazyGames.SDK.data.setItem(key, value);
    },

    showReward(callback){
        const callbacks = {
            adStarted: () => {
                callback(this.bonusFlags.BONUS_OPEN);
            },
            adFinished: () => {
                callback(this.bonusFlags.BONUS_REWARDED);
                callback(this.bonusFlags.BONUS_CLOSE);
            },
            adError: (error) => {
                callback(this.bonusFlags.BONUS_ERROR);
                callback(this.bonusFlags.BONUS_CLOSE);
            }
          };

        window.CrazyGames.SDK.ad.requestAd("rewarded", callbacks);
    },

    updateLang(){
        gamer.gameData.lang = "en";
    },

    getSdkScripts(){
        return [
            { src: 'https://sdk.crazygames.com/crazygames-sdk-v3.js', local: true}
        ];
    },

    // Local language control
    isLocalLang(){
        return false;
    },

    // Auth html message
    getAuthHtml(){
        return '<span style="color: #f1c40f; cursor: pointer;" onclick="window.CrazyGames.SDK.user.showAuthPrompt()">Login</span>';
    }
};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);

    // CrazyGames
    await window.CrazyGames.SDK.init();
    window.CrazyGames.SDK.game.loadingStart();
}

// Module
if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild };
}