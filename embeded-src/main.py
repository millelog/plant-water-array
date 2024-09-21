import network
import ubinascii
import urequests
import machine
import time
import random

# Constants
WIFI_SSID = "Pretty Fly for a Wifi"
WIFI_PASSWORD = "All the girlies say"
SERVER_URL = "http://192.168.70.101:8000"  # Replace with your actual server URL
DEVICE_NAME = "TestDevice"
READING_INTERVAL = 10  # 5 minutes in seconds

def connect_wifi():
    sta_if = network.WLAN(network.STA_IF)
    if not sta_if.isconnected():
        print('Connecting to WiFi...')
        sta_if.active(True)
        sta_if.connect(WIFI_SSID, WIFI_PASSWORD)
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
        print(f"Attempting to ping server at {SERVER_URL}/ping")
        response = urequests.get(SERVER_URL + "/ping", timeout=10)
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
        "name": DEVICE_NAME
    }
    try:
        response = urequests.post(SERVER_URL + "/devices/register_device", json=data)
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

def send_moisture_reading(device_id):
    moisture = random.uniform(0, 100)  # Generate random moisture value between 0 and 100
    data = {
        "device_id": device_id,
        "sensor_id": 1,  # Assuming a single sensor per device
        "moisture": moisture
    }
    try:
        response = urequests.post(SERVER_URL + "/readings/", json=data)
        print("Moisture reading sent. Server response:", response.text)
        response.close()
    except Exception as e:
        print("Error sending moisture reading:", str(e))

def main():
    connect_wifi()
    if network.WLAN(network.STA_IF).isconnected():
        print("WiFi connected. Waiting 5 seconds before pinging server...")
        time.sleep(5)  # Wait for 5 seconds
        if ping_server():
            device_id = register_with_server()
            if device_id:
                last_reading_time = 0
                while True:
                    current_time = time.time()
                    if current_time - last_reading_time >= READING_INTERVAL:
                        send_moisture_reading(device_id)
                        last_reading_time = current_time
                    
                    # Add a small delay to prevent tight looping
                    time.sleep(1)
            else:
                print("Failed to register device. Exiting.")
        else:
            print("Server is not reachable. Exiting.")
    else:
        print("WiFi connection failed. Exiting.")

if __name__ == "main":
    try:
        main()
    except KeyboardInterrupt:
        print("Program terminated by user")
    finally:
        # Perform any cleanup if necessary
        print("Exiting program")