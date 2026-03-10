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
import time

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

    def show_status(self, line1, line2=""):
        """Show a status message (e.g. 'Connected', '3 sensor(s)')."""
        if not self.available:
            return
        self.oled.fill(0)
        self.oled.text(line1, 0, 0)
        if line2:
            self.oled.text(line2, 0, 16)
        self.oled.show()

    def show_readings_enhanced(self, readings_data, device_name="Device"):
        """Enhanced display with server names, alerts, moisture bars, and pagination.

        readings_data = [{"name": str, "moisture": float, "alert": bool, "pin": int}, ...]
        Layout (128x64, yellow zone y=0-15, blue zone y=16-63):
          y=0 (yellow): header (device name + alert count)
          y=10: separator
          y=16+: sensor rows (blue zone, up to 5 per page) with moisture bars
        """
        if not self.available:
            return

        # Sort: alerts first, then by name
        sorted_data = sorted(readings_data, key=lambda r: (not r.get("alert", False), r["name"]))
        alert_count = sum(1 for r in sorted_data if r.get("alert", False))

        # Pagination: 5 sensor rows per page (blue zone = 48px, 9px/row)
        rows_per_page = 5
        total_pages = max(1, (len(sorted_data) + rows_per_page - 1) // rows_per_page)
        page = (time.ticks_ms() // 5000) % total_pages if total_pages > 1 else 0
        page_items = sorted_data[page * rows_per_page:(page + 1) * rows_per_page]

        self.oled.fill(0)

        # Header (yellow zone y=0)
        header_name = device_name[:10]
        if alert_count > 0:
            header_right = "!{}".format(alert_count)
        elif total_pages > 1:
            header_right = "{}/{}".format(page + 1, total_pages)
        else:
            header_right = ""
        self.oled.text(header_name, 0, 0)
        if header_right:
            right_x = self.width - len(header_right) * 8
            self.oled.text(header_right, right_x, 0)

        # Separator at y=10 (still yellow zone)
        self.oled.hline(0, 10, self.width, 1)

        # Sensor rows (blue zone, starting at y=16)
        y = 16
        for r in page_items:
            moisture = r["moisture"]
            prefix = "!" if r.get("alert", False) else " "
            name = r["name"][:7]
            moisture_str = "{}%".format(int(moisture))

            # Text: prefix + name (up to 8 chars = 64px)
            self.oled.text(prefix + name, 0, y)

            # Moisture bar (x=68, 22px wide, 6px tall)
            bar_x = 68
            bar_w = 22
            bar_h = 6
            bar_y = y + 1
            self.oled.rect(bar_x, bar_y, bar_w, bar_h, 1)
            fill_max = bar_w - 2
            fill_w = max(0, int(fill_max * moisture / 100))
            if fill_w > 0:
                self.oled.fill_rect(bar_x + 1, bar_y + 1, fill_w, bar_h - 2, 1)

            # Moisture percentage right-aligned
            mx = self.width - len(moisture_str) * 8
            self.oled.text(moisture_str, mx, y)

            y += 9

        self.oled.show()

