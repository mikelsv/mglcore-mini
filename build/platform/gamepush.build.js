let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "gamepush", // Сменили платформу
    debug: false,
    startedLevel: false,

    // GamePush
    gp: undefined,

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

    log(...args) {
        if (this.debug) console.log(...args);
    },

    init(){
        this.log("mglBuild.init() for ", this.platform);
    },

    startApp(){
        this.log("mglBuild. App started!");
        this.gp.gameStart(); // GamePush: Уведомление о готовности игры
    },

    startLevel(){
        this.startedLevel = true;
        this.log("mglBuild. Level started!");
        this.gp.gameplayStart(); // GamePush: Старт геймплея
    },

    stateLevel(){
        return this.startedLevel;
    },

    stopLevel(){
        this.startedLevel = false;
        this.log("mglBuild. Level ended!");
        this.gp.gameplayStop(); // GamePush: Остановка геймплея
    },

    loadPlayerData(key){
        // В GamePush данные извлекаются напрямую из объекта игрока
        return this.gp.player.get('gamerdata');
    },

    async savePlayerData(key, value){
        // Сохраняем и синхронизируем данные с сервером
        this.gp.player.set('gamerdata', value);
        await this.gp.player.sync();
        return true;
    },

    // Advertising
    async showReward(callback){
        // Подписываемся на события GamePush (т.к. коллбеки onOpen/onReward из YSDK здесь заменены на события)
        const onStart = () => callback(this.bonusFlags.BONUS_OPEN);
        const onReward = () => callback(this.bonusFlags.BONUS_REWARDED);

        this.gp.ads.on('rewarded:start', onStart);
        this.gp.ads.on('rewarded:reward', onReward);

        try {
            const success = await this.gp.ads.showRewardedVideo();
            callback(this.bonusFlags.BONUS_CLOSE, success);
        } catch (e) {
            console.error('mglBuild Ad error:', e);
            callback(this.bonusFlags.BONUS_ERROR);
        } finally {
            // Отписываемся от событий
            this.gp.ads.off('rewarded:start', onStart);
            this.gp.ads.off('rewarded:reward', onReward);
        }
    },

    async showAdversiteInterstitial(callback) {
        // Предполагается, что переменная gamer определена глобально
        const config = gamer.advertise.interstitial;
        const currentTime = Date.now() / 1000;

        if (config.enable && (currentTime - config.lastTime >= config.interval)) {
            const onStart = () => {
                console.log('mglBuild. Ad opened');
                callback(this.bonusFlags.BONUS_OPEN);
            };

            this.gp.ads.on('fullscreen:start', onStart);

            try {
                const wasShown = await this.gp.ads.showFullscreen();
                console.log('mglBuild Ad closed', wasShown);

                if (wasShown) {
                    config.lastTime = Date.now() / 1000;
                }

                callback(this.bonusFlags.BONUS_CLOSE, wasShown);
            } catch (error) {
                console.error('mglBuild Ad error:', error);
                callback(this.bonusFlags.BONUS_ERROR);
            } finally {
                this.gp.ads.off('fullscreen:start', onStart);
            }
        } else {
            callback(this.bonusFlags.BONUS_CLOSE, false);
            console.log('mglBuild Ad skipped: cooldown or disabled');
        }
    },

    // Leaderboards
    async autoLeaderboard(leaderboardName, newScore, flags){
        try {
            // Текущий счёт игрока в GamePush
            let currentScore = this.gp.player.get(leaderboardName) || 0;

            if ((flags & this.leaderboardFlags.SET) && !(flags & this.leaderboardFlags.REPLACE)) {
                if (newScore > currentScore) {
                    this.gp.player.set(leaderboardName, Math.floor(newScore));
                    await this.gp.player.sync();
                    console.log('mglBuild.autoLeaderboard(). Account updated successfully!');
                }
            } else if ((flags & this.leaderboardFlags.SET) && (flags & this.leaderboardFlags.REPLACE)) {
                this.gp.player.set(leaderboardName, Math.floor(newScore));
                await this.gp.player.sync();
                console.log('mglBuild.autoLeaderboard(). Account replaced successfully!');
            }

            // Выход, если не нужен GET
            if (!(flags & this.leaderboardFlags.GET)) return;

            // Запрашиваем таблицу лидеров с GamePush
            const topPlayers = await this.gp.leaderboard.fetch({
                orderBy: [leaderboardName], // Сортируем по полю (например, 'levelX1')
                order: 'DESC',              // По убыванию
                limit: 10,                  // Берем Топ-10
                withMe: 'last',             // Добавляем себя в конец, если не попали в топ
                includeFields: [leaderboardName] // Именно это решает проблему нулевого счета!
            });

            if (!topPlayers) return;

            // В зависимости от версии SDK, результат может быть массивом или лежать в поле players
            const entries = topPlayers.players || topPlayers;

            // Защита от ошибок: если сервер вернул что-то не то, прерываем выполнение
            if (!Array.isArray(entries)) {
                console.error("GamePush Leaderboard: Ожидался массив, получено:", topPlayers);
                return;
            }

            const formattedResult = entries.map((entry, index) => ({
                playerId: entry.id,
                rank: entry.position || (index + 1),
                name: entry.name || 'Anonymous',
                avatar: entry.avatar || '',
                // Подтягиваем счет из явно запрошенного поля
                score: entry[leaderboardName] || 0
            }));

            return formattedResult;

        } catch (error) {
            console.error('mglBuild.autoLeaderboard(). Leaderboard error:', error);
        }
    },

    async resultToLiderboard(liderboardName, newScore){
        try {
            // В GamePush авторизация происходит через метод logIn или автоматически на старте,
            // но мы можем проверить поле isStub, чтобы узнать, что это не временный игрок
            if (this.gp.player.isStub) {
                console.warn('Игрок не авторизован');
            }

            let currentScore = this.gp.player.get(liderboardName) || 0;

            if (newScore > currentScore) {
                this.gp.player.set(liderboardName, Math.floor(newScore));
                await this.gp.player.sync();
                console.log('Счёт успешно обновлен!');
            }

            const topPlayers = await this.gp.leaderboard.fetch({
                orderBy: [liderboardName],
                limit: 10
            });

            if (!topPlayers) return;
            const entries = topPlayers.players || topPlayers;

            const formattedResult = entries.map((entry, index) => ({
                playerId: entry.id,
                rank: entry.position || (index + 1),
                name: entry.name || 'Anonymous',
                avatar: entry.avatar,
                score: entry[liderboardName] || entry.score || 0
            }));

            return formattedResult;

        } catch (error) {
            console.error('Ошибка работы с лидербордом:', error);
        }
    },

    // Local language control
    isLocalLang(){
        return false;
    },

    updateLang(){
        if (this.gp.language) {
            this.log("mglBuild. language", this.gp.language);
            if(this.gp.language === "ru")
                gamer.gameData.lang = "ru";
            else
                gamer.gameData.lang = "en";
        }
    },

    // Auth html message
    getAuthHtml(text = 'Click to auth'){
        return `<a href='#' onclick="mglBuild.gp.player.login()">${text}</a>`;
    },

    getSdkScripts(){
        // Скрипт GamePush обычно добавляется в index.html, поэтому здесь возвращаем пустой массив
        // <script async src="https://gamepush.com/sdk/gamepush.js?projectId=ID&publicToken=TOKEN"></script>
        return [];
    }
};

async function mglBuildInit() {
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);

    // Встраиваем SDK GamePush и ждем его полной загрузки
    await new Promise((resolve, reject) => {
        // 1. Создаем функцию, которую вызовет загрузчик GamePush
        window.onGPInit = async function (gp) {
            mglBuild.gp = gp; // Сохраняем экземпляр GamePush в mglBuild

            // 2. Ждем окончания синхронизации данных игрока с сервером
            await gp.player.ready;
            resolve(); // Завершаем Promise, можно продолжать запуск игры
        };

        // 3. Тот самый код-загрузчик GamePush
        ((s,c,o,r,e)=>{var f=0,t={},p=0,m=r.length,w=[],j=u=>{if(f||t[u])return;f=1;t[u]=1;var d=c.createElement(o);d.async=1;d.src=u+e;d.onerror=()=>{f=0;n()};var a=c.getElementsByTagName(o)[0];a.parentNode.insertBefore(d,a)},n=()=>{for(var k=0;k<w.length;k++)if(!t[w[k]])return j(w[k])},q=()=>{++p>=m&&!f&&n()};r.forEach(u=>s.fetch(u,{method:"HEAD"}).then(x=>{x&&x.ok?(w.push(u),j(u)):q()}).catch(q));s.setTimeout(()=>{f||n()},5000)})(window,document,"script",atob("aHR0cHM6Ly9ncy5lcG9uZXNoLmNvbS9zZGsvZ2FtZS1zY29yZS5qcyxodHRwczovL3MzLmdhbWVwdXNoLmNvbS9maWxlcy9ncy9zZGsvZ2FtZS1zY29yZS5qcyxodHRwczovL3MzLWV1LmdhbWVwdXNoLmNvbS9zZGsvZ2FtZS1zY29yZS5qcyxodHRwczovL2dhbWVwdXNoLmNvbS9zZGsvZ2FtZS1zY29yZS5qcw==").split(","),gamer.build.gamepush);
    });

    const gp = mglBuild.gp;

    // Формируем jsonEnvir в том же формате, что у вас был
    let jsonEnvir = {
        "language": gp.language || "en",
        "domain": "gamepush",
        "deviceType": gp.isMobile ? "mobile" : "desktop",
        "isMobile": gp.isMobile,
        "isDesktop": !gp.isMobile,
        "isTablet": false,
        "isTV": gp.isTV || false,
        //"appID": "29491",
        "browserLang": navigator.language,
        "payload": ""
    };

    // Заполняем данные игрока
    mglBuild.player = gp.player;
    mglBuild.playerId = gp.player.id;

    // В GamePush данные сохраняются прямо в полях игрока
    // Эмулируем структуру { gamerdata: value } для совместимости с вашей игрой
    mglBuild.gameData = { gamerdata: gp.player.get('gamerdata') || "" };

    mglBuild.log("GamePush SDK успешно инициализирован и готов к работе!");
}

// Module
if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild, mglBuildInit };
}