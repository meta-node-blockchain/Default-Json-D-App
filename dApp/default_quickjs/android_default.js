'function' != typeof window.addEventListener &&
  ((window.eventListeners = {}),
  (window.addEventListener = function (e, n, o) {
    Array.isArray(window.eventListeners[e]) || (window.eventListeners[e] = []),
      window.eventListeners[e].push(n);
  }),
  (window.triggerEventListener = function (e, n) {
    if (!Array.isArray(window.eventListeners[e])) return !1;
    for (var o = 0; o < window.eventListeners[e].length; o++)
      'function' == typeof window.eventListeners[e][o] &&
        window.eventListeners[e][o](n);
    return !0;
  }),
  (window.removeEventListener = function (e, n) {
    (window.eventListeners[e] = null), delete window.eventListeners[e];
  }),
  (window.objTimer = {}),
  (window.objInterval = {}),
  (window.setTimeout = function (e, n) {
    if ('function' != typeof e) return !1;
    const o = window.backWorker.UUID();
    return (
      (window.objTimer[o] = e),
      window.backWorker.setTimeoutId(window.workerId, o, n),
      o
    );
  }),
  (window.clearTimeout = function (e) {
    window.backWorker.clearTimeoutId(window.workerId, e);
  }),
  (window.setInterval = function (e, n) {
    if ('function' != typeof e) return !1;
    const o = window.backWorker.UUID();
    return (
      (window.objInterval[o] = e),
      window.backWorker.setIntervalId(window.workerId, o, n),
      o
    );
  }),
  (window.clearInterval = function (e) {
    window.backWorker.clearIntervalId(window.workerId, e);
  }),
  (window.backWorker.fetch = (e, n) =>
    new Promise((n, o) => {
      window.setTimeout(() => {
        const o = getDataFromURL2(e);
        n(o);
      }, 50);
    })));
