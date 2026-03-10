import network  # type: ignore
import ubinascii  # type: ignore
import urequests  # type: ignore
import machine  # type: ignore
import time
import random
import os


sta_if = network.WLAN(network.STA_IF)

# Server-synced config cache (updated via heartbeat responses)
server_config = {
    "reading_interval": None,
    "sensors": {},  # sensor_id -> {name, calibration_dry, calibration_wet, threshold_min, threshold_max}
}

HEARTBEAT_INTERVAL = 300  # seconds


def get_mac():
    return ubinascii.hexlify(sta_if.config('mac'), ':').decode()


def get_ip():
    if sta_if.isconnected():
        return sta_if.ifconfig()[0]
    return None


def get_firmware_version():
    try:
        from _version import GIT_COMMIT
        return GIT_COMMIT
    except ImportError:
        return "unknown"


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


def get_device_headers():
    """Return auth headers for backend API calls."""
    import config
    key = getattr(config, 'DEVICE_API_KEY', None)
    if key:
        return {"X-Device-Key": key}
    return {}


def http_request(method, url, max_retries=3, **kwargs):
    # Inject device auth headers if not already provided
    headers = kwargs.pop("headers", {}) or {}
    auth_headers = get_device_headers()
    for k, v in auth_headers.items():
        if k not in headers:
            headers[k] = v
    if headers:
        kwargs["headers"] = headers

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
        "firmware_version": get_firmware_version(),
        "ip_address": ip,
        "mac_address": mac,
        "deploy_token": getattr(config, 'DEPLOY_TOKEN', None),
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

    dry_val = getattr(config, 'ADC_DRY', 0)
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
        "firmware_version": get_firmware_version(),
        "ip_address": get_ip(),
        "mac_address": get_mac()
    }
    try:
        response = http_request("POST", config.SERVER_URL + f"/devices/{device_id}/heartbeat", json=data)
        if response.status_code == 200:
            print("Heartbeat sent successfully")
            try:
                heartbeat_data = response.json()
                response.close()
                return heartbeat_data
            except Exception:
                response.close()
                return None
        response.close()
    except Exception as e:
        print(f"Error sending heartbeat: {e}")
    return None


def apply_server_config(heartbeat_data, registered_sensors):
    global server_config
    if not heartbeat_data:
        return
    if "reading_interval" in heartbeat_data:
        server_config["reading_interval"] = heartbeat_data["reading_interval"]
        print(f"Config sync: reading_interval={heartbeat_data['reading_interval']}s")
    for sc in heartbeat_data.get("sensors", []):
        sid = sc.get("sensor_id")
        if sid is not None:
            server_config["sensors"][sid] = {
                "name": sc.get("name"),
                "calibration_dry": sc.get("calibration_dry"),
                "calibration_wet": sc.get("calibration_wet"),
                "threshold_min": sc.get("threshold_min"),
                "threshold_max": sc.get("threshold_max"),
            }
            # Update sensor name in registered_sensors list
            for s in registered_sensors:
                if s["sensor_id"] == sid and sc.get("name"):
                    s["server_name"] = sc["name"]


def get_reading_interval():
    import config
    if server_config["reading_interval"] is not None:
        return server_config["reading_interval"]
    return getattr(config, 'READING_INTERVAL', 10)


def main():
    import config
    connect_wifi()
    if not sta_if.isconnected():
        print("WiFi connection failed. Exiting.")
        return

    # Start update server for push deploys
    update_srv = None
    try:
        from update_server import UpdateServer
        deploy_token = getattr(config, 'DEPLOY_TOKEN', None)
        deploy_port = getattr(config, 'DEPLOY_PORT', 8266)
        if deploy_token and deploy_token != "changeme":
            update_srv = UpdateServer(deploy_token, deploy_port)
            update_srv.start()
        else:
            print("WARNING: DEPLOY_TOKEN not set or is default, update server disabled")
    except Exception as e:
        print(f"Could not start update server: {e}")

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

    # Initial config sync via heartbeat before main loop
    heartbeat_data = send_heartbeat(device_id)
    apply_server_config(heartbeat_data, registered_sensors)

    last_reading_time = 0
    last_heartbeat_time = time.time()

    while True:
        # Check for incoming deploy requests (non-blocking)
        if update_srv:
            update_srv.check()

        if not ensure_wifi():
            time.sleep(5)
            continue

        current_time = time.time()

        # Send readings at dynamic interval
        if current_time - last_reading_time >= get_reading_interval():
            readings_data = []
            for s in registered_sensors:
                moisture, raw = read_moisture(s["adc"])
                print(f"GPIO{s['pin']}: {moisture}% (raw ADC: {raw})")
                send_moisture_reading(device_id, s["sensor_id"], moisture, raw_adc=raw)

                # Compute display moisture using server calibration if available
                sc = server_config["sensors"].get(s["sensor_id"])
                display_moisture = moisture
                if sc and raw is not None and sc.get("calibration_dry") is not None and sc.get("calibration_wet") is not None:
                    dry = sc["calibration_dry"]
                    wet = sc["calibration_wet"]
                    if dry != wet:
                        display_moisture = max(0.0, min(100.0, round(((dry - raw) / (dry - wet)) * 100.0, 1)))

                # Determine alert state using synced thresholds
                alert = False
                if sc:
                    if sc.get("threshold_min") is not None and display_moisture < sc["threshold_min"]:
                        alert = True
                    if sc.get("threshold_max") is not None and display_moisture > sc["threshold_max"]:
                        alert = True

                display_name = s.get("server_name") or s["name"]
                readings_data.append({
                    "name": display_name,
                    "moisture": display_moisture,
                    "alert": alert,
                    "pin": s["pin"],
                })

            if display:
                display.show_readings_enhanced(readings_data, config.DEVICE_NAME)

            last_reading_time = current_time

        # Heartbeat at dedicated interval
        if current_time - last_heartbeat_time >= HEARTBEAT_INTERVAL:
            hb_data = send_heartbeat(device_id)
            apply_server_config(hb_data, registered_sensors)
            last_heartbeat_time = current_time

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
