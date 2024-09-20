import time
import wifi_manager
import urequests  # MicroPython's requests library

# FastAPI server details
SERVER_URL = "http://192.168.70.101:8000/ping"  # Replace with your server's IP and port

def ping_server():
    try:
        response = urequests.get(SERVER_URL)
        print(f"Server response: {response.text}")
        response.close()
    except Exception as e:
        print(f"Failed to ping server: {e}")

def main():
    print("Entering main function")
    if wifi_manager.connect_wifi():
        print("WiFi connection successful!")
        while True:
            print("Pinging server...")
            ping_server()
            time.sleep(60)  # Wait for 60 seconds before pinging again
    else:
        print("Failed to connect to WiFi")

if __name__ == "main":
    main()

