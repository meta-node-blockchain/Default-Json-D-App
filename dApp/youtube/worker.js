console.log('<<<<<<<<<<<Init-Worker>>>>>>>>>>>');
(function () {
  console.log('<<<<<<<<<<<Start-Auto-Function>>>>>>>>>>>');
  let tiemout_register;
  let interval_getCookies;
  // Utils function
  /**
   * Hàm này lấy video ID từ URL YouTube.
   * @param {string} url - URL của video YouTube
   * @returns {string} - ID của video
   * @throws {Error} Nếu URL không phải từ YouTube hoặc không tìm thấy ID
   */
  function getURLVideoID(url) {
    const youtubeRegex =
      /^https?:\/\/(youtu\.be\/|(www\.)?youtube.com\/(embed|v)\/)/;
    const youtubeDomains = new Set([
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'gaming.youtube.com',
    ]);

    // Phân tích URL để lấy hostname và query parameters
    const urlObj = new URL(url);
    const videoIDParam = urlObj.searchParams.get('v');

    let videoID = videoIDParam;

    if (youtubeRegex.test(url) && !videoID) {
      const pathSegments = urlObj.pathname.split('/');
      videoID = pathSegments[pathSegments.length - 1];
    } else if (!youtubeDomains.has(urlObj.hostname)) {
      return '';
    }

    if (!videoID) {
      return '';
    }

    // Trích xuất 11 ký tự đầu tiên của video ID
    videoID = videoID.substring(0, 11);

    // Giả sử validateID là một hàm tự định nghĩa để kiểm tra định dạng ID
    if (typeof validateID === 'function' && !validateID(videoID)) {
      return '';
    }

    return videoID;
  }

  /**
   * Hàm kiểm tra tính hợp lệ của ID video (ví dụ)
   * @param {string} id - ID của video YouTube
   * @returns {boolean} - Kết quả kiểm tra
   */
  function validateID(id) {
    // Kiểm tra xem ID có phải là 11 ký tự không
    return /^[a-zA-Z0-9_-]{11}$/.test(id);
  }
  // End Utils function

  function getCurrentCookies() {
    if (
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.callbackHandler &&
      typeof window.webkit.messageHandlers.callbackHandler.postMessage ===
        'function'
    ) {
      window.webkit.messageHandlers.callbackHandler.postMessage(
        JSON.stringify({
          workerId: window.workerId,
          command: 'get-cookies',
        })
      );
    } else if (
      window.electronAPI &&
      typeof window.electronAPI.sendMessage === 'function'
    ) {
      window.electronAPI.sendMessage(
        'native',
        JSON.stringify({
          workerId: window.workerId,
          command: 'get-cookies',
        })
      );
    }
  }

  const sendEvent = function (action, content) {
    console.log('CS_LOG sendEvent 1: ', action);
    if (action !== 'register' && typeof window.workerId !== 'string') {
      return false;
    }

    console.log('CS_LOG sendEvent 2: ', action);
    if (
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.callbackHandler &&
      typeof window.webkit.messageHandlers.callbackHandler.postMessage ===
        'function'
    ) {
      console.log('CS_LOG sendEvent 3: ', action);
      window.webkit.messageHandlers.callbackHandler.postMessage(
        JSON.stringify({
          workerId: window.workerId,
          command: 'backWorker',
          action,
          content,
        })
      );
    } else if (
      window.electronAPI &&
      typeof window.electronAPI.sendMessage === 'function'
    ) {
      console.log('CS_LOG sendEvent 4: ', action);
      window.electronAPI.sendMessage(
        'native',
        JSON.stringify({
          workerId: window.workerId,
          command: 'backWorker',
          action,
          content,
        })
      );
    } else {
      throw new Error('Không có phương thức send message hợp lệ!');
    }
  };
  // Init backworker
  window.backWorker = {
    register: function (obj) {
      // trrong vong 1 giay can nhan lai workerid
      tiemout_register = setTimeout(function () {
        console.log('Timeout register worker');
      }, 3000);

      sendEvent('register', obj);
    },
    execute: function (js) {
      // lenh js chay
      sendEvent('execute', {
        js,
      });
    },
    postMessage: function (obj) {
      // lenh js chay
      sendEvent('postMessage', obj);
    },
    action: function (cmd) {
      // lenh chay cac lenh trong register nhu next, back, ...
      sendEvent('action', {
        cmd,
      });
    },
    command: function (command) {
      // command la danh cho cac script de thuc thu nhu notification
      sendEvent('command', command);
    },
    stop: function () {
      sendEvent('stop', {});
    },
    fetch: (e) =>
      new Promise((resolve, reject) => {
        var n = (e) => {
          if ('url' !== e.data) {
            return;
          }
          let s = atob(window.abc);

          window.removeEventListener('message', n), resolve(s);
        };
        window.addEventListener('message', n, !1);

        window.webkit.messageHandlers.callbackHandler.postMessage(
          JSON.stringify({
            command: 'get-url',
            url: e,
          })
        );
      }),
  };

  if (window.workerId) {
    return;
  }
  // Register backworker
  window.backWorker.register({
    type: 'media',
    // link: 'https://json.fi.ai/script/youtube-main-worker.js',
    // link: 'https://raw.githubusercontent.com/meta-node-blockchain/Default-Json-D-App/refs/heads/master/dApp/youtube/main_70f50627f4a1ec1b61a2cf3d36db7f587e1865ea268282816e4faa1d682f3e33.wasm',
    // link: 'http://192.168.1.48:5503/webYtCoreOrgYT/dist/main_70f50627f4a1ec1b61a2cf3d36db7f587e1865ea268282816e4faa1d682f3e33.wasm',
    // link: 'http://192.168.1.48:5503/webYtCoreOrgYT/dist/main.js',
    link: 'http://192.168.1.81:5501/dist/main.js',
    next: 'window.objYoutube.nextPlay(1);',
    back: 'window.objYoutube.nextPlay(-1);',
    onDuration: 'window.objYoutube.onDuration({currentTime}, {totalTime});', // binding
    onPause: 'window.objYoutube.onPause()',
    onFailed: 'window.objYoutube.onFailed()',
    // onPlay: "window.objYoutube.onPlay()",
    onPlay: 'window.objYoutube.onPlay({totalTime});',
    onStop: 'window.objYoutube.clear();',
    replay: 'window.objYoutube.nextPlay(0);',

    prepareOnPlay: 'window.objYoutube.prepareOnPlay();',
    prepareOnFailed: 'window.objYoutube.prepareOnFailed();',
    workerId: 'yotube.metanode.app',
  });
  var isShowRecoment = false;
  function handleRecommentLogin() {
    if (window.location.href.indexOf('m.youtube.com') === -1) {
      return;
    }
    if (isShowRecoment == true) {
      return;
    }
    // Hiển thị recomment login
    // Dù người dùng chọn gì thì cũng gán biến isShowRecomment = true để ko hiển thị lại
    const url = e.data.url;
    let text = 'Please login for a better experience';
    if (confirm(text) == true) {
      window.location.href = url;
    }
    isShowRecoment = true;
    // Sau 3 phút thì reset lại biến isShowRecomment = false để giả sử người dùng chưa đăng nhập sau 3 phút thì vẫn hiển thị lại recomment
    setTimeout(() => {
      isShowRecoment = false;
    }, 60000 * 3);
  }

  var n = (e) => {
    if (!e) return;
    if (typeof e.data === 'string') {
      const tmps = e.data.split('|');
      if (tmps[0] !== 'backWorker') {
        return;
      }
      if (tmps[tmps.length - 1] !== 'end') {
        return;
      }
      if (tmps[1] === 'id') {
        window.workerId = tmps[2];
        clearTimeout(tiemout_register);
        interval_getCookies = setInterval(() => {
          getCurrentCookies();
        }, 5000);
        getCurrentCookies();
      }
      return;
    }
    if (typeof e.data === 'object') {
      const { command, data } = e.data;
      if (command === 'get-cookies') {
        console.log('<<<<<<<<<<<data>>>>>>>>>>>', data);
        let cookies = data.cookies;
        if (typeof cookies != 'string' && data.data.cookies) {
          cookies = data.data.cookies;
        }
        console.log('cookies ---------->', cookies);
        window.backWorker.execute(`window.objYoutube.setCookies("${cookies}")`);
        if (interval_getCookies && cookies) {
          clearInterval(interval_getCookies);
        }
        return;
      }
      const cmd = e.data && e.data.cmd;
      if (cmd === 'getInfoResult') {
        window.backWorker.execute(
          `window.objYoutube.nextPlay(1, "getInfoResult");`
        );
        // if (e.data && e.data.data && e.data.data.relatedCount == 0) {
        //   setTimeout(() => {
        //     const playList = getRelatedFromHTML();
        //     window.backWorker.execute(
        //       `window.objYoutube.changeLinks(${JSON.stringify(playList)})`
        //     );
        //   }, 1500);
        // }
        return;
      }
      if (cmd === 'recommended-login') {
        handleRecommentLogin();
        return;
      }
    }
  };
  window.addEventListener('message', n, !1);
  if (
    window.electronAPI &&
    typeof window.electronAPI.onMessage === 'function'
  ) {
    // window.electronAPI.onMessage("fromNative", n);
    window.electronAPI.onMessage('fromNative', (data) => {
      let message = data[0];
      if (typeof message === 'string') {
        if (message.startsWith('{') && message.endsWith('}')) {
          message = JSON.parse(message);
        } else {
          message = {
            data: message,
          };
        }
      }
      n(message);
    });
  }

  const durationToSeconds = function (durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map((s) => parseInt(s.trim(), 10));
    if (parts.some(isNaN)) return 0;
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      seconds = seconds * 60 + parts[i];
    }
    return seconds;
  };
  function extractThumbnail(item, id) {
    const imgElem = item.querySelector('a > ytm-thumbnail-cover img');
    const fallbackThumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    const thumbnail = imgElem
      ? imgElem.getAttribute('src') ||
        imgElem.getAttribute('data-src') ||
        fallbackThumbnail
      : fallbackThumbnail;
    return thumbnail;
  }

  function getRelatedFromSingleColumn() {
    try {
      if (!window.document) {
        return [];
      }
      // Tìm toàn bộ ytm-single-column-watch-next-results-renderer trên trang
      const singleColumns = document.querySelectorAll(
        'ytm-single-column-watch-next-results-renderer'
      );
      console.log(
        `Found ${singleColumns.length} ytm-single-column-watch-next-results-renderer`
      );
      const videos = [];

      singleColumns.forEach((column, idx) => {
        console.log(`📌 Processing single-column #${idx}`);

        const sectionElements = column.querySelectorAll(
          'ytm-item-section-renderer'
        );
        console.log(
          `   ➜ Found ${sectionElements.length} ytm-item-section-renderer inside single-column #${idx}`
        );

        sectionElements.forEach((section, sidx) => {
          console.log(
            `      ➜ Processing section #${sidx} inside column #${idx}`
          );

          // Lấy video trong section
          const items = section.querySelectorAll(
            'ytm-video-with-context-renderer'
          );
          console.log(
            `         ➜ Found ${items.length} videos in section #${sidx}`
          );

          items.forEach((item) => {
            try {
              const anchor = item.querySelector('a[href*="/watch"]');
              if (!anchor) return;

              const url = new URL(
                anchor.getAttribute('href'),
                'https://www.youtube.com'
              );
              const id = url.searchParams.get('v') || '';

              const titleElem = item.querySelector('h3 span[aria-label]');
              const title = titleElem ? titleElem.textContent.trim() : '';

              const authorElem = item.querySelector(
                '.ytm-badge-and-byline-item-byline span.yt-core-attributed-string'
              );
              const author = authorElem ? authorElem.textContent.trim() : '';

              const durationElem = item.querySelector(
                'ytm-thumbnail-overlay-time-status-renderer .badge-shape-wiz__text'
              );
              const durationStr = durationElem
                ? durationElem.textContent.trim()
                : '';
              const duration = durationToSeconds(durationStr);

              // Lấy thumbnail chính xác
              const imgElem =
                item.querySelector('a.media-item-thumbnail-container img') ||
                item.querySelector('img');
              const thumbnail = extractThumbnail(item, id);
              if (id && title) {
                videos.push({
                  id,
                  title,
                  owner: author,
                  duration,
                  watchUrl: 'https://www.youtube.com/watch?v=' + id,
                  thumbnail,
                });
              }
            } catch (err) {
              console.log('---------------> error in item', err);
            }
          });
        });
      });

      console.log(
        `✅ Extracted ${videos.length} related videos from single-column sections`
      );
      return videos;
    } catch (e) {
      console.log('Error in getRelatedFromSingleColumn:', e);
      return [];
    }
  }

  function getRelatedFromHTML() {
    try {
      if (!window.document) {
        return [];
      }

      // LẤY TOÀN BỘ CÁC SECTION
      const sectionElements = window.document.querySelectorAll(
        'ytm-item-section-renderer[section-identifier="related-items"]'
      );
      console.log('sectionElements:', sectionElements);

      const parser = new DOMParser();
      const videos = [];
      sectionElements.forEach((section, idx) => {
        console.log(`Processing section #${idx}`);

        // PARSE HTML RIÊNG TỪNG SECTION
        const doc = parser.parseFromString(section.outerHTML, 'text/html');

        const items = doc.querySelectorAll('ytm-video-with-context-renderer');
        console.log(`Found ${items.length} items in section #${idx}`);

        items.forEach((item) => {
          try {
            const anchor = item.querySelector('a[href*="/watch"]');
            if (!anchor) return;

            const url = new URL(
              anchor.getAttribute('href'),
              'https://www.youtube.com'
            );
            const id = url.searchParams.get('v') || '';

            const titleElem = item.querySelector('h3 span[aria-label]');
            const title = titleElem ? titleElem.textContent.trim() : '';

            const authorElem = item.querySelector(
              '.ytm-badge-and-byline-item-byline span.yt-core-attributed-string'
            );
            const author = authorElem ? authorElem.textContent.trim() : '';

            const durationElem = item.querySelector(
              'ytm-thumbnail-overlay-time-status-renderer .badge-shape-wiz__text'
            );
            const durationStr = durationElem
              ? durationElem.textContent.trim()
              : '';
            const duration = durationToSeconds(durationStr);

            const thumbnail = extractThumbnail(item, id);
            console.log('thumbnail --> ', thumbnail);

            if (id && title) {
              videos.push({
                id,
                title,
                owner: author,
                duration,
                watchUrl: 'https://www.youtube.com/watch?v=' + id,
                thumbnail,
              });
            }
          } catch (err) {
            console.log('---------------> error', err);
          }
        });
      });

      console.log(`✅ Extracted ${videos.length} related videos`);

      if (videos.length == 0) {
        return getRelatedFromSingleColumn();
      }
      return videos;
    } catch (e) {
      console.log('Error getRelatedFromHTML', e);
      return [];
    }
  }

  window.setCookies = function (cookies) {
    if (!cookies || cookies.length == 0) {
      return;
    }
    window.backWorker.execute(`window.objYoutube.setCookies(${cookies})`);
  };

  window.getVideoInfo = function (youtubeURL) {
    const id = getURLVideoID(youtubeURL);
    if (!id || youtubeURL.indexOf('#searching') > -1) {
      return;
    }
    const a = function (data) {
      window.backWorker.postMessage(
        window.workerId,
        JSON.stringify({
          cmd: 'getInfoResult',
          data: data,
        })
      );
    };
    window.backWorker.execute(
      `window.objYoutube.getLink('${youtubeURL}', ${a.toString()}, true, 'main_v2')`
    );
  };

  window.callPauseVideo = function () {
    const videoTags = document.querySelectorAll('video');
    if (videoTags && videoTags.length > 0) {
      videoTags.forEach((vid) => {
        vid.muted = true;
        vid.autoplay = false;
        if (vid.paused === true) {
          return;
        }
        vid.pause();
        vid.currentTime = vid.duration - 2;
      });
    }
    var player = document.getElementById('player-container-id');

    if (player != null) {
      var node = document.createElement('div');
      node.style =
        'position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px;  background-color: transparent';
      player.appendChild(node);
    }
  };

  window.handlePause = function () {
    window.callPauseVideo();
    // cữ mỗi 300ms sẽ gọi để pause video 1 lần
    window._toCallPause = setInterval(function () {
      window.callPauseVideo();
    }, 300);
  };

  window.handlePause();
})();

console.log('<<<<<<<<<<<END-Line-Worker>>>>>>>>>>>');
