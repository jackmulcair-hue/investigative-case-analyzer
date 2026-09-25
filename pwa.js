/* Progressive web app enhancements: install prompt, connection status and share action. */
(() => {
  let deferredPrompt;
  const installButton = () => document.querySelector('[data-install-app]');
  const refreshInstall = () => { const button = installButton(); if (button) button.hidden = !deferredPrompt; };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; refreshInstall(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; refreshInstall(); });
  window.addEventListener('online', () => document.documentElement.classList.remove('offline'));
  window.addEventListener('offline', () => document.documentElement.classList.add('offline'));
  window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    const observer = new MutationObserver(() => {
      const actions = document.querySelector('.top-actions');
      if (!actions || actions.querySelector('[data-install-app]')) return;
      const install = document.createElement('button');
      install.className = 'btn light pwa-action'; install.dataset.installApp = ''; install.hidden = !deferredPrompt;
      install.textContent = '⇩ Install app';
      install.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; refreshInstall(); });
      actions.prepend(install);
      const share = document.createElement('button');
      share.className = 'btn ghost pwa-action'; share.textContent = '↗ Share';
      share.addEventListener('click', async () => { const data = { title: 'Clarity', text: 'Clarity evidence-first case workspace', url: location.href }; if (navigator.share) await navigator.share(data); else await navigator.clipboard?.writeText(location.href); });
      actions.prepend(share);
      const status = document.createElement('span'); status.className = 'connection-status'; status.textContent = navigator.onLine ? '● Online' : '○ Offline';
      actions.append(status);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
