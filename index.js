'use strict'
const binding = require('bindings')('nfc-binding');
const Promise = require('bluebird');

function isFunction(functionToCheck) {
    return functionToCheck && typeof functionToCheck === "function";
}

class NFCReader {

    constructor() {
        this._nfc = new binding.NFCReaderRaw();
        this._onCardCallback = undefined;
    }

    open() {
        return this._nfc.open();
    }

    close() {
        return this._nfc.close();
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

    poll(polling) {
        return Promise.fromCallback(cb => this._nfc.poll(cb, polling))
            .then(card => {
                this._onCardCallback && this._onCardCallback(card);
            })
            .catch(e => {
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
    NFCReader
};
