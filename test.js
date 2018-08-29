'use strict'

const {NFC, NFCReader, NFC_MODULATION_TYPE, NFC_BAUD} = require('./index')

// Core API:
let nfc = new NFC();
console.log(nfc.listDevices())
nfc.close();

// Reader API:
let nfcReader = new NFCReader();
nfcReader.open(); // or nfcReader.open(conntring); to open the connstring's device

const modulations = [
    { nmt: NFC_MODULATION_TYPE.NMT_ISO14443A, nbr: NFC_BAUD.NBR_106 }
];

nfcReader.poll(modulations, 8, 3); // polls for the next card
nfcReader.onCard(async card => {
    console.log(card);

    // DATA COMMUNICATION PROTOCOL
    try {

        let data = Buffer.from('00a4040006112233445511', 'hex');
        console.log("SELECT: ", data);
        let result = await nfcReader.transceive(data, 2000);
        console.log("Received: ", result);

        data = Buffer.from('004000000400000cfa', 'hex');
        console.log("SET ID: ", data);
        result = await nfcReader.transceive(data, 2000);
        console.log("Received: ", result);

        data = Buffer.from('0050000004', 'hex');
        console.log("GET ID: ", data);
        result = await nfcReader.transceive(data, 2000);
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
    nfcReader.poll(modulations, 8, 3); // polls for the next card
});

