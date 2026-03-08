# Firmware

## Prerequisites

```
pip install esptool mpremote pyserial
```

## Flash the ESP32

From the repository root, with the ESP32 connected via USB:

```
python flash_esp.py
```

This will automatically:
1. Detect the connected ESP32 serial port (Windows COM ports or Linux /dev/ttyUSB*)
2. Erase the flash
3. Write the MicroPython firmware
4. Upload `main.py`, `captive_portal.py`, and `config.py` from `embeded-src/`

Make sure you have a `embeded-src/config.py` before running (copy from `config.py.example` and fill in your values).

## Manual commands

If you need to run the steps individually:

```
python -m esptool --chip esp32 --port <PORT> erase_flash
python -m esptool --chip esp32 --port <PORT> write_flash -z 0x1000 firmware/ESP32_GENERIC-20240602-v1.23.0.bin
python -m mpremote connect <PORT> cp embeded-src/main.py :main.py
python -m mpremote connect <PORT> cp embeded-src/captive_portal.py :captive_portal.py
python -m mpremote connect <PORT> cp embeded-src/config.py :config.py
python -m mpremote connect <PORT> reset
```
