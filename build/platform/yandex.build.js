let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "yandex",
    debug: false,
    startedLevel: false,

    // Yandex
    ysdk: undefined,

    bonusFlags: {
        BONUS_OPEN: 1,
        BONUS_REWARDED: 2,
        BONUS_ERROR: 3,
        BONUS_CLOSE: 4
    },

    leaderboardFlags: {
        GET: 1,
        SET: 2,
        GETSET: 3,
        REPLACE: 4,
        SETREP: 6,
        GETSETREP: 7
    },

    init(){
        mglBuild.log("mglBuild.init() for ", this.platform);
    },

    startApp(){
        mglBuild.log("mglBuild. App started!");
        this.ysdk.features.LoadingAPI.ready();
        //this.ysdk.features.GameplayAPI.start();
    },

    startLevel(){
        this.startedLevel = true;
        mglBuild.log("mglBuild. Level started!");
        this.ysdk.features.GameplayAPI.start();
    },

    stateLevel(){
        return this.startedLevel;
    },

    stopLevel(){
        this.startedLevel = false;
        mglBuild.log("mglBuild. Level ended!");
        this.ysdk.features.GameplayAPI.stop();
    },

    loadPlayerData(key){
        return mglBuild.gameData["gamerdata"];
    },

    savePlayerData(key, value){
        return this.ysdk.getPlayer().then(_player => {
            return _player.setData({gamerdata: value });
        });
    },

    showReward(callback){
        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    callback(this.bonusFlags.BONUS_OPEN);
                },
                onRewarded: () => {
                    callback(this.bonusFlags.BONUS_REWARDED);
                },
                onClose: () => {
                    callback(this.bonusFlags.BONUS_CLOSE);
                },
                onError: (e) => {
                    callback(this.bonusFlags.BONUS_ERROR);
                }
            }
        })
    },

    // Leaderboards
    async autoLeaderboard(leaderboardName, newScore, flags){
        try {
            // Methods avalilable
            const [canGetEntry, canSetScore, canGetEntries] = await Promise.all([
                this.ysdk.isAvailableMethod('leaderboards.getPlayerEntry'),
                this.ysdk.isAvailableMethod('leaderboards.setScore'),
                this.ysdk.isAvailableMethod('leaderboards.getEntries')
            ]);

            if (!canGetEntry || !canSetScore) {
                console.warn('mglBuild.autoLeaderboard(). Leaderboards are unavailable (the user may not be logged in).');
                return;
            }

            // Current score
            let currentScore = 0;

            // Get last value
            if ((flags & this.leaderboardFlags.SET) && !(flags & this.leaderboardFlags.REPLACE)) {
            try {
                const res = await this.ysdk.leaderboards.getPlayerEntry(leaderboardName);
                currentScore = res.score;
            } catch (e) {
                console.log('mglBuild.autoLeaderboard(). The player is not yet featured on the leaderboard.');
            }

            // If the new score is higher, update (whole numbers only)
            if((flags & this.leaderboardFlags.SET) && newScore > currentScore)
                await this.ysdk.leaderboards.setScore(leaderboardName, Math.floor(newScore));
                console.log('mglBuild.autoLeaderboard(). Account updated successfully!');
            }

            // No GET -> exit
            if(!(flags & this.leaderboardFlags.GET))
                return ;

            if (canGetEntries) {
                const topPlayers = await this.ysdk.leaderboards.getEntries(leaderboardName, {
                    quantityTop: 10,
                    includeUser: true
                });

                // Formatting
                if(!topPlayers || !topPlayers.entries)
                    return ;

                const formattedResult = topPlayers.entries.map((entry) => ({
                    playerId: entry.player.uniqueID,
                    rank: entry.rank,
                    name: entry.player.publicName,
                    avatar: entry.player.getAvatarSrc('small'),
                    score: entry.score
                }));

                return formattedResult;
            }

        } catch (error) {
            console.error('mglBuild.autoLeaderboard(). Leaderboard error:', error);
        }
    },

    async resultToLiderboard(liderboardName, newScore){
        try {
            // 1. Проверяем, авторизован ли игрок и доступны ли методы лидерборда
            // Примечание: методы лидербордов доступны только для авторизованных пользователей
            const [canGetEntry, canSetScore, canGetEntries] = await Promise.all([
                this.ysdk.isAvailableMethod('leaderboards.getPlayerEntry'),
                this.ysdk.isAvailableMethod('leaderboards.setScore'),
                this.ysdk.isAvailableMethod('leaderboards.getEntries')
            ]);

            if (!canGetEntry || !canSetScore) {
                console.warn('Лидерборды недоступны (возможно, пользователь не авторизован)');
                // Можно вызвать ysdk.auth.openAuthDialog(), если это уместно
                return;
            }

            // 2. Получаем текущий счёт игрока
            let currentScore = 0;
            try {
                const res = await this.ysdk.leaderboards.getPlayerEntry(liderboardName);
                currentScore = res.score;
            } catch (e) {
                // Если игрок еще не в таблице, getPlayerEntry может выбросить ошибку
                console.log('Игрок еще не представлен в лидерборде');
            }

            // 3. Если новый счёт выше — обновляем (только целые числа)
            if (newScore > currentScore) {
                await this.ysdk.leaderboards.setScore(liderboardName, Math.floor(newScore));
                console.log('Счёт успешно обновлен!');
            }

            // 4. Запрашиваем топ игроков, если метод доступен
            if (canGetEntries) {
                const topPlayers = await this.ysdk.leaderboards.getEntries(liderboardName, {
                    quantityTop: 10,
                    includeUser: true
                });
                //console.log('Топ игроков:', topPlayers);

                // Formatting
                if(!topPlayers || !topPlayers.entries)
                    return ;

                const formattedResult = topPlayers.entries.map((entry) => ({
                    playerId: entry.player.uniqueID,
                    rank: entry.rank,
                    name: entry.player.publicName,
                    avatar: entry.player.getAvatarSrc('small'),
                    score: entry.score
                }));

                return formattedResult;
            }

        } catch (error) {
            console.error('Ошибка работы с лидербордом:', error);
        }
    },

    // Adversiting
    showAdversiteInterstitial() {
        const config = gamer.advertise.interstitial;
        const currentTime = Date.now() / 1000;

        // Проверяем: включена ли реклама и прошло ли время
        if (config.enable && (currentTime - config.lastTime >= config.interval)) {

            ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        // Ставим игру на паузу и выключаем звук
                        console.log('mglBuild. Ad opened');
                    },
                    onClose: (wasShown) => {
                        //if (wasShown) {
                            config.lastTime = Date.now() / 1000; // Обновляем время только при успешном показе
                        //}
                        // Снимаем игру с паузы
                        console.log('mglBuild Ad closed', wasShown);
                    },
                    onError: (error) => {
                        console.error('mglBuild Ad error:', error);
                    }
                }
            });
        } else {
            console.log('mglBuild Ad skipped: cooldown or disabled');
        }
    },

    // Local language control
    isLocalLang(){
        return false;
    },

    updateLang(){
        if(this.ysdk.environment.i18n.lang){
            mglBuild.log("mglBuild. i18n.lang", this.ysdk.environment.i18n.lang);
            if(this.ysdk.environment.i18n.lang == "ru")
                gamer.gameData.lang = "ru";
            else
                gamer.gameData.lang = "en";
        }
    },

    // Auth html message
    getAuthHtml(text = 'Clickt to auth'){
        return `<a href='#' onclick="ysdk.auth.openAuthDialog()">${text}</a>`;
    },

    getSdkScripts(){
        return [
            { src: '/sdk.js', local: true}
        ];
    }
};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);

    // Yandex
    ysdk = await YaGames.init();
    mglBuild.ysdk = ysdk;

    let jsonEnvir = {
        "language": ysdk.environment.i18n.lang,
        "domain": ysdk.environment.i18n.tld,
        "deviceType": ysdk.deviceInfo.type,
        "isMobile": ysdk.deviceInfo.isMobile(),
        "isDesktop": ysdk.deviceInfo.isDesktop(),
        "isTablet": ysdk.deviceInfo.isTablet(),
        "isTV": ysdk.deviceInfo.isTV(),
        "appID": ysdk.environment.app.id,
        "browserLang": ysdk.environment.browser.lang,
        "payload": ysdk.environment.payload,
        //"platform": navigator.platform,
        //"browser": browser
    };

    // Players
    mglBuild.player = await ysdk.getPlayer();
    mglBuild.playerId = await mglBuild.player.getUniqueID();
    mglBuild.gameData = await mglBuild.player.getData();

    //console.log("mglBuild.gameData", mglBuild.gameData);
}

// Module
if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild };
}