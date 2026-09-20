import * as twgl from 'twgl';
import { webgl as gl } from 'mglcore/twgl.app.js';

export class twglImageLoader {
    constructor(onCompleteCallback) {
        this.queue = new Map();          // id -> File или URL (строка)
        this.imagesData = new Map();     // id -> HTMLImageElement (готовые к WebGL картинки)
        this.texturesData = new Map();   // id -> WebGLTexture
        this.onComplete = onCompleteCallback;

        this.uiOverlay = null;
        this.progressBar = null;
        this.errorContainer = null;
    }

    setCallback(onCompleteCallback) {
        this.onComplete = onCompleteCallback;
    }

    /**
     * @param {string|number} id - Уникальный идентификатор
     * @param {File|string} source - Объект File ИЛИ строка с URL-адресом файла
     */
    loadFile(id, source) {
        if (!source) {
            console.error(`Ошибка: Для ID [${id}] передан пустой файл или URL.`);
            return;
        }
        this.queue.set(id, source);
    }

    /**
     * Возвращает готовый объект Image (HTMLImageElement)
     */
    getFile(id) {
        return this.imagesData.get(id) || null;
    }

    /**
     * Возвращает созданную текстуру
     */
    getTexture(id) {
        return this.texturesData.get(id) || null;
    }

    buildTextures() {
        // Проходимся по всем загруженным объектам Image
        this.imagesData.forEach((imgElement, id) => {
            this.setTexture(id, imgElement);
        });
    }

    setTexture(id, imgElement){
        // Создаем WebGL текстуру из объекта картинки
        const texture = twgl.createTexture(gl, {
            src: imgElement,
            min: gl.LINEAR,
            mag: gl.LINEAR,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
            flipY: false
        });

        // Записываем в объект текстуры её оригинальные размеры
        texture.originalWidth = imgElement.width;
        texture.originalHeight = imgElement.height;

        // Сохраняем готовую текстуру в Map под тем же ID
        this.texturesData.set(id, texture);
    }

    async asyncLoad() {
        if (this.queue.size === 0) {
            if (this.onComplete)
                this.onComplete();
            return;
        }

        this._createUI();

        const totalFiles = this.queue.size;
        const progressMap = new Map(); // Хранит процент загрузки (0-100) каждого файла

        const updateProgress = () => {
            let totalPercent = 0;
            progressMap.forEach(percent => totalPercent += percent);

            const currentProgress = Math.round(totalPercent / totalFiles);

            if (this.progressBar) {
                this.progressBar.style.width = `${currentProgress}%`;
                this.progressBar.textContent = `${currentProgress}%`;
            }
        };

        const loadPromises = Array.from(this.queue.entries()).map(([id, source]) => {
            return new Promise((resolve, reject) => { console.log("I", id, source);

                // Внутренняя функция для создания картинки из бинарных данных (Blob)
                const processBlob = (blob) => {
                    const img = new Image();
                    // Создаем временную ссылку на память браузера (вместо тяжелого base64)
                    const objectUrl = URL.createObjectURL(blob);

                    img.onload = () => {
                        progressMap.set(id, 100);
                        updateProgress();

                        this.imagesData.set(id, img); // Сохраняем готовую картинку
                        URL.revokeObjectURL(objectUrl); // Освобождаем оперативную память!
                        resolve();
                    };

                    img.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error(`Ошибка декодирования картинки [${id}]`));
                    };

                    img.src = objectUrl;
                };

                // --- ВАРИАНТ 1: Скачиваем с сервера ---
                if (typeof source === 'string') {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', source, true);
                    xhr.responseType = 'blob';

                    xhr.onprogress = (event) => {
                        if (event.lengthComputable) {
                            // Оставляем 10% на процесс распаковки самой картинки
                            progressMap.set(id, (event.loaded / event.total) * 90);
                            updateProgress();
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            processBlob(xhr.response); // Передаем скачанный бинарник на создание картинки
                        } else {
                            reject(new Error(`Loading error: ${xhr.status}. File: ${source}(${id})`));
                        }
                    };

                    xhr.onerror = () => reject(new Error(`Network error while loading. File: ${source}(${id})`));
                    xhr.send();
                }

                // --- ВАРИАНТ 2: Локальный объект File/Blob ---
                else if (source instanceof File || source instanceof Blob) {
                    progressMap.set(id, 50); // Условный прогресс
                    updateProgress();
                    processBlob(source);
                }

                // --- ВАРИАНТ 3: Ошибка типа данных ---
                else {
                    reject(new Error(`Неверный тип данных для [${id}]. Ожидался File или URL (строка).`));
                }
            });
        });

        try {
            await Promise.all(loadPromises);
            this.queue.clear();

            setTimeout(() => {
                this._destroyUI();
                if (this.onComplete) this.onComplete();
            }, 500);

        } catch (error) {
            this._showError(error.message);
            throw error;
        }
    }

    _createUI() {
        this._destroyUI();

        this.uiOverlay = document.createElement('div');
        this.uiOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: Arial, sans-serif;
        `;

        const coverImage = document.createElement('img');
        coverImage.src = 'assets/images/cover.jpg';
        coverImage.onerror = () => { coverImage.style.display = 'none'; };
        coverImage.style.cssText = `
            max-width: 300px; max-height: 300px; border-radius: 10px;
            margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            object-fit: cover;
        `;

        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 80%; max-width: 400px; height: 25px;
            background: #333; border-radius: 15px; overflow: hidden;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
        `;

        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%; height: 100%; background: #4CAF50;
            color: white; font-weight: bold; font-size: 14px;
            display: flex; align-items: center; justify-content: center;
            transition: width 0.2s ease;
        `;
        this.progressBar.textContent = '0%';

        this.errorContainer = document.createElement('div');
        this.errorContainer.style.cssText = `
            color: #ff4c4c; margin-top: 15px; font-weight: bold;
            text-align: center; max-width: 80%; display: none;
        `;

        progressContainer.appendChild(this.progressBar);
        this.uiOverlay.appendChild(coverImage);
        this.uiOverlay.appendChild(progressContainer);
        this.uiOverlay.appendChild(this.errorContainer);
        document.body.appendChild(this.uiOverlay);
    }

    _showError(message) {
        if (this.errorContainer && this.progressBar) {
            this.progressBar.style.background = '#ff4c4c';
            this.errorContainer.textContent = message;
            this.errorContainer.style.display = 'block';
        }
    }

    _destroyUI() {
        if (this.uiOverlay && this.uiOverlay.parentNode) {
            this.uiOverlay.parentNode.removeChild(this.uiOverlay);
        }
        this.uiOverlay = null;
        this.progressBar = null;
        this.errorContainer = null;
    }
}