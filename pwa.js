/* Progressive web app enhancements: install, sharing, status, and update readiness. */
(() => {
  let deferredPrompt = null;
  let toolbar;
  let installButton;
  let status;

  const setOnlineState = () => {
    const online = navigator.onLine;
    document.documentElement.classList.toggle('offline', !online);
    if (status) status.textContent = online ? '● Online' : '○ Offline — local shell available';
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
  };

  const share = async () => {
    const data = { title: 'Clarity', text: 'Clarity evidence-first case workspace', url: location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch (_) { /* User cancelled sharing. */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(location.href);
      status.textContent = 'Link copied';
      setTimeout(setOnlineState, 1800);
    }
  };

  const createToolbar = () => {
    if (document.querySelector('.pwa-toolbar')) return;
    toolbar = document.createElement('div');
    toolbar.className = 'pwa-toolbar';

    installButton = document.createElement('button');
    installButton.className = 'btn light pwa-install';
    installButton.textContent = '⇩ Install app';
    installButton.hidden = !deferredPrompt;
    installButton.addEventListener('click', install);

    const shareButton = document.createElement('button');
    shareButton.className = 'btn ghost';
    shareButton.textContent = '↗ Share';
    shareButton.addEventListener('click', share);

    status = document.createElement('span');
    status.className = 'pwa-status';
    toolbar.append(installButton, shareButton, status);
    document.body.appendChild(toolbar);
    setOnlineState();
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
  });
  window.addEventListener('online', setOnlineState);
  window.addEventListener('offline', setOnlineState);

  window.addEventListener('DOMContentLoaded', () => {
    createToolbar();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
        console.warn('Clarity service worker registration failed', error);
      });
    }
  });
})();
