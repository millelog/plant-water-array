"""OLED display driver for SSD1306 128x64 I2C (e.g. GME12864).

Wiring to ESP32:
    GND → GND
    VCC → 3V3
    SCL → GPIO 22
    SDA → GPIO 21

Requires the ssd1306 MicroPython module. Install over WiFi via REPL:
    import mip
    mip.install("ssd1306")

If the module is not installed or the display is not wired,
all methods are safe no-ops.
"""

from machine import Pin, SoftI2C  # type: ignore

OLED_SCL = 22
OLED_SDA = 21
OLED_WIDTH = 128
OLED_HEIGHT = 64


class Display:
    def __init__(self, scl=OLED_SCL, sda=OLED_SDA, width=OLED_WIDTH, height=OLED_HEIGHT):
        self.available = False
        try:
            import ssd1306
            i2c = SoftI2C(scl=Pin(scl), sda=Pin(sda))
            self.oled = ssd1306.SSD1306_I2C(width, height, i2c)
            self.width = width
            self.height = height
            self.available = True
            self.oled.fill(0)
            self.oled.text("Plant Monitor", 0, 0)
            self.oled.text("Starting...", 0, 16)
            self.oled.show()
        except ImportError:
            print("ssd1306 module not installed (optional). "
                  "Install: import mip; mip.install('ssd1306')")
        except Exception as e:
            print(f"OLED init failed (display not wired?): {e}")

    def show_readings(self, readings):
        """Show sensor readings. readings = [(name, moisture%), ...]"""
        if not self.available:
            return
        self.oled.fill(0)
        y = 0
        for name, moisture in readings[:4]:  # 4 lines max on 64px display
            label = name.replace("Moisture_", "")
            self.oled.text(f"{label}: {moisture}%", 0, y)
            y += 16
        self.oled.show()

    def show_status(self, line1, line2=""):
        """Show a status message (e.g. 'Connected', '3 sensor(s)')."""
        if not self.available:
            return
        self.oled.fill(0)
        self.oled.text(line1, 0, 0)
        if line2:
            self.oled.text(line2, 0, 16)
        self.oled.show()

    def clear(self):
        if not self.available:
            return
        self.oled.fill(0)
        self.oled.show()
