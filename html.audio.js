class AudioManager {
  constructor(config = {}) {
    const {
      music = undefined,
      sounds = undefined,
      musicVolume = 1,
      soundVolume = 1,
      autoPlay = 1
    } = config;

    // Инициализируем аудио-контекст (Web Audio API)
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicVolume = musicVolume;
    this.soundVolume = soundVolume;

    // Громкость для музыки и звуков через GainNode
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.musicGain.gain.value = this.musicVolume;

    this.soundGain = this.ctx.createGain();
    this.soundGain.connect(this.ctx.destination);
    this.soundGain.gain.value = this.soundVolume;

    this.musicBuffer = null;
    this.musicSource = null;
    this.soundsBuffers = {};

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
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  playMusic() {
    if (!this.musicBuffer) return;
    if (this.musicSource) this.musicSource.stop();

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
  }

  stopMusic() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource = null;
    }
  }

  playSound(name) {
    const buffer = this.soundsBuffers[name];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.soundGain);
    source.start();
  }

  setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.ctx.suspend(); // Приостанавливает весь звук контекста
      } else {
        this.ctx.resume();
      }
    });
  }

  setMusicVolume(value) {
    this.musicVolume = Math.min(1, Math.max(0, value));
    this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.01);
  }

  setSoundVolume(value) {
    this.soundVolume = Math.min(1, Math.max(0, value));
    this.soundGain.gain.setTargetAtTime(this.soundVolume, this.ctx.currentTime, 0.01);
  }
}