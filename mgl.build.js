var mglBuild = {
    platform: "local",
    build: "-",
    debug: true,
    startedLevel: false,

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
        return localStorage.getItem(key);
    },

    savePlayerData(key, value){
        return localStorage.setItem(key, value);
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
        async autoLeaderboard(leaderboardName, score, flags) {
        // Имя ключа в localStorage зависит от названия лидерборда
        const storageKey = gamer.projectName + `local_lb_${leaderboardName}`;

        // 1. Загружаем существующие результаты игрока(ов) из памяти
        let localData = JSON.parse(localStorage.getItem(storageKey)) || [];

        // Определяем ID (берем из объекта gamer, если есть, иначе 'guest_id')
        const currentPlayerId = typeof gamer !== 'undefined' && gamer.playerId ? gamer.playerId : 'guest_id';

        if (flags & this.leaderboardFlags.SET) {
            const currentEntry = {
                playerId: currentPlayerId,
                name: 'Guest',
                avatar: '',
                score: Math.floor(score)
            };

            // Ищем, есть ли уже этот игрок в сохраненных данных
            const existingPlayerIndex = localData.findIndex(p => p.playerId === currentPlayerId);

            if (existingPlayerIndex !== -1) {
                // Обновляем результат, только если он лучше предыдущего (чтобы не забить весь топ собой)
                if (currentEntry.score > localData[existingPlayerIndex].score) {
                    localData[existingPlayerIndex] = currentEntry;
                }
            } else {
                localData.push(currentEntry);
            }

            // Сортируем реальных игроков
            localData.sort((a, b) => b.score - a.score);
            localData = localData.slice(0, 10);

            // Сохраняем в localStorage ТОЛЬКО реальные данные (без ботов)
            localStorage.setItem(storageKey, JSON.stringify(localData));
        }

        // Если нам не нужно возвращать данные, выходим
        if (!(flags & this.leaderboardFlags.GET)) {
            return;
        }

        // --- БЛОК ГЕНЕРАЦИИ БОТОВ (каждый раз заново, не сохраняются) ---

        const botNames = [
            "CyberKnight", "PixelQueen", "MasterMind", "ShadowPlayer",
            "LuckyStar", "TurboRacer", "IndieDev", "GhostBuster",
            "RetroGamer", "FireBall", "IceDragon", "NeonLight"
        ];

        // Копируем реальные данные, чтобы не изменить массив localData
        let displayData = [...localData];

        // Генерируем 9 случайных записей
        for (let i = 0; i < 9; i++) {
            let botScore = Math.floor(score + Math.random() * 5000 - 2500);
            if (botScore < 0) botScore = 0; // Защита от отрицательных очков

            displayData.push({
                playerId: 'bot_' + i,
                name: botNames[i % botNames.length],
                avatar: 'https://i.pravatar.cc/150?u=' + botNames[i % botNames.length],
                score: botScore
            });
        }

        // Сортируем общий микс (сохраненные результаты игрока + 9 сгенерированных ботов)
        displayData.sort((a, b) => b.score - a.score);

        // Формируем финальный Топ-10 с рангами для отдачи в игру
        const formattedResult = displayData.slice(0, 10).map((item, index) => ({
            playerId: item.playerId,
            rank: index + 1,
            name: item.name,
            avatar: item.avatar,
            score: item.score
        }));

        // Имитируем небольшую задержку сети
        await new Promise(resolve => setTimeout(resolve, 3000));

        return formattedResult;
    },

    // Language
    updateLang(){},

    isLocalLang(){
        return true;
    },

    // Auth html message
    getAuthHtml(text = 'Clickt to auth'){
        return `<a href="#" onclick="alert('Booo!'); return false;"><b>${text}</b></a>`;
    },

    // Logs
    log: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
};

async function mglBuildInit(){
    if(gamer?.projectVers)
        mglBuild.build = gamer.projectVers[0][1];

    mglBuild.log("mglBuild.init() ", mglBuild.build, mglBuild.platform);
    mglBuild.playerId = 'guest_id';
}