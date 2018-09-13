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
        this._onClosedResolve = undefined;
        this._onClosedReject = undefined;

        this._isClosing = false;
        this._isClosed = true;
        this._isPolling = false;
    }

    open(connstring) {
        if (!this._isClosed) {
            throw new Error("Trying to open an already opened NFC reader!");
        }
        const result = this._nfc.open(connstring);
        this._isClosing = false;
        this._isClosed = false;
        return result;
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this._isClosed) {
                resolve();
                return;
            }

            this._onClosedResolve = resolve;
            this._onClosedReject = reject;

            this._isClosing = true;
            this._isClosed = false;

            if (!this._isPolling) {
                this._deferredClose();
            }
        });
    }

    _deferredClose() {
        this._isClosing = false;
        this._isClosed = true;

        try {
            this._nfc.close();

            this._onClosedResolve();
        } catch (e) {
            this._onClosedReject(e);
        }
    }

    transceive(data, timeout) {
        return Promise.fromCallback(cb => this._nfc.transceive(data, cb, timeout))
            .catch(e => {
                throw new Error("Error while transceiving: " + e.message);
            });
    }

    release() {
        return Promise.fromCallback(cb => this._nfc.release(cb))
            .catch(e => {
                throw new Error("Error while releasing: " + e.message);
            });
    }

    onCard(onCardCallback) {
        if (!isFunction(onCardCallback)) {
            throw new Error("The onCard's argument must be a function!");
        }
        this._onCardCallback = onCardCallback;
    }

    poll(modulations, uiPollNr, uiPeriod) {
        if (!modulations || !modulations.length) {
            throw new Error("Modulations array must be provided");
        }

        this._isPolling = true;

        return Promise.fromCallback(cb => this._nfc.poll(cb, modulations, uiPollNr, uiPeriod))
            .then(card => {
                if (this._isClosed || this._isClosing) {
                    this._deferredClose();
                } else {
                    this._onCardCallback && this._onCardCallback(card);
                }
            })
            .catch(e => {
                if (this._isClosed || this._isClosing) {
                    this._deferredClose();
                } else if (e.message == "NFC_ECHIP" || e.message == "Unknown error") { // If Timeout, just poll again
                    return this.poll(modulations, uiPollNr, uiPeriod);
                } else {
                    throw new Error("Error while polling: " + e.message);
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
