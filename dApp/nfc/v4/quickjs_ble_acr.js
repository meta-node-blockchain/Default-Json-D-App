(function () {
  if (typeof window.objBLE === 'object') {
    return;
  }

  const stringToBytes = (str) => {
    return str.match(/.{1,2}/g).map((byte) => {
      return parseInt(byte, 16);
    });
  };

  function bytesToString(byteArray) {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
  }

  const stringToHex = (str) => {
    var hex = '';
    for (var i = 0; i < str.length; i++) {
      var hexChar = str.charCodeAt(i).toString(16);
      hex += ('00' + hexChar).slice(-2); // Ensure each hex value is 2 digits
    }
    return hex;
  };

  const compareArrays = (array1, array2) => {
    // Check if arrays are of equal length
    if (array1.length !== array2.length) {
      return false;
    }

    // Iterate through the arrays and compare elements
    return array1.every((element, index) => {
      return element === array2[index];
    });
  };

  const randomBytes = () => {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //#DEBUG
    var randomNumbers = [];

    // Generate 16 random numbers
    for (var i = 0; i < 16; i++) {
      // Generate a random number between 0 and 1, then scale it to your desired range
      var randomNumber = Math.round(Math.random() * 100); // Change 100 to whatever maximum number you want
      // Add the random number to the array
      randomNumbers.push(randomNumber);
    }
    return randomNumbers;
  };

  function pad(s, z) {
    s = '' + s;
    return s.length < z ? pad('0' + s, z) : s;
  }

  function checkHex(n) {
    return /^[0-9A-Fa-f]{1,64}$/.test(n);
  }

  function checkBin(n) {
    return /^[01]{1,64}$/.test(n);
  }

  function Hex2Bin(n) {
    if (!checkHex(n)) return 0;
    return parseInt(n, 16).toString(2);
  }

  function Bin2Hex(n) {
    if (!checkBin(n)) return 0;
    return parseInt(n, 2).toString(16);
  }

  function Hex2Dec(n) {
    if (!checkHex(n)) return 0;
    return parseInt(n, 16).toString(10);
  }

  function parse(emv_data, callback) {
    var emv_objects = [];
    while (emv_data.length > 0) {
      var tag_bin = Hex2Bin(emv_data.substring(0, 2));
      tag_bin = pad(tag_bin, 8);
      var tag_limit = 2;
      var tag_class = tag_bin.substring(0, tag_limit);
      var tag_constructed = tag_bin.substring(2, 3);
      var tag_number = tag_bin.substring(3, 8);
      var tag_octet = '';

      if (tag_number == '11111') {
        do {
          // at least one more byte
          tag_limit += 2;
          tag_octet = Hex2Bin(emv_data.substring(tag_limit - 2, tag_limit));
          tag_octet = pad(tag_octet, 8);
        } while (tag_octet.substring(0, 1) == '1');
        tag_bin = Hex2Bin(emv_data.substring(0, tag_limit));
        tag_bin = pad(tag_bin, 8 * (tag_limit / 2));
        tag_number = tag_bin.substring(3, 8 * (tag_limit / 2));
      }

      var tag = Bin2Hex(tag_class + tag_constructed + tag_number).toUpperCase();
      var lenHex = emv_data.substring(tag.length, tag.length + 2);

      var lenBin = pad(Hex2Bin(lenHex), 8);
      var byteToBeRead = 0;
      var len = Hex2Dec(lenHex) * 2;
      var offset = tag.length + 2 + len;

      if (lenHex.substring(0, 1) == '8') {
        byteToBeRead = Hex2Dec(lenHex.substring(1, 2));
        lenHex = emv_data.substring(
          tag.length,
          tag.length + 2 + byteToBeRead * 2
        );
        // 	lenHex = emv_data.substring(tag.length, tag.length + 4);
        len = Hex2Dec(lenHex.substring(2)) * 2;
        offset = tag.length + 2 + byteToBeRead * 2 + len;
      }

      var value = emv_data.substring(tag.length + 2 + byteToBeRead * 2, offset);

      if (tag_constructed == '1') {
        parse(value, function (innerTags) {
          value = innerTags;
        });
      }

      emv_objects.push({ tag: tag, length: lenHex, value: value });
      emv_data = emv_data.substring(offset);
    }

    callback(emv_objects);
  }

  const getCardInfoVisa = (responses) => {
    var res;
    var end = false;
    for (var i = 0; i < responses.length; i++) {
      const r = responses[i];
      if ((r.tag === '77' || r.tag === '70') && r.value && r.value.length > 0) {
        for (var j = 0; j < r.value.length; j++) {
          const e = r.value[j];
          if (e.tag === '57' && e.value) {
            const parts = e.value.split('d');
            if (parts.length > 1) {
              res = {
                cardNumber: parts[0],
                expireDate: parts[1].substring(0, 4),
              };
              end = true;
            }
          }

          if (end) {
            break;
          }
        }

        if (end) {
          break;
        }
      }
    }
    return res;
  };

  const getCardInfoMasterCard = (responses) => {
    var res;
    var end = false;
    for (var i = 0; i < responses.length; i++) {
      const r = responses[i];
      if (r.tag === '70' && r.value && r.value.length > 0) {
        for (var j = 0; j < r.value.length; j++) {
          const e = r.value[j];
          if (e.tag === '5A' && e.value) {
            if (!res) {
              res = {
                cardNumber: e.value,
              };
            } else {
              res.cardNumber = e.value;
            }

            if (res.cardNumber && res.expireDate) {
              end = true;
            }
          }

          if (e.tag === '5F24' && e.value) {
            if (!res) {
              res = {
                expireDate: e.value,
              };
            } else {
              res.expireDate = e.value;
            }

            if (res.cardNumber && res.expireDate) {
              end = true;
            }
          }

          if (end) {
            break;
          }
        }

        if (end) {
          break;
        }
      }
    }
    return res;
  };

  const masterKey = 'ACR1255U-J1 Auth';
  const masterKeyBytes = stringToBytes(stringToHex(masterKey));
  const commandAuthenticate1 = 'E000004500';
  const commandAuthenticate2 = 'E000004600';
  const commandStartPolling = 'E000004001';
  const commandStopPolling = 'E000004000';

  const commandPPSE = '00A404000E325041592E5359532E444446303100';
  const CardAids = {
    VISA: 'A0000000031010',
    MASTERCARD: 'A0000000041010',
    AMEX: 'A00000002501',
    JCB: 'A0000000651010',
    DISCOVER: 'A0000001523010',
    UNIONPAY: 'A000000333010101',
  };

  const commandVisa = [
    '00A404000E325041592E5359532E444446303100',
    '00A4040007A00000000310100E',
    '80A800002383212800000000000000000000000000000002500000000000097820052600E8DA935200',
  ];

  const commandMasterCard = [
    '00A4040007A00000000410100E',
    '80A8000002830000',
    '00B2011400',
  ];

  const commandAmex = [
    '00A4040008A00000002501080100',
    '00B2010C00',
  ];

  const commandJCB = [
    '00A4040007A0000000651010',
    '80A8000002830000',
    '00B2011400',
  ];

  const commandDiscover = [
    '00A4040007A0000001523010',
    '80A8000002830000',
    '00B2011C00',
    '00B2021C00',
  ];

  const commandUnionPay = [
    '00A4040007A0000001523010',
    '80A8000002830000',
    '00B2011C00',
    '00B2021C00',
  ];

  var cardType = '';
  var commandReadCardArray = [];
  var commandReadCardIndex = -1;

  const responseStartPolling = [
    131, 0, 5, 0, 2, 2, 38, 225, 0, 0, 64, 1, 255, 255, 255, 255,
  ];
  const responseTapIn = [
    80, 0, 0, 0, 0, 3, 83, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  ];
  const responseTapOut = [
    80, 0, 0, 0, 0, 2, 82, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  ];

  var currentDeviceId = '';
  var currentService = '';
  var currentNotifyCharacteristic = '';
  var currentWriteCharacteristic = '';
  var readingCard = false;

  var currentEscapeCommand = '';
  var currentApduCommand = '';
  var messageId = 0;
  var sessionKey = [];
  var random = randomBytes();
  var password = [];
  var responseData = [];
  var isAuth = false;
  var readCardTimeout = null;

  var statusConnect = 0; // 0: No Connect; 1: Connecting; 2: Connected

  const convertCommandToMessage = (messageType, command) => {
    var messageLength = 7;
    var commandLength = 0;
    if (command != null) {
      commandLength = command.length;
      messageLength = commandLength + messageLength;
    }

    var message = new Uint8Array(messageLength);
    message[0] = messageType;
    message[1] = commandLength >> 8;
    message[2] = commandLength & 0xff;
    message[3] = 0;
    message[4] = messageId;
    message[5] = 0;
    messageId = messageId + 1;

    var checkXorResult =
      0 ^ checkXor(message, 0, 6) ^ checkXor(command, 0, commandLength);
    message[6] = checkXorResult;

    if (commandLength > 0) {
      for (var index = 0; index < commandLength; index++) {
        message[index + 7] = command[index];
      }
    }

    return message;
  };

  const checkXor = (data, start, length) => {
    var result = 0;
    if (data != null) {
      for (var index = start; index < start + length; ++index) {
        result ^= data[index];
      }
    }
    return result;
  };

  const prepareMessageToSend = (message) => {
    if (message && message.length > 0) {
      var messageLength = message.length;
      var encryptedMessage;

      if (!isAuth) {
        encryptedMessage = message;
      } else {
        try {
          var newMessage;
          if (message.length % 16 !== 0) {
            messageLength += 16 - (message.length % 16);
            newMessage = [];
            for (var i = 0; i < messageLength; i++) {
              if (i < message.length) {
                newMessage.push(message[i]);
              } else {
                newMessage.push(255);
              }
            }
          } else {
            newMessage = message;
          }

          encryptedMessage = encryptAES(newMessage, password);
        } catch (error) {
          console.error(error);
          return null;
        }
      }

      var messageToSend = [5, messageLength >> 8, messageLength & 0xff];
      for (var index = 0; index < messageLength; index++) {
        messageToSend.push(encryptedMessage[index]);
      }
      var checkXorResult = checkXor(
        messageToSend,
        1,
        encryptedMessage.length + 2
      );
      messageToSend.push(checkXorResult);
      messageToSend.push(10);
      return messageToSend;
    } else {
      return null;
    }
  };

  var part = 0;
  var remain = 0;
  const checkResponseDataComplete = (value) => {
    var result = false;
    if (part == 0) {
      if (value.length > 2) {
        var messageLength = ((value[1] & 255) << 8) | (value[2] & 255);
        var length = messageLength + 3 + 2;
        remain = length % 20;
        if (remain == 0) {
          remain = 20;
        }

        part = Math.floor(length / 20);
        if (remain != 20) {
          part = part + 1;
        }

        responseData = [];
        for (var item of value) {
          responseData.push(item);
        }

        if (part == 1) {
          part = 0;
          result = true;
        } else if (part > 1) {
          part = part - 1;
        }
      }
    } else if (part == 1) {
      part = 0;
      if (value.length == remain) {
        for (var item of value) {
          responseData.push(item);
        }
        result = true;
      }
    } else if (part > 1) {
      if (value.length == 20) {
        part = part - 1;
        for (var item of value) {
          responseData.push(item);
        }
      } else {
        part = 0;
      }
    }

    return result;
  };

  const handleResponseData = (deviceId, service, characteristic, value) => {
    var complete = checkResponseDataComplete(value);
    if (complete) {
      const messageLength = responseData[2];
      console.log("CS_LOG handleResponseData: ", responseData, " - ", messageLength);
      var message = responseData.slice(3);
      if (messageLength == 28) {
        message = message.slice(7, messageLength);
        if (message[0] == 225) {
          if (message[3] == 69) {
            const data = message.slice(5);

            sessionKey = decryptAES(data, masterKeyBytes);
            for (var i = 0; i < 8; i++) {
              password.push(sessionKey[i]);
            }
            for (var i = 8; i < 16; i++) {
              password.push(random[i]);
            }

            const authenticate2Data = [];
            for (var item of random) {
              authenticate2Data.push(item);
            }
            for (var item of sessionKey) {
              authenticate2Data.push(item);
            }

            const decryptedauthenticate2Data = decryptAES(
              authenticate2Data,
              masterKeyBytes
            );

            const authenticate2Command = stringToBytes(commandAuthenticate2);
            for (var item of decryptedauthenticate2Data) {
              authenticate2Command.push(item);
            }

            transmitEscapeCommand(bytesToString(authenticate2Command));
          } else if (message[3] == 70) {
            const data = message.slice(5);

            const decrypted = decryptAES(data, masterKeyBytes);
            if (compareArrays(decrypted, random)) {
              isAuth = true;
              postMessage('onConnectV4', { success: true });
              console.log("CS_LOG onConnectV4 success");
            } else {
              console.log("CS_LOG onConnectV4 fail 3");
              postMessage('onConnectV4', {
                success: true,
                message: 'Fail to authenticate',
              });
            }
          }
        }
      } else {
        var response = responseData.slice(3, messageLength + 3);

        const decryptedResponse = decryptAES(response, password);

        if (messageLength == 16) {
          if (compareArrays(decryptedResponse, responseStartPolling)) {
            console.log('MYLOG Polling success');
          } else if (compareArrays(decryptedResponse, responseTapIn)) {
            console.log('MYLOG onTapIn: ', new Date());
            cardType = '';
            commandReadCardArray = [];
            commandReadCardIndex = -1;
            transmitApduCommand(commandPPSE);
          } else if (compareArrays(decryptedResponse, responseTapOut)) {
            console.log('MYLOG onTapOut');
          } else {
            if (commandReadCardIndex < commandReadCardArray.length - 1) {
              commandReadCardIndex++;

              transmitApduCommand(commandReadCardArray[commandReadCardIndex]);
            }
          }
        } else {
          const apduResponseLength =
            (decryptedResponse[2] & 255) + ((decryptedResponse[1] & 255) << 8);

          const apduResponse = [];
          for (var i = 7; i < 7 + apduResponseLength; i++) {
            apduResponse.push(decryptedResponse[i]);
          }
          const apduResponseHex = bytesToString(apduResponse);

          if (currentApduCommand == commandPPSE && cardType == '') {
            const aid = extractAIDFromPPSE(apduResponse);

            handleAID(aid);
          } else if (
            currentApduCommand == commandReadCardArray[commandReadCardIndex]
          ) {
            if (commandReadCardIndex < commandReadCardArray.length - 1) {
              commandReadCardIndex++;
              transmitApduCommand(commandReadCardArray[commandReadCardIndex]);
            } else {
              console.log("CS_LOG start parse", new Date());
              parse(apduResponseHex, (data) => {
                if (data) {
                  const cardInfoVisa = getCardInfoVisa(data);

                  const cardInfoMaster = getCardInfoMasterCard(data);

                  if (statusConnect == 0) return;
                  if (!cardInfoVisa && !cardInfoMaster) {
                    console.log("CS_LOG parse error");
                    postMessage('onReadCardResultV4', {
                      success: false,
                      message: 'Parse error',
                    });
                  } else {
                    if (cardInfoVisa) {
                      console.log("CS_LOG cardInfoVisa: ", JSON.stringify(cardInfoVisa), new Date());
                      postMessage('onReadCardResultV4', {
                        success: true,
                        cardInfo: cardInfoVisa,
                        cardType,
                      });
                    } else {
                      console.log("CS_LOG cardInfoMaster: ", JSON.stringify(cardInfoMaster), new Date());
                      postMessage('onReadCardResultV4', {
                        success: true,
                        cardInfo: cardInfoMaster,
                        cardType,
                      });
                    }
                  }
                }
              });
              transmitEscapeCommand(commandStopPolling);
              readingCard = false;
              cardType = '';
              commandReadCardArray = [];
              commandReadCardIndex = -1;
            }
          }
        }
      }

      responseData = [];
    }
  };

  function extractAIDFromPPSE(response) {
    const aidTag = '4f';
    
    const hexString = Array.from(response)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    // Tìm vị trí của `aidTag`
    const tagIndex = hexString.indexOf(aidTag);
    if (tagIndex === -1) return null;

    const lengthIndex = tagIndex + 2;
    const length = parseInt(
      hexString.substring(lengthIndex, lengthIndex + 2),
      16
    );

    const valueIndex = lengthIndex + 2;
    return hexString.substring(valueIndex, valueIndex + length * 2);
  }

  function handleAID(aid) {
    commandReadCardIndex = 0;
    if (aid.toLowerCase().startsWith(CardAids.VISA.toLowerCase())) {
      cardType = 'VISA';
      commandReadCardArray = commandVisa;
    } else if (
      aid.toLowerCase().startsWith(CardAids.MASTERCARD.toLowerCase())
    ) {
      cardType = 'MasterCard';
      commandReadCardArray = commandMasterCard;
    } else if (aid.toLowerCase().startsWith(CardAids.AMEX.toLowerCase())) {
      cardType = 'Amex';
      commandReadCardArray = commandAmex;
    } else if (aid.toLowerCase().startsWith(CardAids.JCB.toLowerCase())) {
      cardType = 'JCB';
      commandReadCardArray = commandJCB;
    } else if (aid.toLowerCase().startsWith(CardAids.DISCOVER.toLowerCase())) {
      cardType = 'Discover';
      commandReadCardArray = commandDiscover;
    } else if (aid.toLowerCase().startsWith(CardAids.UNIONPAY.toLowerCase())) {
      cardType = 'UnionPay';
      commandReadCardArray = commandUnionPay;
    } else {
      cardType = 'Undefined';
      postMessage('onReadCardResultV4', {
        success: false,
        message: 'Card type undefine',
      });
      return;
    }
    transmitApduCommand(commandReadCardArray[commandReadCardIndex]);
  }

  const postMessage = (command, data) => {
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
  };

  function transmitEscapeCommand(commandHex) {
    currentEscapeCommand = commandHex;
    const command = stringToBytes(commandHex);
    const message = convertCommandToMessage(107, command);
    const messageToSend = prepareMessageToSend(message);

    writeWithoutResponse(messageToSend);
  }

  function transmitApduCommand(commandHex) {
    currentApduCommand = commandHex;
    const command = stringToBytes(commandHex);
    const message = convertCommandToMessage(111, command);
    const messageToSend = prepareMessageToSend(message);

    writeWithoutResponse(messageToSend);
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

  const encryptAES = (data, password) => {
    var encryptAESRes = window.backWorker.ble.encryptAES(
      JSON.stringify({
        data: bytesToString(data),
        password: bytesToString(password),
      })
    );
    return stringToBytes(encryptAESRes);
  };

  const decryptAES = (data, password) => {
    var decryptAESRes = window.backWorker.ble.decryptAES(
      JSON.stringify({
        data: bytesToString(data),
        password: bytesToString(password),
      })
    );

    if (!decryptAESRes) {
      return false;
    }
    return stringToBytes(decryptAESRes);
  };

  class objBLE {
    start() {
      console.log("CS_LOG start called");
      var startResult = window.backWorker.ble.start(JSON.stringify({}));
      console.log("CS_LOG onStartV4: ", startResult);
      postMessage('onStartV4', {
        success: startResult === 'true',
      });
    }

    scan() {
      console.log("CS_LOG scan called: ", new Date());
      window.backWorker.ble.scan(JSON.stringify({}));
    }

    onDiscover(device) {
      console.log("CS_LOG onDiscover called: ", new Date());
      postMessage('onDiscoverV4', device);
    }

    connect(deviceId) {
      // return;
      if (statusConnect == 1 || statusConnect == 2) {
        return;
      }

      cardType = '';
      commandReadCardArray = [];
      commandReadCardIndex = -1;

      currentDeviceId = '';
      currentService = '';
      currentNotifyCharacteristic = '';
      currentWriteCharacteristic = '';
      readingCard = false;

      currentApduCommand = '';
      messageId = 0;
      sessionKey = [];
      random = randomBytes();
      password = [];
      responseData = [];
      isAuth = false;

      statusConnect = 1;
      
      console.log("CS_LOG connect called", new Date());
      window.backWorker.ble.connect(
        JSON.stringify({
          deviceId,
        })
      );
      console.log("CS_LOG connect response: ", new Date());
    }

    onConnect(res) {
      console.log("CS_LOG onConnect called");
      if (res.success) {
        var data = res.data;
        
        currentDeviceId = data.deviceId;
        currentService = data.service;
        currentWriteCharacteristic = data.writeCharacteristic;
        currentNotifyCharacteristic = data.notifyCharacteristic;
        statusConnect = 2;

        setTimeout(() => {
          console.log("CS_LOG startNotification called");
          var startNotificationRes = window.backWorker.ble.startNotification(
            JSON.stringify({
              deviceId: currentDeviceId,
              service: currentService,
              characteristic: currentNotifyCharacteristic,
            })
          );
          console.log("CS_LOG startNotificationRes: ", startNotificationRes);
          if (startNotificationRes != 'true') {
            console.log("CS_LOG onConnectV4 fail 1");
            postMessage('onConnectV4', {
              success: false,
              message: 'Fail to start notification',
            });
          } else {
            setTimeout(() => {
              transmitEscapeCommand(commandAuthenticate1);
            }, 1000);
          }
        }, 1000);
      } else {
        console.log("CS_LOG onConnectV4 fail 2");
        statusConnect = 0;
        postMessage('onConnectV4', res);
      }
    }

    onDisconnect() {
      statusConnect = 0;
      postMessage('onDisConnect', {});
    }

    disconnect(deviceId) {
      var disconnectResult = window.backWorker.ble.disconnect(
        JSON.stringify({
          deviceId,
        })
      );
      console.log("CS_LOG disconnect: ", disconnectResult);

      statusConnect = 0;
      postMessage('onDisconnect', {
        success: disconnectResult === 'true',
      });
    }

    onDidUpdateValueForCharacteristic(data) {
      handleResponseData(
        data.deviceId,
        data.service,
        data.characteristic,
        data.value
      );
    }

    readCard() {
      console.log("CS_LOG readCard called");
      if (readingCard) {
        return;
      }
      if (
        currentDeviceId.length == 0 ||
        currentService.length == 0 ||
        currentWriteCharacteristic.length == 0
      ) {
        if (statusConnect === 0) return;
        postMessage('onReadCardResultV4', {
          success: false,
          message: 'Missing data',
        });
        return;
      }
      readingCard = true;
      transmitEscapeCommand(commandStartPolling);
      readCardTimeout = setTimeout(() => {
        transmitEscapeCommand(commandStopPolling);
        readingCard = false;
        readCardTimeout = null;
      }, 10000);
    }

    stopReadCard() {
      if (readCardTimeout) {
        clearTimeout(readCardTimeout);
        readCardTimeout = null;
      }
      transmitEscapeCommand(commandStopPolling);
      readingCard = false;
      cardType = '';
      commandReadCardArray = [];
      commandReadCardIndex = -1;
    }
  }

  window.objBLE = new objBLE();
})();
