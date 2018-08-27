'use strict'
const EventEmitter = require('events');
const binding = require('bindings')('nfc-binding');
const Promise = require('bluebird');

class NFCReader extends EventEmitter {
    constructor() {
        super();
        this._nfc = new binding.NFCReaderRaw();
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

    poll(polling) {
        return Promise.fromCallback(cb => this._nfc.poll(cb, polling))
            .then(card => this.emit('card', card))
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
