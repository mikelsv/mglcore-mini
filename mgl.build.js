var mglBuild = {
    platform: "local",
    build: "-",
    debug: true,
    startedLevel: false,

    bonusFlags: {
        BONUS_OPEN: 1,
        BONUS_REWARDED: 2,
        BONUS_ERROR: 3,
        BONUS_CLOSE: 4
    },

    // init(){
    //     mglBuild.log("mglBuild.init() for ", this.platform);
    // },

    startApp(){
        mglBuild.log("mglBuild. App started!");
    },

    startGame(){
        mglBuild.log("mglBuild. Game started! But, this call is deprecated! Use startApp().");
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
        return localStorage.getItem(key);
    },

    savePlayerData(key, value){
        return localStorage.setItem(key, value);
    },

    showReward(callback){
        //console.log("Rewarded");
        callback(this.bonusFlags.BONUS_OPEN);
        callback(this.bonusFlags.BONUS_REWARDED);
        callback(this.bonusFlags.BONUS_CLOSE);
    },

    updateLang(){},

    async resultToLiderboard(liderboardName, score){
        // Имя ключа в localStorage зависит от названия лидерборда
        const storageKey = gamer.projectName + `local_lb_${liderboardName}`;

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

        // 3. Добавляем новый результат
        localData.push(currentEntry);

        // 4. Сортируем по очкам (от большего к меньшему)
        localData.sort((a, b) => b.score - a.score);

        // 5. Оставляем только топ-10 уникальных результатов
        // (Если хочешь хранить только один лучший результат игрока, можно добавить фильтрацию)
        localData = localData.slice(0, 10);

        // 6. Сохраняем обратно в память браузера
        localStorage.setItem(storageKey, JSON.stringify(localData));

        // 7. Формируем ответ, идентичный структуре SDK (добавляем ранг)
        const formattedResult = localData.map((item, index) => ({
            playerId: item.playerId,
            rank: index + 1,
            name: item.name,
            avatar: item.avatar,
            score: item.score
        }));

        // Имитируем небольшую задержку сети для реалистичности async
        await new Promise(resolve => setTimeout(resolve, 300));

        return formattedResult;
    },

    async resultToLiderboardDemo(liderboardName, currentScore = 0){
            // 1. Пул имен для случайных ботов
            const botNames = [
                "CyberKnight", "PixelQueen", "MasterMind", "ShadowPlayer",
                "LuckyStar", "TurboRacer", "IndieDev", "GhostBuster",
                "RetroGamer", "FireBall", "IceDragon", "NeonLight"
            ];

        // 2. Генерируем 9 случайных записей (ботов)
        let players = [];
        for (let i = 0; i < 9; i++) {
            players.push({
                playerId: 'bot_' + i,
                name: botNames[i % botNames.length],
                avatar: '', // Заглушка аватара
                score: Math.floor(Math.random() * 5000) + 500 // Случайный счет от 500 до 5500
            });
        }

        // 3. Добавляем текущего игрока-гостя
        players.push({
            playerId: 'guest_id', // Тот самый ID
            name: 'Guest',
            avatar: '',
            score: currentScore
        });

        // 4. Сортируем всех по убыванию очков
        players.sort((a, b) => b.score - a.score);

        // 5. Присваиваем ранги и форматируем результат (Топ-10)
        const result = players.slice(0, 10).map((player, index) => ({
            playerId: player.playerId,
            rank: index + 1,
            name: player.name,
            avatar: player.avatar,
            score: player.score
        }));

        // Имитируем сетевую задержку
        await new Promise(resolve => setTimeout(resolve, 500));

        return result;
    },

    // Local language control
    isLocalLang(){
        return true;
    },

    // Auth html message
    getAuthHtml(){
        return '<b>Local auth!</b>';
    }

};

async function mglBuildInit(){
    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);
    mglBuild.playerId = 'guest_id';
}