```
python
python -m esptool --chip esp32 erase_flash
python -m esptool --chip esp32 write_flash -z 0x1000 .\firmware\ESP32_GENERIC-20240602-v1.23.0.bin
```
