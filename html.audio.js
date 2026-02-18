//(() => {
  class AudioManager {
    constructor(config = {}) {
        const {
            music = undefined,
            sounds = undefined,
            musicVolume = 1,
            soundVolume = 1,
            autoPlay = 1
        } = config;

      this.musicVolume = musicVolume;
      this.soundVolume = soundVolume;
      this.wasPlayingBeforeBlur = false;

    // Muscic
    if(music){
        this.music = new Audio(music);
        this.music.loop = true;
        this.music.volume = this.musicVolume;

        if(autoPlay)
            window.addEventListener('click', () => {
                this.music.play();
            }, { once: true });
    }

    this.sounds = {};

    if(sounds)
        sounds.forEach(sound => {
            const name = sound.split('/').pop().replace(/\.[^/.]+$/, "");
            this.sounds[name] = new Audio(sound);
        });

      this.updateSoundVolume();
      this.setupVisibilityHandlers();
    }

    setupVisibilityHandlers() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseForExternalReason();
        } else {
          this.resumeAfterExternalReason();
        }
      });

      window.addEventListener('blur', () => {
        this.pauseForExternalReason();
      });

      window.addEventListener('focus', () => {
        this.resumeAfterExternalReason();
      });
    }

    readVolume(key, fallback) {
      const parsed = parseFloat(window.localStorage.getItem(key));
      if (Number.isFinite(parsed)) {
        return Math.min(1, Math.max(0, parsed));
      }
      return fallback;
    }

    playMusic() {
      if (this.music?.paused) {
        this.music.play().catch(() => {});
      }
    }

    stopMusic() {
      this.wasPlayingBeforeBlur = false;
      this.music.pause();
    }

    pauseForExternalReason() {
        if(!this.music)
            return ;

      if (!this.music.paused) {
        this.wasPlayingBeforeBlur = true;
        this.music.pause();
      }
    }

    resumeAfterExternalReason() {
      if (document.hidden) return;

      if (this.wasPlayingBeforeBlur) {
        this.wasPlayingBeforeBlur = false;
        this.playMusic();
      }
    }

    pauseForAd() {
      this.pauseForExternalReason();
    }

    resumeAfterAd() {
      this.resumeAfterExternalReason();
    }

    playSound(soundName) {
      const sound = this.sounds[soundName];
      if (!sound) return;
      sound.pause();
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }

    setMusicVolume(value) {
      const safeValue = Math.min(1, Math.max(0, Number(value) || 0));
      this.musicVolume = safeValue;
      this.music.volume = safeValue;
    }

    setSoundVolume(value) {
      const safeValue = Math.min(1, Math.max(0, Number(value) || 0));
      this.soundVolume = safeValue;
      this.updateSoundVolume();
    }

    updateSoundVolume() {
      Object.values(this.sounds).forEach((sound) => {
        sound.volume = this.soundVolume;
      });
    }
  }

  //window.audioManager = window.audioManager || new AudioManager();
//}//)();
