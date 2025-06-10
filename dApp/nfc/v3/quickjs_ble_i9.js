(function () {
  if (typeof window.objBLE2 === 'object') {
    return;
  }

  var currentDeviceId = '';
  var currentService = '';
  var currentNotifyCharacteristic = '';
  var currentWriteCharacteristic = '';
  var receiveData = [];
  var receiveDataLength = 0;
  var readingCard = false;
  var flatDisconnect = false;

  function hexToString(hex) {
    // Ensure the hex string has an even length
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }

    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      // Get the next two hex digits
      const hexCode = hex.slice(i, i + 2);
      // Convert hex code to decimal
      const decimal = parseInt(hexCode, 16);
      // Convert decimal to character and append to result
      result += String.fromCharCode(decimal);
    }
    return result;
  }

  function stringToHex(str) {
    let hexString = '';
    for (let i = 0; i < str.length; i++) {
      let hex = str.charCodeAt(i).toString(16);
      hexString += ('00' + hex).slice(-2); // Ensure two digits by padding with leading zeros if necessary
    }
    return hexString;
  }

  function binToHex(byteArray) {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
  }

  function hexToBin(hexString) {
    if (hexString.length % 2 !== 0) {
      throw new Error('Hex string length must be even');
    }

    const byteArray = new Uint8Array(hexString.length / 2);

    for (let i = 0; i < hexString.length; i += 2) {
      const byteValue = parseInt(hexString.substr(i, 2), 16);
      byteArray[i / 2] = byteValue;
    }

    return byteArray;
  }

  function calculateCrc(data, start, length) {
    let result = 0;
    if (data != null) {
      for (let index = start; index < start + length; ++index) {
        result ^= data[index];
      }
    }
    return result;
  }

  function arrayCopy(src, srcPos, dest, destPos, length) {
    for (let i = 0; i < length; i++) {
      dest[destPos + i] = src[srcPos + i];
    }
  }

  function readData(value) {
    var result = false;

    if (value[0] == 109 && value.length >= 5) {
      if (
        (value[4] != 5 || value[5] != 1) &&
        (value[4] != 6 || value[5] != 0) &&
        (value[4] != 6 || value[5] != 1) &&
        (value[4] != 2 || value[5] != 160) &&
        (value[4] != 9 || value[5] != 27) &&
        (value[4] != 6 || value[5] != 2) &&
        (value[4] != 2 || value[5] != 4) &&
        (value[4] != 2 || value[5] != 0) &&
        (value[4] != 9 || value[5] != 7) &&
        (value[4] != 9 || value[5] != 8) &&
        (value[4] != 9 || value[5] != 34) &&
        (value[4] != 2 || value[5] != 161) &&
        (value[4] != 9 || value[5] != 49) &&
        (value[4] != 9 || value[5] != 50) &&
        (value[4] != 9 || value[5] != 131) &&
        (value[4] != 9 || value[5] != 130) &&
        (value[4] != 2 || value[5] != 226) &&
        (value[4] != 2 || value[5] != 224) &&
        (value[4] != 2 || value[5] != 225) &&
        (value[4] != 9 || value[5] != 19) &&
        (value[4] != 2 || value[5] != 6) &&
        (value[4] != 2 || value[5] != 32) &&
        (value[4] != 9 || value[5] != 17) &&
        (value[4] != 9 || value[5] != 18) &&
        (value[4] != 11 || value[5] != 0) &&
        (value[4] != 9 || value[5] != 102) &&
        (value[4] != 2 || value[5] != 16) &&
        (value[4] != 9 || value[5] != 255) &&
        (value[4] != 9 || value[5] != 103) &&
        (value[4] != 5 || value[5] != 6) &&
        (value[4] != 5 || value[5] != 7) &&
        (value[4] != 2 || value[5] != 13) &&
        (value[4] != 2 || value[5] != 14) &&
        (value[4] != 2 || value[5] != 15) &&
        (value[4] != 2 || value[5] != 9) &&
        (value[4] != 2 || value[5] != 162)
      ) {
        console.log('MYLOG not first data 109');
      } else {
        var messageLength = ((value[1] & 255) << 8) | (value[2] & 255);
        receiveDataLength = messageLength + 4;
        receiveData = [];
      }
    }

    for (let item of value) {
      receiveData.push(item);
    }

    if (receiveData.length == receiveDataLength) {
      var crc = calculateCrc(receiveData, 0, receiveData.length - 1);
      result = crc == receiveData[receiveData.length - 1];
    }

    return result;
  }

  function getTag(index, source) {
    var tag1 = source[index];
    if ((tag1 & 31) == 31) {
      return [source[index], source[index + 1]];
    } else {
      return [source[index]];
    }
  }

  function getLen(index, source) {
    var len1 = source[index];
    if ((len1 & 128) == 0) {
      return [source[index]];
    } else {
      var len2 = len1 & 127;
      ++len2;
      var len = [];
      arrayCopy(source, index, len, 0, len2);
      return len;
    }
  }

  function getValue(index, source, len) {
    var value = [];
    arrayCopy(source, index, value, 0, len);
    return value;
  }

  function parseTlvData(tlvData) {
    var index = 0;
    var tlvs = [];

    while (index < tlvData.length) {
      var tag = getTag(index, tlvData);
      index += tag.length;

      var len = getLen(index, tlvData);
      index += len.length;

      var iLen = 0;
      if (len.length == 1) {
        iLen = len[0] & 255;
      } else if (len.length == 2) {
        iLen = len[1] & 255;
      } else if (len.length == 3) {
        iLen = (len[1] & 255) * 256 + (len[2] & 255);
      }

      var value = getValue(index, tlvData, iLen);
      index += value.length;
      tlvs.push({
        tag: binToHex(tag),
        len: binToHex(len),
        val: binToHex(value),
      });
    }

    return tlvs;
  }

  function parseCardInfo(data) {
    var index = 6;
    const tlvDataLength =
      ((data[index + 1] & 255) << 8) | (data[index + 2] & 255);

    index = index + 3;

    var tlvData = [];
    arrayCopy(data, index, tlvData, 0, tlvDataLength);

    var tlvs = parseTlvData(tlvData);

    var cardInfo = {};
    for (var tlvIndex in tlvs) {
      var tlv = tlvs[tlvIndex];
      if (tlv.tag == '1f51') {
        cardInfo.cardNumber = hexToString(tlv.val);
      } else if (tlv.tag == '1f4e') {
        cardInfo.expireDate = hexToString(tlv.val);
      } else if (tlv.tag == '1f55') {
        cardInfo.cardName = hexToString(tlv.val);
      } else if (tlv.tag == '1f41') {
        cardInfo.cardType = parseInt(tlv.val.slice(0, 2));
      }
    }

    readingCard = false;
    if (flatDisconnect) return;
    postMessage('onReadCardResultI9', { success: true, cardInfo });
  }

  function onDidUpdateValueForCharacteristic(data) {
    if (readData(data.value)) {
      var index = 6;
      if (receiveData[index - 2] == 9 && receiveData[index - 1] == 7) {
        if (flatDisconnect) return;
        postMessage('onReadCardResultI9', {
          success: false,
          message: 'Stop trade',
        });
        readingCard = false;
        return;
      }

      if (receiveData[index - 2] != 2 || receiveData[index - 1] != 160) {
        return;
      }

      if (receiveData[index] == 132) {
        // postMessage("onReadCardProcess", { status: "onICCardInsertion" });
        return;
      }

      if (receiveData[index] == 136) {
        // postMessage("onReadCardProcess", { status: "onWaitingPin" });
        return;
      }

      if (receiveData[index] == 128) {
        // postMessage("onReadCardProcess", { status: "onWaitingCard" });
        return;
      }

      if (receiveData[index] == 138) {
        // postMessage("onReadCardProcess", { status: "onNFCCardDetection" });
        return;
      }

      if (receiveData[index] == 1) {
        // postMessage("onReadCardProcess", { status: "onTimeout" });
        // postMessage("onReadCardResultI9", {
        //   success: false,
        //   message: "Read card error: timeout",
        // });
        readingCard = false;
        return;
      }

      if (receiveData[index] != 0) {
        if (flatDisconnect) return;
        postMessage('onReadCardResultI9', {
          success: false,
          message: 'Read card error',
        });
        readingCard = false;
        return;
      }

      parseCardInfo(receiveData);

      receiveData = [];
    }
  }

  function padZero(num) {
    return (num < 10 ? '0' : '') + num;
  }

  function padZeroHexString(hex) {
    return (hex.length % 2 != 0 ? '0' : '') + hex;
  }

  function handleReadCard() {
    if (readingCard) {
      return;
    }
    if (
      currentDeviceId.length == 0 ||
      currentService.length == 0 ||
      currentWriteCharacteristic.length == 0
    ) {
      if (flatDisconnect) return;

      postMessage('onReadCardResultI9', {
        success: false,
        message: 'Missing data',
      });
      return;
    }
    readingCard = true;

    var sendData = generateSendDataReadCard();
    writeWithoutResponse(sendData);
  }

  function generateSendDataReadCard() {
    const timeOut = 60;
    const countryCode = '0840';
    const currencyCode = '0840';

    const now = new Date();

    const fullYear = now.getFullYear();
    const year = fullYear % 100;
    const month = padZero(now.getMonth() + 1);
    const day = padZero(now.getDate());

    const hours = padZero(now.getHours());
    const minutes = padZero(now.getMinutes());
    const seconds = padZero(now.getSeconds());

    const formattedDateTime = `${fullYear}${month}${day}${hours}${minutes}${seconds}`;
    const formattedDate = `${year}${month}${day}`;
    const formattedTime = `${hours}${minutes}${seconds}`;

    var tradeData = '';
    tradeData = tradeData.concat('1F01').concat('01').concat('71');
    tradeData = tradeData.concat('1F04').concat('06').concat('010000000200');
    tradeData = tradeData.concat('1F02').concat('04').concat('10000000');
    tradeData = tradeData.concat('1F03').concat('07').concat(formattedDateTime);
    tradeData = tradeData.concat('1F07').concat('03').concat('313233');

    var amount = 100;
    var amountStr = amount.toString();
    var amountLenStr = padZeroHexString(amountStr.length.toString(16));
    var amountHex = stringToHex(amountStr);
    tradeData = tradeData.concat('1F08').concat(amountLenStr).concat(amountHex);

    var emvInfo = '';
    emvInfo = emvInfo
      .concat('9C')
      .concat('01')
      .concat('00')
      .concat('9F1A')
      .concat('02')
      .concat(countryCode)
      .concat('5F2A')
      .concat('02')
      .concat(currencyCode)
      .concat('9a03')
      .concat(formattedDate)
      .concat('9f2103')
      .concat(formattedTime);

    var emvInfoLenStr = padZeroHexString((emvInfo.length / 2).toString(16));

    tradeData = tradeData.concat('1F09').concat(emvInfoLenStr).concat(emvInfo);
    var tradeDataBytes = hexToBin(tradeData);

    var sendCmd = [];
    var commandReadCard = hexToBin('0002A0');
    arrayCopy(commandReadCard, 0, sendCmd, 0, commandReadCard.length);
    sendCmd.push(timeOut);
    sendCmd.push(Math.floor(tradeDataBytes.length / 256));
    sendCmd.push(tradeDataBytes.length % 256);
    arrayCopy(
      tradeDataBytes,
      0,
      sendCmd,
      commandReadCard.length + 3,
      tradeDataBytes.length
    );

    var sendData = [];
    sendData.push(77);
    sendData.push(Math.floor(sendCmd.length / 256));
    sendData.push(sendCmd.length % 256);
    arrayCopy(sendCmd, 0, sendData, 3, sendCmd.length);
    sendData.push(calculateCrc(sendData, 0, sendData.length));
    return sendData;
  }

  function postMessage(command, data) {
    console.log("CS_LOG postMessage: ", command, JSON.stringify(data));
    window.backWorker.postMessage(
      window.workerId,
      JSON.stringify({
        cmd: 'observer',
        data: {
          state: command,
          data,
        },
      })
    );

    window.backWorker.command(
      window.workerId,
      JSON.stringify({
        type: 'ble',
        command,
        data,
      })
    );
  }

  function writeWithoutResponse(message) {
    var writeWithoutResponseRes = window.backWorker.ble.writeWithoutResponse(
      JSON.stringify({
        deviceId: currentDeviceId,
        service: currentService,
        characteristic: currentWriteCharacteristic,
        message,
      })
    );
    return writeWithoutResponseRes;
  }

  class objBLE {
    start() {
      var startResult = window.backWorker.ble.start(JSON.stringify({}));
      postMessage('onStartI9', {
        success: startResult === 'true',
      });
    }

    scan() {
      var scanResult = window.backWorker.ble.scan(JSON.stringify({}));
    }

    onDiscover(device) {
      postMessage('onDiscover', device);
    }

    connect(deviceId) {
      currentDeviceId = '';
      currentService = '';
      currentNotifyCharacteristic = '';
      currentWriteCharacteristic = '';
      receiveData = [];
      receiveDataLength = 0;
      readingCard = false;
      flatDisconnect = false;
      
      window.backWorker.ble.connect(
        JSON.stringify({
          deviceId,
        })
      );
    }

    onConnect(res) {
      if (res.success) {
        var data = res.data;
        currentDeviceId = data.deviceId;
        currentService = data.service;
        currentWriteCharacteristic = data.writeCharacteristic;
        currentNotifyCharacteristic = data.notifyCharacteristic;
        setTimeout(() => {
          var startNotificationRes = window.backWorker.ble.startNotification(
            JSON.stringify({
              deviceId: currentDeviceId,
              service: currentService,
              characteristic: currentNotifyCharacteristic,
            })
          );
          if (startNotificationRes != 'true') {
            postMessage('onConnectI9', {
              success: false,
              message: 'Fail to start notification',
            });
          } else {
            flatDisconnect = false;
            setTimeout(() => {
              postMessage('onConnectI9', res);
            }, 1000);
          }
        }, 1000);
      } else {
        flatDisconnect = false;
        postMessage('onConnectI9', res);
      }
    }

    onDisconnect() {
      currentDeviceId = '';
      postMessage('onDisConnect', {});
    }

    disconnect(deviceId) {
      var disconnectResult = window.backWorker.ble.disconnect(
        JSON.stringify({
          deviceId,
        })
      );
      flatDisconnect = true;
      postMessage('onDisconnect', {
        success: disconnectResult === 'true',
      });
    }

    onDidUpdateValueForCharacteristic(data) {
      onDidUpdateValueForCharacteristic(data);
    }

    readCard() {
      handleReadCard();
    }
  }

  window.objBLE2 = new objBLE();
})();
