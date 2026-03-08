import network  # type: ignore
import ubinascii  # type: ignore
import urequests  # type: ignore
import uhashlib  # type: ignore
import machine  # type: ignore
import time
import random
import os
import config


sta_if = network.WLAN(network.STA_IF)


def get_mac():
    return ubinascii.hexlify(sta_if.config('mac'), ':').decode()


def get_ip():
    if sta_if.isconnected():
        return sta_if.ifconfig()[0]
    return None


def connect_wifi():
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
        print('WiFi connection failed')


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


def recognize_sensors():
    # Simulate sensor recognition
    # In a real scenario, this would read from config.SENSOR_PINS using ADC
    num_sensors = random.randint(1, 3)
    sensors = [f"Sensor_{i+1}" for i in range(num_sensors)]
    print(f"Recognized {num_sensors} sensors: {', '.join(sensors)}")
    return sensors


def register_sensor(device_id, sensor_name):
    data = {
        "device_id": device_id,
        "name": sensor_name
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


def send_moisture_reading(device_id, sensor_id):
    # Simulated reading - swap with real ADC reads when hardware is wired
    moisture = random.uniform(0, 100)
    data = {
        "device_id": device_id,
        "sensor_id": sensor_id,
        "moisture": moisture
    }
    try:
        response = http_request("POST", config.SERVER_URL + "/readings", json=data)
        print(f"Moisture reading sent for sensor {sensor_id}. Server response:", response.text)
        response.close()
    except Exception as e:
        print(f"Error sending moisture reading for sensor {sensor_id}:", str(e))


def send_heartbeat(device_id):
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

    sensors = recognize_sensors()
    registered_sensors = []
    for sensor in sensors:
        sensor_id = register_sensor(device_id, sensor)
        if sensor_id:
            registered_sensors.append(sensor_id)

    last_reading_time = 0
    last_ota_check_time = 0

    while True:
        if not ensure_wifi():
            time.sleep(5)
            continue

        current_time = time.time()

        # Send readings at READING_INTERVAL
        if current_time - last_reading_time >= config.READING_INTERVAL:
            for sensor_id in registered_sensors:
                send_moisture_reading(device_id, sensor_id)
            last_reading_time = current_time

        # Heartbeat + OTA check at OTA_CHECK_INTERVAL
        if current_time - last_ota_check_time >= config.OTA_CHECK_INTERVAL:
            send_heartbeat(device_id)
            check_and_apply_ota(device_id)
            last_ota_check_time = current_time

        time.sleep(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Program terminated by user")
    finally:
        print("Exiting program")
