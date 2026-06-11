let mglBuild = {
    project: "RPC_MGL_PROJECT",
    build: "RPC_MGL_BUILD",
    platform: "android",
    debug: false,
    startedLevel: false,

    // Yandex
    ysdk: undefined,

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

    init(){
        mglBuild.log("mglBuild.init() for ", this.platform);
    },

    startApp(){
        mglBuild.log("mglBuild. App started!");
    },

    // startGame(){
    //     mglBuild.log("mglBuild. Game started! But, this call is deprecated! Use startApp().");
    // },

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
        return localStorage.getItem(key);
    },

    savePlayerData(key, value){
        return localStorage.setItem(key, value);d
    },

    // Adversiting
    showReward(callback){
        callback(this.bonusFlags.BONUS_OPEN);
        callback(this.bonusFlags.BONUS_REWARDED);
        callback(this.bonusFlags.BONUS_CLOSE);
    },

    showAdversiteInterstitial(callback){
        callback(this.bonusFlags.BONUS_OPEN);
        callback(this.bonusFlags.BONUS_CLOSE);
    },

    // Liderboards
    async autoLeaderboard(leaderboardName, score, flags){
        // Имя ключа в localStorage зависит от названия лидерборда
        const storageKey = gamer.projectName + `local_lb_${leaderboardName}`;

        // 1. Загружаем существующий топ или создаем пустой массив
        let localData = JSON.parse(localStorage.getItem(storageKey)) || [];

        // 2. Создаем объект текущего результата
        // Для гостя ID будет 'guest', чтобы мы могли найти его в списке
        const currentEntry = {
            playerId: 'guest_id',
            name: 'Guest',
            avatar: '', // Пустая строка для аватара
            score: Math.floor(score)
        };

        if (flags & this.leaderboardFlags.SET) {
            // 3. Добавляем новый результат
            localData.push(currentEntry);

            // 4. Сортируем по очкам (от большего к меньшему)
            localData.sort((a, b) => b.score - a.score);

            // 5. Оставляем только топ-10 уникальных результатов
            // (Если хочешь хранить только один лучший результат игрока, можно добавить фильтрацию)
            localData = localData.slice(0, 10);

            // 6. Сохраняем обратно в память браузера
            localStorage.setItem(storageKey, JSON.stringify(localData));
        }

        if(!(flags & this.leaderboardFlags.GET))
            return ;

        // 7. Формируем ответ, идентичный структуре SDK (добавляем ранг)
        const formattedResult = localData.map((item, index) => ({
            playerId: item.playerId,
            rank: index + 1,
            name: item.name,
            avatar: item.avatar,
            score: item.score
        }));

        // Имитируем небольшую задержку сети для реалистичности async
        await new Promise(resolve => setTimeout(resolve, 3000));

        return formattedResult;
    },

    // Local language control
    isLocalLang(){
        return true;
    },

    updateLang(){
        if (!gamer.gameData.lang) {
            const browserLang = navigator.language.slice(0, 2);
            gamer.gameData.lang = gamer.gameData.lang_list.includes(browserLang) ? browserLang : gamer.gameData.lang_list[0];
        }
    },

    getSdkScripts(){
        return [
        ];
    }
};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);
}

// Module
if (typeof module !== 'undefined' && module.exports){
    module.exports = { mglBuild };
}