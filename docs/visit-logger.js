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

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    const queued = navigator.sendBeacon(endpoint, blob);
    if (queued) {
      return;
    }
  }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    mode: 'cors',
  }).catch(() => {
  });
})();