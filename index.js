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
        this._onClosedCallback = undefined;
        this._isClosing = false;
        this._isClosed = true;
        this._isPolling = false;
    }

    open() {
        if (!this._isClosed) {
            throw new Error("Trying to open an already opened NFC reader!");
        }
        const result = this._nfc.open();
        this._isClosing = false;
        this._isClosed = false;
        return result;
    }

    close() {
        console.log('Closing raw reader');
        this._isClosing = true;
        this._isClosed = false;

        if (!this._isPolling) {
            console.log('Not polling! Closing immediately');
            this._innerClose();
        } else {
            console.log('Polling... Wait it is done!');
        }
    }

    _innerClose() {
        this._nfc.close();

        this._isClosing = false;
        this._isClosed = true;

        this._onClosedCallback && this._onClosedCallback();
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

    onClosed(onClosedCallback) {
        if (!isFunction(onClosedCallback)) {
            throw new Error("The onClosed's argument must be a function!");
        }
        this._onClosedCallback = onClosedCallback;
    }

    poll(modulations, polling) {
        if (!modulations || !modulations.length) {
            throw new Error("Modulations array must be provided");
        }

        this._isPolling = true;

        return Promise.fromCallback(cb => this._nfc.poll(cb, modulations, polling))
            .then(card => {
                console.log('Finised polling successfully!');
                if (this._isClosed || this._isClosing) {
                    this._innerClose();
                } else {
                    this._onCardCallback && this._onCardCallback(card);
                }
            })
            .catch(e => {
                console.log('Finised polling with error!');
                if (this._isClosed || this._isClosing) {
                    console.log('Raw reader was already closed!');
                    this._innerClose();
                } else if (e.message == "NFC_ECHIP" || e.message == "Unknown error") { // If Timeout, just poll again
                    return this.poll();
                } else {
                    throw e; // Otherwise throw error further, as any other method do.
                }
            })
            .finally(() => {
                this._isPolling = false;
            });
    }
}

module.exports = {
    NFC: binding.NFC,
    NFCReader,
    NFC_BAUD,
    NFC_MODULATION_TYPE
};
