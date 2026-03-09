import network  # type: ignore
import ubinascii  # type: ignore
import urequests  # type: ignore
import uhashlib  # type: ignore
import machine  # type: ignore
import time
import random
import os


sta_if = network.WLAN(network.STA_IF)


def get_mac():
    return ubinascii.hexlify(sta_if.config('mac'), ':').decode()


def get_ip():
    if sta_if.isconnected():
        return sta_if.ifconfig()[0]
    return None


def is_configured():
    try:
        import config
        if not hasattr(config, 'WIFI_SSID') or config.WIFI_SSID in ("", "Your_SSID_Here"):
            return False
        if not hasattr(config, 'SERVER_URL') or config.SERVER_URL in ("", "http://your.server.url:port"):
            return False
        return True
    except ImportError:
        return False


def check_factory_reset():
    pin = machine.Pin(0, machine.Pin.IN, machine.Pin.PULL_UP)
    if pin.value() == 0:
        print("BOOT button pressed, hold for 5 seconds to factory reset...")
        start = time.time()
        while pin.value() == 0:
            if time.time() - start >= 5:
                print("Factory reset triggered! Deleting config.py...")
                try:
                    os.remove("config.py")
                    print("config.py deleted.")
                except OSError:
                    print("config.py not found, already clean.")
                time.sleep(1)
                machine.reset()
            time.sleep(0.1)
        print("BOOT button released before 5 seconds, continuing normal boot.")


def connect_wifi():
    import config
    if not sta_if.isconnected():
        print('Connecting to WiFi...')
        sta_if.active(True)
        sta_if.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
        for _ in range(20):
            if sta_if.isconnected():
                break
            time.sleep(0.5)
    if sta_if.isconnected():
        print('WiFi connected')
        print('Network config:', sta_if.ifconfig())
    else:
        print('WiFi connection failed, falling back to captive portal...')
        import captive_portal
        captive_portal.run_portal()


def ensure_wifi():
    if not sta_if.isconnected():
        print('WiFi disconnected, reconnecting...')
        connect_wifi()
    return sta_if.isconnected()


def http_request(method, url, max_retries=3, **kwargs):
    for attempt in range(max_retries):
        try:
            if method == "GET":
                response = urequests.get(url, **kwargs)
            elif method == "POST":
                response = urequests.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            return response
        except Exception as e:
            print(f"HTTP {method} {url} attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                delay = (2 ** attempt) + random.uniform(0, 1)
                print(f"Retrying in {delay:.1f}s...")
                time.sleep(delay)
            else:
                print(f"All {max_retries} attempts failed for {method} {url}")
                raise


def ping_server():
    import config
    try:
        print(f"Attempting to ping server at {config.SERVER_URL}/ping")
        response = http_request("GET", config.SERVER_URL + "/ping", timeout=10)
        print(f"Received response with status code: {response.status_code}")
        if response.status_code == 200:
            print("Server is reachable")
            response.close()
            return True
        else:
            print(f"Server returned unexpected status code: {response.status_code}")
            response.close()
            return False
    except Exception as e:
        print(f"Error pinging server: {str(e)}")
        return False


def register_with_server():
    import config
    mac = get_mac()
    ip = get_ip()
    data = {
        "name": config.DEVICE_NAME,
        "device_id": mac,
        "firmware_version": config.FIRMWARE_VERSION,
        "ip_address": ip,
        "mac_address": mac
    }
    try:
        response = http_request("POST", config.SERVER_URL + "/devices/register_device", json=data)
        if response.status_code == 200:
            device_info = response.json()
            print("Device registered successfully. Device ID:", device_info.get('device_id'))
            response.close()
            return device_info.get('device_id')
        else:
            print(f"Error registering device. Status code: {response.status_code}")
            response.close()
            return None
    except Exception as e:
        print("Error registering device:", str(e))
        return None


def setup_sensors():
    """Initialize ADC on each pin listed in config.SENSOR_PINS.

    ESP32 ADC1 pins that work with WiFi active: 32, 33, 34, 35, 36, 39
    Max 6 moisture sensors per ESP32.
    """
    import config
    pins = getattr(config, 'SENSOR_PINS', [34])
    sensors = []
    for pin_num in pins:
        try:
            adc = machine.ADC(machine.Pin(pin_num))
            adc.atten(machine.ADC.ATTN_11DB)  # Full 0-3.6V range
            adc.read()  # Test read
            name = f"Moisture_GPIO{pin_num}"
            sensors.append({"name": name, "pin": pin_num, "adc": adc})
            print(f"ADC initialized on GPIO {pin_num}")
        except Exception as e:
            print(f"Failed to init ADC on GPIO {pin_num}: {e}")
    print(f"Initialized {len(sensors)} sensor(s)")
    return sensors


def read_moisture(adc, samples=10):
    """Read moisture % from ADC, averaged over multiple samples.

    Returns (percentage, raw_average).
    Calibration values ADC_DRY / ADC_WET come from config.
    """
    import config
    total = 0
    for _ in range(samples):
        total += adc.read()
        time.sleep_ms(10)
    raw = total // samples

    dry_val = getattr(config, 'ADC_DRY', 3500)
    wet_val = getattr(config, 'ADC_WET', 1500)

    if dry_val == wet_val:
        return 0.0, raw

    pct = ((dry_val - raw) / (dry_val - wet_val)) * 100.0
    pct = max(0.0, min(100.0, pct))
    return round(pct, 1), raw


def register_sensor(device_id, sensor_name, sensor_id):
    import config
    data = {
        "device_id": device_id,
        "name": sensor_name,
        "sensor_id": sensor_id
    }
    try:
        response = http_request("POST", config.SERVER_URL + "/sensors/", json=data)
        if response.status_code == 200:
            sensor_info = response.json()
            print(f"Sensor {sensor_name} registered successfully. Sensor ID:", sensor_info.get('id'))
            response.close()
            return sensor_info.get('id')
        else:
            print(f"Error registering sensor {sensor_name}. Status code: {response.status_code}")
            response.close()
            return None
    except Exception as e:
        print(f"Error registering sensor {sensor_name}:", str(e))
        return None


def send_moisture_reading(device_id, sensor_id, moisture, raw_adc=None):
    import config
    data = {
        "device_id": device_id,
        "sensor_id": sensor_id,
        "moisture": moisture
    }
    if raw_adc is not None:
        data["raw_adc"] = raw_adc
    try:
        response = http_request("POST", config.SERVER_URL + "/readings", json=data)
        print(f"Moisture reading sent for sensor {sensor_id}. Server response:", response.text)
        response.close()
    except Exception as e:
        print(f"Error sending moisture reading for sensor {sensor_id}:", str(e))


def send_heartbeat(device_id):
    import config
    data = {
        "firmware_version": config.FIRMWARE_VERSION,
        "ip_address": get_ip(),
        "mac_address": get_mac()
    }
    try:
        response = http_request("POST", config.SERVER_URL + f"/devices/{device_id}/heartbeat", json=data)
        if response.status_code == 200:
            print("Heartbeat sent successfully")
        response.close()
    except Exception as e:
        print(f"Error sending heartbeat: {e}")


def sha256_file(filepath):
    h = uhashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk:
                break
            h.update(chunk)
    return ubinascii.hexlify(h.digest()).decode()


def file_exists(path):
    try:
        os.stat(path)
        return True
    except OSError:
        return False


def check_and_apply_ota(device_id):
    import config
    try:
        response = http_request("GET", config.SERVER_URL + f"/devices/{device_id}/firmware/check?current_version={config.FIRMWARE_VERSION}")
        if response.status_code != 200:
            response.close()
            return
        check_data = response.json()
        response.close()

        if not check_data.get("update_available"):
            print("Firmware is up to date")
            return

        new_version = check_data["version"]
        print(f"Update available: {new_version}")

        # Get manifest
        response = http_request("GET", config.SERVER_URL + f"/firmware/{new_version}/manifest")
        if response.status_code != 200:
            print("Failed to get manifest")
            response.close()
            return
        manifest_data = response.json()
        response.close()

        files_to_update = []
        for file_info in manifest_data.get("files", []):
            filename = file_info["filename"]
            # Never overwrite config.py via OTA
            if filename == "config.py":
                print(f"Skipping {filename} (protected)")
                continue
            files_to_update.append(file_info)

        if not files_to_update:
            print("No files to update")
            return

        # Download all files to temp location and verify checksums
        downloaded = []
        for file_info in files_to_update:
            filename = file_info["filename"]
            expected_checksum = file_info["checksum"]
            temp_name = filename + ".new"

            print(f"Downloading {filename}...")
            try:
                response = http_request("GET", config.SERVER_URL + f"/firmware/{new_version}/files/{filename}")
                if response.status_code != 200:
                    print(f"Failed to download {filename}")
                    response.close()
                    _cleanup_downloads(downloaded)
                    return
                content = response.content
                response.close()

                with open(temp_name, "wb") as f:
                    f.write(content)

                actual_checksum = sha256_file(temp_name)
                if actual_checksum != expected_checksum:
                    print(f"Checksum mismatch for {filename}: expected {expected_checksum}, got {actual_checksum}")
                    _cleanup_downloads(downloaded + [temp_name])
                    return

                downloaded.append(temp_name)
                print(f"Downloaded and verified {filename}")

            except Exception as e:
                print(f"Error downloading {filename}: {e}")
                _cleanup_downloads(downloaded)
                return

        # All files downloaded and verified - apply update
        print("All files verified. Applying update...")
        backups = []
        try:
            # Backup existing files
            for file_info in files_to_update:
                filename = file_info["filename"]
                if file_exists(filename):
                    backup_name = filename + ".bak"
                    os.rename(filename, backup_name)
                    backups.append((filename, backup_name))

            # Move new files into place
            for file_info in files_to_update:
                filename = file_info["filename"]
                temp_name = filename + ".new"
                os.rename(temp_name, filename)

            print(f"OTA update to {new_version} complete. Rebooting...")
            time.sleep(1)
            machine.reset()

        except Exception as e:
            print(f"Error applying update: {e}")
            # Restore backups
            _restore_backups(backups)
            _cleanup_downloads(downloaded)

    except Exception as e:
        print(f"OTA check failed: {e}")


def _cleanup_downloads(temp_files):
    for temp_name in temp_files:
        try:
            os.remove(temp_name)
        except OSError:
            pass


def _restore_backups(backups):
    print("Restoring backups...")
    for original, backup in backups:
        try:
            if file_exists(original):
                os.remove(original)
            os.rename(backup, original)
            print(f"Restored {original}")
        except OSError as e:
            print(f"Error restoring {original}: {e}")


def main():
    import config
    connect_wifi()
    if not sta_if.isconnected():
        print("WiFi connection failed. Exiting.")
        return

    print("WiFi connected. Waiting 5 seconds before pinging server...")
    time.sleep(5)

    if not ping_server():
        print("Server is not reachable. Exiting.")
        return

    device_id = register_with_server()
    if not device_id:
        print("Failed to register device. Exiting.")
        return

    # Initialize real ADC sensors from config.SENSOR_PINS
    sensors = setup_sensors()
    if not sensors:
        print("No sensors initialized. Check SENSOR_PINS in config.")
        return

    # Register each sensor with the backend
    registered_sensors = []
    for s in sensors:
        sensor_id = register_sensor(device_id, s["name"], s["pin"])
        if sensor_id:
            registered_sensors.append({
                "sensor_id": s["pin"],
                "adc": s["adc"],
                "pin": s["pin"],
                "name": s["name"]
            })

    if not registered_sensors:
        print("No sensors registered with server. Exiting.")
        return

    # Initialize OLED display (optional — won't fail if not wired)
    display = None
    try:
        from display import Display
        display = Display()
        if display.available:
            print("OLED display initialized")
            display.show_status("Connected", f"{len(registered_sensors)} sensor(s)")
        else:
            display = None
    except Exception as e:
        print(f"Display not available: {e}")

    last_reading_time = 0
    last_ota_check_time = 0

    while True:
        if not ensure_wifi():
            time.sleep(5)
            continue

        current_time = time.time()

        # Send readings at READING_INTERVAL
        if current_time - last_reading_time >= config.READING_INTERVAL:
            readings = []
            for s in registered_sensors:
                moisture, raw = read_moisture(s["adc"])
                print(f"GPIO{s['pin']}: {moisture}% (raw ADC: {raw})")
                send_moisture_reading(device_id, s["sensor_id"], moisture, raw_adc=raw)
                readings.append((s["name"], moisture))

            if display:
                display.show_readings(readings)

            last_reading_time = current_time

        # Heartbeat + OTA check at OTA_CHECK_INTERVAL
        if current_time - last_ota_check_time >= config.OTA_CHECK_INTERVAL:
            send_heartbeat(device_id)
            check_and_apply_ota(device_id)
            last_ota_check_time = current_time

        time.sleep(1)


if __name__ == "__main__":
    try:
        check_factory_reset()
        if is_configured():
            main()
        else:
            print("Device not configured. Starting captive portal...")
            import captive_portal
            captive_portal.run_portal()
    except KeyboardInterrupt:
        print("Program terminated by user")
    finally:
        print("Exiting program")
