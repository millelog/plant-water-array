#!/usr/bin/env python3
"""Erase and flash MicroPython firmware to a connected ESP32, then upload source files."""

import glob
import os
import platform
import subprocess
import sys

FIRMWARE_PATH = os.path.join("firmware", "ESP32_GENERIC-20240602-v1.23.0.bin")
SOURCE_DIR = "embeded-src"
SOURCE_FILES = ["main.py", "captive_portal.py", "config.py"]


def find_serial_port():
    system = platform.system()
    if system == "Windows":
        import serial.tools.list_ports

        ports = list(serial.tools.list_ports.comports())
        cp210x_ports = [p for p in ports if "CP210" in (p.description or "")]
        if cp210x_ports:
            return cp210x_ports[0].device
        silicon_labs = [p for p in ports if "Silicon Labs" in (p.manufacturer or "")]
        if silicon_labs:
            return silicon_labs[0].device
        if ports:
            print(f"Available ports: {', '.join(p.device + ' (' + (p.description or 'unknown') + ')' for p in ports)}")
            return ports[0].device
    else:
        candidates = glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*")
        if candidates:
            return sorted(candidates)[0]

    return None


def run(cmd, **kwargs):
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        print(f"Command failed with exit code {result.returncode}")
        sys.exit(1)


def main():
    port = find_serial_port()
    if not port:
        print("ERROR: No serial port found. Is the ESP32 plugged in?")
        sys.exit(1)
    print(f"Found ESP32 on {port}")

    if not os.path.isfile(FIRMWARE_PATH):
        print(f"ERROR: Firmware file not found at {FIRMWARE_PATH}")
        print("Run this script from the repository root.")
        sys.exit(1)

    # Erase flash
    print("\n[1/3] Erasing flash...")
    run([sys.executable, "-m", "esptool", "--chip", "esp32", "--port", port, "erase_flash"])

    # Write firmware
    print("\n[2/3] Flashing MicroPython firmware...")
    run([sys.executable, "-m", "esptool", "--chip", "esp32", "--port", port,
         "write_flash", "-z", "0x1000", FIRMWARE_PATH])

    # Upload source files
    print("\n[3/3] Uploading source files...")
    for filename in SOURCE_FILES:
        src = os.path.join(SOURCE_DIR, filename)
        if not os.path.isfile(src):
            print(f"  Skipping {filename} (not found at {src})")
            continue
        run([sys.executable, "-m", "mpremote", "connect", port, "cp", src, f":{filename}"])

    print("\nDone! Resetting device...")
    run([sys.executable, "-m", "mpremote", "connect", port, "reset"])
    print("ESP32 flashed and ready.")


if __name__ == "__main__":
    main()
