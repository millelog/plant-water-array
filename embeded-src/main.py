import network  # type: ignore
import ubinascii  # type: ignore
import urequests  # type: ignore
import machine  # type: ignore
import time
import random
import config


def connect_wifi():
    sta_if = network.WLAN(network.STA_IF)
    if not sta_if.isconnected():
        print('Connecting to WiFi...')
        sta_if.active(True)
        sta_if.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
        for _ in range(20):  # Try for 10 seconds
            if sta_if.isconnected():
                break
            time.sleep(0.5)
    if sta_if.isconnected():
        print('WiFi connected')
        print('Network config:', sta_if.ifconfig())
    else:
        print('WiFi connection failed')

def ping_server():
    try:
        print(f"Attempting to ping server at {config.SERVER_URL}/ping")
        response = urequests.get(config.SERVER_URL + "/ping", timeout=10)
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
        print(f"Error type: {type(e).__name__}")
        return False

def register_with_server():
    data = {
        "name": config.DEVICE_NAME
    }
    try:
        response = urequests.post(config.SERVER_URL + "/devices/register_device", json=data)
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
    # In a real scenario, this function would interact with actual hardware
    num_sensors = random.randint(1, 3)  # Simulate 1 to 3 sensors
    sensors = [f"Sensor_{i+1}" for i in range(num_sensors)]
    print(f"Recognized {num_sensors} sensors: {', '.join(sensors)}")
    return sensors

def register_sensor(device_id, sensor_name):
    data = {
        "device_id": device_id,
        "name": sensor_name
    }
    try:
        response = urequests.post(config.SERVER_URL + "/sensors/", json=data)
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
    moisture = random.uniform(0, 100)  # Generate random moisture value between 0 and 100
    data = {
        "device_id": device_id,
        "sensor_id": sensor_id,
        "moisture": moisture
    }
    try:
        response = urequests.post(config.SERVER_URL + "/readings/", json=data)
        print(f"Moisture reading sent for sensor {sensor_id}. Server response:", response.text)
        response.close()
    except Exception as e:
        print(f"Error sending moisture reading for sensor {sensor_id}:", str(e))

def main():
    connect_wifi()
    if network.WLAN(network.STA_IF).isconnected():
        print("WiFi connected. Waiting 5 seconds before pinging server...")
        time.sleep(5)  # Wait for 5 seconds
        if ping_server():
            device_id = register_with_server()
            if device_id:
                sensors = recognize_sensors()
                registered_sensors = []
                for sensor in sensors:
                    sensor_id = register_sensor(device_id, sensor)
                    if sensor_id:
                        registered_sensors.append(sensor_id)
                
                last_reading_time = 0
                while True:
                    current_time = time.time()
                    if current_time - last_reading_time >= config.READING_INTERVAL:
                        for sensor_id in registered_sensors:
                            send_moisture_reading(device_id, sensor_id)
                        last_reading_time = current_time
                    
                    # Add a small delay to prevent tight looping
                    time.sleep(1)
            else:
                print("Failed to register device. Exiting.")
        else:
            print("Server is not reachable. Exiting.")
    else:
        print("WiFi connection failed. Exiting.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Program terminated by user")
    finally:
        # Perform any cleanup if necessary
        print("Exiting program")