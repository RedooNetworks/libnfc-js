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
    
    nfc_exit(device->_context);
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

NAN_METHOD(NFCReader::Poll) {
    HandleScope scope;
    NFCReader* device = ObjectWrap::Unwrap<NFCReader>(info.This());
    
    Callback *callback = new Callback(info[0].As<Function>());
    int polling = info.Length() == 2 && info[1]->IsNumber() ? info[1]->Uint32Value() : 2;
    
    AsyncQueueWorker(new NFCPoll(callback, device->_pnd, polling));
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

