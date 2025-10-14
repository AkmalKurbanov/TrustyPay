// hero.js
(function () {
  function initHeroVideo() {
    const video = document.querySelector('.hero__bg');
    if (!video) return; // нет hero на странице — тихо выходим

    // Настройки
    const videoSettings = {
      desktop: { src: './images/parallax/desktop.webm', restartAt: 5.2 },
      mobile: { src: './images/parallax/mobile.webm', restartAt: 5.2 }
    };

    // Автоплей-политики
    video.muted = true;
    video.playsInline = true; // iOS
    video.preload = 'metadata';
    video.loop = false;

    let currentKey = null;
    const hasPlayed = { desktop: false, mobile: false };
    let resizeTimer = null;

    function setVideoSource() {
      const newKey = window.innerWidth >= 768 ? 'desktop' : 'mobile';
      if (newKey === currentKey) return;

      currentKey = newKey;
      const cfg = videoSettings[newKey];

      video.pause();
      video.src = cfg.src;
      video.load();

      video.addEventListener('loadedmetadata', function onMeta() {
        const start = hasPlayed[newKey] ? (cfg.restartAt || 0) : 0;
        const safeStart = Math.min(start, Math.max(0, (video.duration || 0) - 0.1));

        // На некоторых мобильных установка currentTime до play может бросать
        const seek = () => {
          try {
            video.currentTime = safeStart;
          } catch (err) {
            setTimeout(() => {
              try { video.currentTime = safeStart; } catch (e) { }
            }, 100);
          }
        };

        seek();
        video.play().catch(() => { }); // игнорируем, если автоплей заблокирован
        hasPlayed[newKey] = true;
      }, { once: true });
    }

    video.addEventListener('ended', () => {
      if (!currentKey) return;
      const cfg = videoSettings[currentKey];
      const restartAt = typeof cfg.restartAt === 'number' ? cfg.restartAt : 0;
      const safeRestart = Math.min(restartAt, Math.max(0, (video.duration || 0) - 0.1));

      try {
        video.currentTime = safeRestart;
        video.play().catch(() => { });
      } catch (err) {
        setTimeout(() => {
          try { video.currentTime = safeRestart; } catch (e) { }
          video.play().catch(() => { });
        }, 100);
      }
    });

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setVideoSource, 150);
    });

    setVideoSource();
  }

  // Гарантируем, что DOM есть
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroVideo, { once: true });
  } else {
    initHeroVideo();
  }
})();
