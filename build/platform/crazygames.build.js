let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "crazygames",
    debug: false,

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
        REPLACE: 4,
        SETREP: 6,
        GETSETREP: 7
    },

    init(){},

    startApp(){
        mglBuild.log("mglBuild. App started!");
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

    // Adversiting
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

    async showAdversiteInterstitial(callback) {
        const config = gamer.advertise.interstitial;
        const currentTime = Date.now() / 1000;
        const sdk = window.CrazyGames.SDK;

        // Проверка интервала (как в вашем коде)
        if (config.enable && (currentTime - config.lastTime >= config.interval)) {
            try {
                await sdk.ad.requestAd('midgame', {
                    adStarted: () => {
                        // 1. Пауза игры и выключение звука
                        console.log('CrazyGames Ad started');
                        callback(this.bonusFlags.BONUS_OPEN);
                    },
                    adFinished: () => {
                        // 2. Успешный показ
                        config.lastTime = Date.now() / 1000;
                        console.log('CrazyGames Ad finished');
                        callback(this.bonusFlags.BONUS_CLOSE, true);
                    },
                    adError: (error) => {
                        // 3. Ошибка (например, заблокировано или нет рекламы)
                        console.error('CrazyGames Ad error:', error);
                        callback(this.bonusFlags.BONUS_ERROR);
                        // Важно: на CG после ошибки нужно продолжить игру
                        callback(this.bonusFlags.BONUS_CLOSE, false);
                    }
                });
            } catch (e) {
                console.error('CrazyGames Ad request failed', e);
                callback(this.bonusFlags.BONUS_CLOSE, false);
            }
        } else {
            callback(this.bonusFlags.BONUS_CLOSE, false);
            console.log('CrazyGames Ad skipped: cooldown or disabled');
        }
    },

    // Leaderboards
    async autoLeaderboard(leaderboardName, newScore, flags) {
        try {
            const sdk = window.CrazyGames.SDK;

            // 1. Проверяем доступность User/Data модулей
            if (!sdk || !sdk.data) {
                console.warn('CrazyGames SDK Data module unavailable.');
                return;
            }

            let currentScore = 0;
            const storageKey = `lb_${leaderboardName}`;

            // 2. Получаем текущее значение (аналог getPlayerEntry)
            try {
                const savedValue = await sdk.data.getItem(storageKey);
                currentScore = savedValue !== null ? parseInt(savedValue) : 0;
            } catch (e) {
                console.log('No existing score found.');
            }

            // 3. SET: Если новый счет больше, перезаписываем (аналог setScore)
            if ((flags & this.leaderboardFlags.SET) && newScore > currentScore) {
                await sdk.data.setItem(storageKey, Math.floor(newScore));
                currentScore = Math.floor(newScore);
                console.log('CrazyGames: Score updated!');
            }

            // 4. GET: Форматируем ответ (только для текущего игрока)
            if (!(flags & this.leaderboardFlags.GET)) return;

            // Так как глобального API нет, возвращаем массив только с одним юзером (собой)
            // Чтобы ваш UI не сломался, имитируем структуру Yandex
            const user = await sdk.user.getUser();

            return [{
                playerId: user?.id || 'guest',
                rank: 1, // Мы не знаем реальный ранг без своего бэкенда
                name: user?.username || 'Guest Player',
                avatar: user?.profilePictureUrl || '',
                score: currentScore
            }];

        } catch (error) {
            console.error('CrazyGames autoLeaderboard error:', error);
        }
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