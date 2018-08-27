#ifndef NFC_POLL__H
#define NFC_POLL__H

#include <nan.h>
#include <nfc/nfc.h>
#include <string>

class NFCPoll : public Nan::AsyncWorker {
    public:
        NFCPoll(Nan::Callback *cb, nfc_device *device, const int& polling);

        void Execute();
        void HandleOKCallback();
    private:
        nfc_device *_pnd;
        int _polling;
        bool _has_error;
        std::string _error;
        nfc_target _nt;
};

#endif
