'use strict'
const binding = require('bindings')('nfc-binding');
const Promise = require('bluebird');

function isFunction(functionToCheck) {
    return functionToCheck && typeof functionToCheck === "function";
}

const NFC_BAUD = Object.freeze({
    NBR_UNDEFINED: 0,
    NBR_106: 1,
    NBR_212: 2,
    NBR_424: 3,
    NBR_847: 4
});

const NFC_MODULATION_TYPE = Object.freeze({
    NMT_ISO14443A: 1,
    NMT_JEWEL: 2,
    NMT_ISO14443B: 3,
    NMT_ISO14443BI: 4,
    NMT_ISO14443B2SR: 5,
    NMT_ISO14443B2CT: 6,
    NMT_FELICA: 7,
    NMT_DEP: 8
});

class NFCReader {

    constructor() {
        this._nfc = new binding.NFCReaderRaw();
        this._onCardCallback = undefined;
        this._isClosed = true;
    }

    open() {
        return this._nfc.open();
        this._isClosed = false;
    }

    close() {
        return this._nfc.close();
        this._isClosed = true;
    }

    transceive(data, timeout) {
        return Promise.fromCallback(cb => this._nfc.transceive(data, cb, timeout));
    }

    release() {
        return Promise.fromCallback(cb => this._nfc.release(cb));
    }

    onCard(onCardCallback) {
        if (!isFunction(onCardCallback)) {
            throw new Error("The onCard's argument must be a function!");
        }
        this._onCardCallback = onCardCallback;
    }

    poll(modulations, polling) {
        if (!modulations || !modulations.length) {
            throw new Error("Modulations array must be provided");
        }

        return Promise.fromCallback(cb => this._nfc.poll(cb, modulations, polling))
            .then(card => {
                !this._isClosed && this._onCardCallback && this._onCardCallback(card);
            })
            .catch(e => {
                if (this._isClosed) {
                    console.log("Polling failed because reader was closed!");
                    return;
                }

                if (e.message == "NFC_ECHIP" || e.message == "Unknown error") { // If Timeout, just poll again
                    return this.poll();
                } else {
                    throw e; // Otherwise throw error further, as any other method do.
                }
            });
    }
}

module.exports = {
    NFC: binding.NFC,
    NFCReader,
    NFC_BAUD,
    NFC_MODULATION_TYPE
};
