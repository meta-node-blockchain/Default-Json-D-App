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
    window.webkit.messageHandlers.callbackHandler.postMessage(
      JSON.stringify({
        workerId: window.workerId,
        command: 'get-cookies',
      })
    );
  }

  const sendEvent = function (action, content) {
    if (action !== 'register' && typeof window.workerId !== 'string') {
      return false;
    }

    window.webkit.messageHandlers.callbackHandler.postMessage(
      JSON.stringify({
        workerId: window.workerId,
        command: 'backWorker',
        action,
        content,
      })
    );
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
  console.log('<<<<<<<<<<<Call-Register>>>>>>>>>>>');
  // Register backworker
  window.backWorker.register({
    type: 'media',
    // link: 'https://raw.githubusercontent.com/meta-node-blockchain/Default-Json-D-App/refs/heads/master/dApp/youtube/main.js',
    link: 'https://raw.githubusercontent.com/meta-node-blockchain/Default-Json-D-App/refs/heads/master/dApp/youtube/main_70f50627f4a1ec1b61a2cf3d36db7f587e1865ea268282816e4faa1d682f3e33.wasm',
    // link: 'http://192.168.1.48:5503/webYtCoreOrgYT/dist/main_70f50627f4a1ec1b61a2cf3d36db7f587e1865ea268282816e4faa1d682f3e33.wasm',
    // link: 'http://192.168.1.48:5503/webYtCoreOrgYT/dist/main.js',
    // link: 'http://192.168.1.179:5502/webYtCoreOrgYT/dist/test.js',
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
        const { cookies } = data.data;
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
        return;
      }
      if (cmd === 'recommended-login') {
        handleRecommentLogin();
        return;
      }
    }
  };
  window.addEventListener('message', n, !1);

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
    console.log('<<<<<<<<<<<<<<<<<window.getVideoInfo-done>>>>>>>>>>>>>>>>>');
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
    console.log('<<<<<<<<<<window.callPauseVideo>>>>>>>>>>');
    const videoTags = document.querySelectorAll('video');
    if (videoTags && videoTags.length > 0) {
      videoTags.forEach((vid) => {
        console.log('vid --> ', typeof vid, vid.muted, vid.paused);
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
