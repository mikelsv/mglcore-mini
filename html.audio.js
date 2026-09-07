class AudioManager {
    constructor(config = {}) {
        const {
            music = undefined,
            sounds = undefined,
            soundVolume = .5,
            musicVolume = .5,
            autoPlay = 1
        } = config;

        // Инициализируем аудио-контекст (Web Audio API)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.soundVolume = soundVolume;
        this.musicVolume = musicVolume;

        // Громкость для музыки и звуков через GainNode
        this.soundGain = this.ctx.createGain();
        this.soundGain.connect(this.ctx.destination);
        this.soundGain.gain.value = this.soundVolume;

        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.ctx.destination);
        this.musicGain.gain.value = this.musicVolume;

        this.soundsBuffers = {};
        this.activeSounds = {};
        this.musicSource = null;
        this.musicBuffer = null;

        this.pauseAd = false;

        // Загрузка музыки
        if (music) {
            this.loadBuffer(music).then(buffer => {
                this.musicBuffer = buffer;
                if (autoPlay) {
                    window.addEventListener('click', () => {
                        if (this.ctx.state === 'suspended') this.ctx.resume();
                        this.playMusic();
                    }, { once: true });
                }
            });
        }

        // Загрузка звуков
        if (sounds) {
            sounds.forEach(url => {
                const name = url.split('/').pop().replace(/\.[^/.]+$/, "");
                this.loadBuffer(url).then(buffer => {
                    this.soundsBuffers[name] = buffer;
                });
            });
        }

        this.setupVisibilityHandlers();
    }

    async loadBuffer(url) {
        const response = await fetch(url, { priority: 'low' });
        const arrayBuffer = await response.arrayBuffer();
        return await this.ctx.decodeAudioData(arrayBuffer);
    }

    // Set
    setSoundVolume(value) {
        this.soundVolume = Math.min(1, Math.max(0, value));
        this.soundGain.gain.setTargetAtTime(this.soundVolume, this.ctx.currentTime, 0.01);
    }

    setMusicVolume(value) {
        this.musicVolume = Math.min(1, Math.max(0, value));
        this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.01);
    }

    // Play
    playSound(name) {
        const buffer = this.soundsBuffers[name];
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.soundGain);
        source.start();
    }

    playSoundSingle(name, restart = false) {
        const buffer = this.soundsBuffers[name];
        if (!buffer) return;

        if (this.activeSounds[name]) {
            if (!restart)
                return;

            try {
                this.activeSounds[name].stop();
            } catch (e) { }
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.soundGain);

        this.activeSounds[name] = source;

        source.onended = () => {
            if (this.activeSounds[name] === source) {
                delete this.activeSounds[name];
            }
        };

        source.start(0);
    }

    stopSoundSingle(name){
        if (this.activeSounds[name]) {
            try {
                this.activeSounds[name].stop();
                delete this.activeSounds[name];
            } catch (e) { }
        }
    }

    playMusic() {
        if (!this.musicBuffer) return;
        if (this.musicSource) this.musicSource.stop();

        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start();

        if(this.pauseAd)
            this.stopMusic();
    }

    stopMusic() {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource = null;
        }
    }

    // Ad
    pauseForAd() {
        this.pauseAd = true;
        this.ctx.suspend();
    }

    resumeAfterAd() {
        this.pauseAd = false;
        this.ctx.resume();
    }

    setupVisibilityHandlers() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden || this.pauseAd) {
                this.ctx.suspend(); // Приостанавливает весь звук контекста
            } else {
                this.ctx.resume();
            }
        });
    }
}