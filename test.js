'use strict'

const {NFC, NFCReader} = require('./index')

// Core API:
let nfc = new NFC();
console.log(nfc.listDevices())
nfc.close();

// Reader API:
let nfcReader = new NFCReader();
nfcReader.open(); // or nfcReader.open(conntring); to open the connstring's device

nfcReader.poll(); // polls for the next card
nfcReader.on('card', async card => {
    console.log(card);

    // DATA COMMUNICATION PROTOCOL
    try {

        let data = Buffer.from('00a4040006112233445511', 'hex');
        console.log("SELECT: ", data);
        let result = await nfcReader.transceive(data, 2000);
        console.log("Received: ", result);

    } catch(e) {
        console.error("Problem in transmitting data...", e);
    }

    // WAIT UNTIL CARD IS REMOVED
    try {
        await nfcReader.release();
        console.log('card released');
    } catch(e) {
        console.error("Problem releasing card.", e);
    }

    // INFINITE LOOP
    try {
        await nfcReader.poll(); // polls for the next card
    } catch(e) {
        console.error("Problem polling... That sucks... We are dead..", e);
    }
});

