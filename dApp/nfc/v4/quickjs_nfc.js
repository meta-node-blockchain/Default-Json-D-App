; (function () {
  if (typeof window.objNFC === 'object') {
    return
  }

  function pad(s, z) {
    s = '' + s
    return s.length < z ? pad('0' + s, z) : s
  }

  function checkHex(n) {
    return /^[0-9A-Fa-f]{1,64}$/.test(n)
  }

  function checkBin(n) {
    return /^[01]{1,64}$/.test(n)
  }

  function Hex2Bin(n) {
    if (!checkHex(n)) return 0
    return parseInt(n, 16).toString(2)
  }

  function Bin2Hex(n) {
    if (!checkBin(n)) return 0
    return parseInt(n, 2).toString(16)
  }

  function Hex2Dec(n) {
    if (!checkHex(n)) return 0
    return parseInt(n, 16).toString(10)
  }

  function parse(emv_data, callback) {
    var emv_objects = []
    while (emv_data.length > 0) {
      var tag_bin = Hex2Bin(emv_data.substring(0, 2))
      tag_bin = pad(tag_bin, 8)
      //console.log(tag_bin);
      var tag_limit = 2
      var tag_class = tag_bin.substring(0, tag_limit)
      var tag_constructed = tag_bin.substring(2, 3)
      var tag_number = tag_bin.substring(3, 8)
      var tag_octet = ''

      if (tag_number == '11111') {
        do {
          // at least one more byte
          tag_limit += 2
          tag_octet = Hex2Bin(emv_data.substring(tag_limit - 2, tag_limit))
          tag_octet = pad(tag_octet, 8)
        } while (tag_octet.substring(0, 1) == '1')
        //console.log('constructed tag');
        tag_bin = Hex2Bin(emv_data.substring(0, tag_limit))
        tag_bin = pad(tag_bin, 8 * (tag_limit / 2))
        tag_number = tag_bin.substring(3, 8 * (tag_limit / 2))
      }

      var tag = Bin2Hex(tag_class + tag_constructed + tag_number).toUpperCase()
      var lenHex = emv_data.substring(tag.length, tag.length + 2)

      var lenBin = pad(Hex2Bin(lenHex), 8)
      var byteToBeRead = 0
      var len = Hex2Dec(lenHex) * 2
      var offset = tag.length + 2 + len

      if (lenHex.substring(0, 1) == '8') {
        byteToBeRead = Hex2Dec(lenHex.substring(1, 2))
        lenHex = emv_data.substring(
          tag.length,
          tag.length + 2 + byteToBeRead * 2
        )
        console.log(
          'lenHex: ' +
          lenHex +
          ' lenBin: ' +
          lenBin +
          ' ---> len is more than 1 byte'
        )
        // 	lenHex = emv_data.substring(tag.length, tag.length + 4);
        len = Hex2Dec(lenHex.substring(2)) * 2
        offset = tag.length + 2 + byteToBeRead * 2 + len
        console.log(
          'length (decimals): ' +
          len +
          ' offset: ' +
          offset +
          ' - this is for the substring of emv_data'
        )
      }

      var value = emv_data.substring(tag.length + 2 + byteToBeRead * 2, offset)

      if (tag_constructed == '1') {
        parse(value, function (innerTags) {
          value = innerTags
        })
      }

      emv_objects.push({ tag: tag, length: lenHex, value: value })
      emv_data = emv_data.substring(offset)
    }

    callback(emv_objects)
  }

  const getCardInfoVisa = responses => {
    var res
    var end = false
    for (var i = 0; i < responses.length; i++) {
      const r = responses[i]
      if (r.tag === '77' && r.value && r.value.length > 0) {
        for (var j = 0; j < r.value.length; j++) {
          const e = r.value[j]
          if (e.tag === '57' && e.value) {
            const parts = e.value.split('d')
            if (parts.length > 1) {
              res = {
                cardNumber: parts[0],
                expireDate: parts[1].substring(0, 4)
              }
              end = true
            }
          }

          if (end) {
            break
          }
        }

        if (end) {
          break
        }
      }
    }
    return res
  }

  const getCardInfoMasterCard = responses => {
    var res
    var end = false
    for (var i = 0; i < responses.length; i++) {
      const r = responses[i]
      if (r.tag === '70' && r.value && r.value.length > 0) {
        for (var j = 0; j < r.value.length; j++) {
          const e = r.value[j]
          if (e.tag === '5A' && e.value) {
            if (!res) {
              res = {
                cardNumber: e.value
              }
            } else {
              res.cardNumber = e.value
            }

            if (res.cardNumber && res.expireDate) {
              end = true
            }
          }

          if (e.tag === '5F24' && e.value) {
            if (!res) {
              res = {
                expireDate: e.value
              }
            } else {
              res.expireDate = e.value
            }

            if (res.cardNumber && res.expireDate) {
              end = true
            }
          }

          if (end) {
            break
          }
        }

        if (end) {
          break
        }
      }
    }
    return res
  }

  const commandPPSE = "00A404000E325041592E5359532E444446303100";
  const CardAids = {
    VISA: "A0000000031010",
    MASTERCARD: "A0000000041010",
    AMEX: "A00000002501",
    JCB: "A0000000651010",
    DISCOVER: "A0000001523010",
    UNIONPAY: "A000000333010101"
  };

  const commandVisa = [
    "00A404000E325041592E5359532E444446303100",
    "00A4040007A00000000310100E",
    "80A800002383212800000000000000000000000000000002500000000000097820052600E8DA935200"
  ];

  const commandMasterCard = [
    "00A4040007A00000000410100E",
    "80A8000002830000",
    "00B2011400",
  ];

  const commandAmex = [
    "00A4040007A00000002501",
    "80A8000002830000",
    "00B2011400",
    "00B2012400"
  ];

  const commandJCB = [
    "00A4040007A0000000651010",
    "80A8000002830000",
    "00B2011400",
  ];

  const commandDiscover = [
    "00A4040007A0000001523010",
    "80A8000002830000",
    "00B2011C00",
    "00B2021C00"
  ];

  const commandUnionPay = [
    "00A4040007A0000001523010",
    "80A8000002830000",
    "00B2011C00",
    "00B2021C00"
  ];

  var cardType = '';
  var commandReadCardArray = [];
  var commandReadCardIndex = -1;

  const postMessage = (command, data) => {
    window.backWorker.postMessage(
      window.workerId,
      JSON.stringify({
        cmd: 'observer',
        data: {
          state: command,
          data
        }
      })
    )

    window.backWorker.command(
      window.workerId,
      JSON.stringify({
        type: 'nfc',
        command,
        data
      })
    )
  }

  var currentApduCommand = ''
  function sendAPDUCommand(commandHex) {
    currentApduCommand = commandHex
    var res = window.backWorker.nfc.sendAPDUCommand(
      JSON.stringify({
        commandHex
      })
    )
    return res
  }

  function extractAIDFromPPSE(response) {
    const aidTag = "4f";
    const aidLength = 7;

    // HÃ m chuyá»ƒn `Uint8Array` sang chuá»—i hex
    // const hexString = Array.from(response)
    //   .map(byte => byte.toString(16).padStart(2, '0'))
    //   .join('');

    // TÃ¬m vá»‹ trÃ­ cá»§a `aidTag`
    const tagIndex = response.indexOf(aidTag);
    if (tagIndex === -1) return null;

    const lengthIndex = tagIndex + 2;
    const length = parseInt(response.substring(lengthIndex, lengthIndex + 2), 16);

    if (length !== aidLength) {
      console.log("Chiá»u dÃ i AID khÃ´ng khá»›p vá»›i mong Ä‘á»£i.");
      return null;
    }

    const valueIndex = lengthIndex + 2;
    return response.substring(valueIndex, valueIndex + (aidLength * 2));
  }

  function handleAID(aid) {
    commandReadCardIndex = 0;
    if (aid.toLowerCase().startsWith(CardAids.VISA.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» Visa.");
      cardType = 'VISA';
      commandReadCardArray = commandVisa;
    } else if (aid.toLowerCase().startsWith(CardAids.MASTERCARD.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» MasterCard.");
      cardType = 'MasterCard';
      commandReadCardArray = commandMasterCard;
    } else if (aid.toLowerCase().startsWith(CardAids.AMEX.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» American Express.");
      cardType = 'Amex';
      commandReadCardArray = commandAmex;
    } else if (aid.toLowerCase().startsWith(CardAids.JCB.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» JCB.");
      cardType = 'JCB';
      commandReadCardArray = commandJCB;
    } else if (aid.toLowerCase().startsWith(CardAids.DISCOVER.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» Discover.");
      cardType = 'Discover';
      commandReadCardArray = commandDiscover;
    } else if (aid.toLowerCase().startsWith(CardAids.UNIONPAY.toLowerCase())) {
      console.log("ÄÃ£ phÃ¡t hiá»‡n tháº» UnionPay.");
      cardType = 'UnionPay';
      commandReadCardArray = commandUnionPay;
    } else {
      console.log("Loáº¡i tháº» khÃ´ng xÃ¡c Ä‘á»‹nh.");
      cardType = 'Undefined';
      postMessage("onReadCardResultV4", {
        success: false,
        message: "Card type undefine",
      });
      return;
    }
    sendAPDUCommand(commandReadCardArray[commandReadCardIndex]);
  }

  class objNFC {
    hello() {
      console.log('hello from backWorker NFC')
    }

    start() {
      console.log('backWorker NFC start')
      window.backWorker.nfc.start(JSON.stringify({}))
    }

    stop() {
      console.log('backWorker NFC stop')
      window.backWorker.nfc.stop(JSON.stringify({}))
    }

    onTagDiscovered() {
      var res1 = sendAPDUCommand(commandPPSE)
      console.log('backWorker NFC onTagDiscovered res1: ', res1)
    }

    onNFCResponse(responseHex) {
      console.log('backWorker NFC onNFCResponse: ' + responseHex)
      console.log('backWorker NFC onNFCResponse: ' + cardType)
      if (currentApduCommand == commandPPSE && cardType == '') {
        const aid = extractAIDFromPPSE(responseHex);
        console.log("MYLOG aid: ", aid);
        handleAID(aid);
      } else if (currentApduCommand == commandReadCardArray[commandReadCardIndex]) {
        if (commandReadCardIndex < commandReadCardArray.length - 1) {
          commandReadCardIndex++;
          sendAPDUCommand(commandReadCardArray[commandReadCardIndex]);
        } else {
          parse(responseHex, data => {
            console.log('backWorker NFC parse: ', JSON.stringify(data))
            if (data) {
              const cardInfoVisa = getCardInfoVisa(data);
              console.log(
                "MYLOG cardInfoVisa: " + JSON.stringify(cardInfoVisa)
              );

              const cardInfoMaster = getCardInfoMasterCard(data);
              console.log(
                "MYLOG cardInfoMaster: " + JSON.stringify(cardInfoMaster)
              );

              if (!cardInfoVisa && !cardInfoMaster) {
                postMessage("onReadCardResult", {
                  success: false,
                  message: "Parse error",
                });
              } else {
                if (cardInfoVisa) {
                  postMessage("onReadCardResult", {
                    success: true,
                    cardInfo: cardInfoVisa,
                    cardType,
                  });
                } else {
                  postMessage("onReadCardResult", {
                    success: true,
                    cardInfo: cardInfoMaster,
                    cardType,
                  });
                }
              }
            }
          });
          cardType = '';
          commandReadCardArray = [];
          commandReadCardIndex = -1;
        }
      }
    }
  }

  window.objNFC = new objNFC()
})()