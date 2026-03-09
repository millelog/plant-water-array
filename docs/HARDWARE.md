# Hardware

## Platform

ESP-WROOM-32 DevKit running MicroPython.

## Pin Reference

| Component | Pin(s) | Notes |
|-----------|--------|-------|
| Moisture sensors (ADC1) | GPIO 32, 33, 34, 35, 36, 39 | Up to 6 sensors per device. Default: `[34]` in config. |
| OLED display SCL | GPIO 22 | SSD1306 128x64 I2C (optional) |
| OLED display SDA | GPIO 21 | |
| BOOT button | GPIO 0 | Hold 5s for factory reset |

**Do not use ADC2 pins** (GPIO 0, 2, 4, 12-15, 25-27) — they do not work when WiFi is active.

## Moisture Sensors

3-pin capacitive analog sensors (Elecbee/icomcu or compatible):

| Pin | Connection |
|-----|------------|
| S (signal) | Any ADC1 GPIO (see table above) |
| + (VCC) | 3V3 |
| - (GND) | GND |

ADC is configured with 11dB attenuation for full 0-3.6V range. Readings are averaged over 10 samples.

### Default Calibration

| Condition | Raw ADC Value |
|-----------|---------------|
| Dry (air) | 0 |
| Wet (water) | 1500 |

Per-sensor calibration can be set from the frontend via the Calibration Wizard.

## OLED Display (Optional)

SSD1306 128x64 I2C (GME12864 compatible). Will not fail if not wired.

| Pin | Connection |
|-----|------------|
| GND | GND |
| VCC | 3V3 |
| SCL | GPIO 22 |
| SDA | GPIO 21 |

Requires the `ssd1306` MicroPython module (`import mip; mip.install("ssd1306")`).

Display layout (128x64 @ 8x8 font = 16 chars x 8 lines):
- Line 0: device name + alert count
- Line 1: separator
- Lines 2-7: sensor rows (name + moisture %), paginated every 5s when >6 sensors

## BOOT Button (Factory Reset)

Hold the BOOT button (GPIO 0) for 5 seconds on startup to erase saved config and re-enter captive portal provisioning mode.

## Enclosure

- **ESP32 Case:** [ESP32 Case on Thingiverse](https://www.thingiverse.com/thing:5100184)
