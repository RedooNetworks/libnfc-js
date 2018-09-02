#include "nfc-reader.h"
#include "nfc-poll.h"
#include "nfc-release.h"
#include "nfc-transceive.h"

using Nan::HandleScope;
using Nan::Callback;
using Nan::To;
using v8::Local;
using v8::Array;
using v8::String;
using v8::Function;
using v8::Number;

NAN_METHOD(NFCReader::New) {
    HandleScope scope;
    assert(info.IsConstructCall());
    NFCReader* device = new NFCReader();
    device->Wrap(info.This());
    device->_opened = false;
    
    nfc_init(&device->_context);
    if (device->_context == NULL) {
        return Nan::ThrowError("nfc_init() failed");
    }
    
    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(NFCReader::Close) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());
    
    if (device->_opened) {
        nfc_close(device->_pnd);
    }
    
    if (device->_pnd != NULL) {
        nfc_exit(device->_context);
    }
    
    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(NFCReader::Open) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());
    
    if (info.Length() > 0) {
        nfc_connstring devicePath;
        String::Utf8Value utfPath(info[0]->ToString());
        snprintf(devicePath, sizeof devicePath, "%s", *utfPath);
        device->_pnd = nfc_open(device->_context, devicePath);
    }
    else {
        device->_pnd = nfc_open(device->_context, NULL);
    }
    
    if (device->_pnd == NULL) {
        return Nan::ThrowError("nfc_open() failed");
    }
    
    if (nfc_initiator_init(device->_pnd) < 0) {
        return Nan::ThrowError("nfc_initiator_init()");
    }
    
    device->_opened = true;
    info.GetReturnValue().Set(info.This());
}

#define MIN(X, Y) (((X) < (Y)) ? (X) : (Y))
void UnwrapArray(v8::Local<v8::Array> jsArr, nfc_modulation* modulations_data, size_t* modulations_size) {
    v8::Local<v8::String> nmtProp = Nan::New("nmt").ToLocalChecked();
    v8::Local<v8::String> nbrProp = Nan::New("nbr").ToLocalChecked();

    size_t arrayItemNb = MIN(jsArr->Length(), MAX_MODULATION_SIZE);

    *modulations_size = 0;

    for (size_t i = 0; i < arrayItemNb; i++) {
        v8::Local<v8::Value> jsonObj = jsArr->Get(i);

        if (!jsonObj->IsObject()) {
            continue;
        }

        v8::MaybeLocal<v8::Value> nmtValue = Nan::Get(jsonObj->ToObject(), nmtProp);
        v8::MaybeLocal<v8::Value> nbrValue = Nan::Get(jsonObj->ToObject(), nbrProp);

        if (nmtValue.IsEmpty() || nbrValue.IsEmpty()) {
            continue;
        }

        nfc_modulation modulation = { .nmt = NMT_ISO14443A, .nbr = NBR_106 };
        modulation.nmt = (nfc_modulation_type)nmtValue.ToLocalChecked()->IntegerValue();
        modulation.nbr = (nfc_baud_rate)nbrValue.ToLocalChecked()->IntegerValue();

        modulations_data[(*modulations_size)++] = modulation;
    }
}

NAN_METHOD(NFCReader::Poll) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());

    Callback *callback = new Callback(info[0].As<Function>());

    if (!info[1]->IsArray()) {
        return Nan::ThrowError("Second parameter must be an array!");
    }

    v8::Local<v8::Array> jsModulationsArray = info[1].As<Array>();

    nfc_modulation modulations_data[MAX_MODULATION_SIZE];
    size_t modulations_size;
    UnwrapArray(jsModulationsArray, modulations_data, &modulations_size);

    uint8_t uiPollNr = info.Length() >= 2 && info[2]->IsNumber() ? info[2]->Uint32Value() : 20;
    uint8_t uiPeriod = info.Length() >= 3 && info[3]->IsNumber() ? info[3]->Uint32Value() : 2;

    AsyncQueueWorker(new NFCPoll(callback, device->_pnd, modulations_data, modulations_size, uiPollNr, uiPeriod));
}

NAN_METHOD(NFCReader::Release) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());
    
    Callback *callback = new Callback(info[0].As<Function>());
    AsyncQueueWorker(new NFCRelease(callback, device->_pnd));
}

NAN_METHOD(NFCReader::Transceive) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());
    
    uint8_t* data = (uint8_t *)node::Buffer::Data(info[0]);
    size_t size = node::Buffer::Length(info[0]);
    
    Callback *callback = new Callback(info[1].As<Function>());
    
    int timeout = info.Length() == 3 && info[2]->IsNumber() ? info[2]->Uint32Value() : 1000;
    
    AsyncQueueWorker(new NFCTransceive(callback, device->_pnd, data, size, timeout));
}

