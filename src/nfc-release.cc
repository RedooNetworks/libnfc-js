#include "nfc-release.h"
#include <unistd.h>

using v8::Function;
using v8::Local;
using v8::Number;
using v8::Value;
using v8::Object;
using Nan::AsyncQueueWorker;
using Nan::AsyncWorker;
using Nan::Callback;
using Nan::HandleScope;
using Nan::New;
using Nan::Null;
using Nan::To;
using Nan::Error;

using namespace std;

NFCRelease::NFCRelease(Callback *cb, nfc_device *device)
:AsyncWorker(cb), _pnd(device) {

}

#define LOOP_TRIES 10
#define LOOP_SLEEP 100*1000

void NFCRelease::Execute() {
    int i = 0;
    while (nfc_initiator_target_is_present(_pnd, NULL) == 0) {
        if (i++ >= LOOP_TRIES) {
            this->SetErrorMessage("TIMEOUT");
            break;
        }
        usleep(LOOP_SLEEP);
    }
}

void NFCRelease::HandleOKCallback() {
    HandleScope scope;

    Local<Value> argv[] = {
        Null()
    };

    callback->Call(1, argv);
}

void NFCRelease::HandleErrorCallback() {
    HandleScope scope;

    Local<Value> argv[] = {
        New(this->ErrorMessage()).ToLocalChecked()
    };

    callback->Call(1, argv);
}
