import Phaser from 'phaser';

let manualFullscreenOptOut = false;
let lastManualToggleAt = 0;
let initialized = false;

function isTouchOrMobileDevice(game: Phaser.Game): boolean {
  const os = game.device.os;
  if (os.android || os.iOS || os.iPad || os.iPhone || os.windowsPhone) {
    return true;
  }
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth <= 1024
  );
}

function isLandscapeViewport(): boolean {
  if (window.matchMedia('(orientation: landscape)').matches) {
    return true;
  }
  return window.innerWidth > window.innerHeight;
}

/**
 * Tenta ativar tela cheia automaticamente quando o dispositivo móvel está na horizontal (paisagem).
 */
export function tryAutoLandscapeFullscreen(scale: Phaser.Scale.ScaleManager): void {
  if (manualFullscreenOptOut) return;
  if (Date.now() - lastManualToggleAt < 400) return;
  if (!isTouchOrMobileDevice(scale.game)) return;
  if (!scale.fullscreen.available || scale.isFullscreen) return;

  if (isLandscapeViewport()) {
    try {
      scale.startFullscreen();
    } catch {
      // Caso o navegador exija um gesto de toque ativo, o listener de pointerup/touchend ativa no primeiro toque.
    }
  }
}

/**
 * Alterna manualmente o modo de tela cheia pelo botão da UI ou tecla F,
 * registrando caso o jogador escolha sair manualmente para não forçar reentrada imediata.
 */
export function toggleGameFullscreen(scale: Phaser.Scale.ScaleManager): void {
  if (!scale.fullscreen.available) return;
  lastManualToggleAt = Date.now();

  if (scale.isFullscreen) {
    manualFullscreenOptOut = true;
    scale.stopFullscreen();
  } else {
    manualFullscreenOptOut = false;
    try {
      scale.startFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (type: string) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function' && isTouchOrMobileDevice(scale.game)) {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignora falha caso bloqueado pelo navegador
    }
  }
}

/**
 * Configura ouvintes globais para entrar em tela cheia automaticamente ao girar o celular de lado
 * (e ativar no primeiro toque em modo paisagem caso o navegador exija gesto do usuário).
 */
export function setupAutoLandscapeFullscreen(game: Phaser.Game): void {
  if (initialized) return;
  initialized = true;

  const checkOrientation = () => {
    const scale = game.scale;
    if (!scale || !isTouchOrMobileDevice(game)) return;

    if (isLandscapeViewport()) {
      tryAutoLandscapeFullscreen(scale);
    } else {
      // Ao voltar o celular para vertical (retrato), reseta o opt-out manual
      // para que ao girar de lado novamente ele entre em tela cheia automaticamente.
      manualFullscreenOptOut = false;
    }
  };

  window.addEventListener('orientationchange', () => {
    manualFullscreenOptOut = false;
    setTimeout(checkOrientation, 120);
  });

  window.addEventListener('resize', () => {
    checkOrientation();
  });

  const mediaQuery = window.matchMedia('(orientation: landscape)');
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        manualFullscreenOptOut = false;
        setTimeout(checkOrientation, 80);
      } else {
        manualFullscreenOptOut = false;
      }
    });
  }

  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', () => {
      manualFullscreenOptOut = false;
      setTimeout(checkOrientation, 80);
    });
  }

  // Fallback para navegadores mobile que exigem gesto do usuário (user activation) para requestFullscreen:
  // quando o celular está deitado, qualquer interação/toque entra automaticamente em tela cheia.
  const onUserGesture = () => {
    if (!game.scale) return;
    tryAutoLandscapeFullscreen(game.scale);
  };

  window.addEventListener('touchend', onUserGesture, { passive: true });
  window.addEventListener('pointerup', onUserGesture, { passive: true });
  window.addEventListener('click', onUserGesture, { passive: true });
}
