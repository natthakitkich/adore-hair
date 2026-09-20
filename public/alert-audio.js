// ปิดระบบเสียงเรียกคิวทั้งหมด
(() => {
  'use strict';

  // รองรับการเรียกจาก app.js เดิม โดยไม่เล่นเสียง
  window.enableAdoreAudio = () => {};

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  function removeAudioControls() {
    document.getElementById('soundBanner')?.remove();
    document.getElementById('enableSoundBtn')?.remove();
  }

  removeAudioControls();

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      removeAudioControls,
      { once: true }
    );
  }
})();

// END ADORE NO AUDIO
