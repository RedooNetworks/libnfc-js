#ifndef NFC_POLL__H
#define NFC_POLL__H

#include <nan.h>
#include <nfc/nfc.h>
#include <string>

#define MAX_MODULATION_SIZE 10

class NFCPoll : public Nan::AsyncWorker {
    public:
        NFCPoll(Nan::Callback *cb, nfc_device *device, nfc_modulation* modulations_data, const size_t& modulations_size, const uint8_t& uiPollNr, const uint8_t& uiPeriod);

        void Execute();
        void HandleOKCallback();
    private:
        nfc_device *_pnd;
        nfc_modulation _modulations_data[MAX_MODULATION_SIZE];
        size_t _modulations_size;
        uint8_t _uiPollNr;
        uint8_t _uiPeriod;
        bool _has_error;
        std::string _error;
        nfc_target _nt;
};

#endif
