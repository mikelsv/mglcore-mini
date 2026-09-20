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
    showReward(callback) {
        callback(this.bonusFlags.BONUS_OPEN);
        // callback(this.bonusFlags.BONUS_REWARDED);
        // callback(this.bonusFlags.BONUS_CLOSE);

        // 2. Создаем темный полупрозрачный фон (overlay)
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999',
            pointerEvents: 'auto', // Фон принимает клики на себя
            touchAction: 'none'    // Запрещает скролл заднего плана на смартфонах
        });

        const stopPropagation = (e) => e.stopPropagation();
        overlay.addEventListener('click', stopPropagation);
        overlay.addEventListener('mousedown', stopPropagation);
        overlay.addEventListener('mouseup', stopPropagation);
        overlay.addEventListener('touchstart', stopPropagation);
        overlay.addEventListener('touchend', stopPropagation);

        // 3. Создаем само окно сообщения
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            minWidth: '280px',
            fontFamily: 'sans-serif'
        });

        // Текст внутри окна
        const title = document.createElement('p');
        title.textContent = 'Реклама';
        title.style.margin = '0 0 20px 0';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        modal.appendChild(title);

        // Контейнер для кнопок
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'space-around';
        btnContainer.style.gap = '10px';

        // Кнопка "Отмена"
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        styleButton(cancelBtn, '#6c757d');
        cancelBtn.addEventListener('click', () => {
            callback(this.bonusFlags.BONUS_CLOSE);
            closeModal();
        });

        // Кнопка "Закрыть" (С получением награды)
        const rewardBtn = document.createElement('button');
        rewardBtn.textContent = 'Закрыть';
        styleButton(rewardBtn, '#28a745');
        rewardBtn.addEventListener('click', () => {
            callback(this.bonusFlags.BONUS_REWARDED);
            callback(this.bonusFlags.BONUS_CLOSE);
            closeModal();
        });

        // Собираем структуру воедино
        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(rewardBtn);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Функция для удаления модального окна из DOM
        function closeModal() {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }

        // Хелпер для базового стиля кнопок
        function styleButton(btn, bgColor) {
            Object.assign(btn.style, {
                padding: '12px 16px', // Чуть увеличили для удобного тапа пальцем
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                backgroundColor: bgColor,
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                flex: '1',
                webkitTapHighlightColor: 'transparent' // Убираем синее выделение при тапе на iOS/Android
            });
        }
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
    updateLang(){
        if(!gamer.gameData.lang)
            gamer.gameData.lang = 'en';
    },

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