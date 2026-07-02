(() => {
  const endpoint = document.querySelector('meta[name="visit-log-endpoint"]')?.content;

  if (!endpoint) {
    return;
  }

  const payload = {
    page: window.location.pathname,
    title: document.title,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    visitedAt: new Date().toISOString(),
  };

  const contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
  const body = new URLSearchParams(
    Object.entries(payload).map(([key, value]) => [key, value == null ? '' : String(value)]),
  ).toString();

  const mobilePattern = /Mobi|Android|iPhone|iPad|iPod/i;
  const isMobileDevice = mobilePattern.test(navigator.userAgent || '')
    || navigator.maxTouchPoints > 1;

  let sent = false;
  let sending = false;

  const finish = (ok) => {
    sending = false;
    if (ok) {
      sent = true;
    }
  };

  const sendVisit = () => {
    if (sent || sending) {
      return;
    }

    sending = true;

    if (isMobileDevice) {
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      image.src = `${endpoint}?${body}&transport=image&cacheBust=${Date.now()}`;
      finish(true);
      return;
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: contentType });
      if (navigator.sendBeacon(endpoint, blob)) {
        finish(true);
        return;
      }
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).then(() => {
      finish(true);
    }).catch(() => {
      finish(false);
    });
  };

  sendVisit();
  window.addEventListener('pageshow', sendVisit, { passive: true });
  window.addEventListener('pagehide', sendVisit, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendVisit();
    }
  }, { passive: true });
})();