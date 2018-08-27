{
    "targets": [{
        "target_name": "nfc-binding",
        "sources": ["src/nfc.cc", "src/nfc-reader.cc", "src/nfc-poll.cc",
            "src/nfc-release.cc", "src/nfc-transceive.cc", "src/tools.cc",
            "src/addon.cc"],
        "libraries": ["/usr/local/lib/libnfc.dylib"],
        "include_dirs": [
            "<!(node -e \"require('nan')\")",
            "/usr/local/include/",
            "/usr/include/"
        ]
    }]
}
