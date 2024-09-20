import network
import socket
import ure
import ujson
import machine
import ubinascii
import urequests
import time
import random

# Constants
AP_SSID = "NewDevice_{}"
AP_PASSWORD = "setuppassword"
SERVER_URL = "http://192.168.1.101:8000"  # Replace with your actual server URL

# Global variables

device_name = ""
wifi_ssid = ""
wifi_password = ""

def start_ap():
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    mac = ubinascii.hexlify(network.WLAN().config('mac'),':').decode()
    ap.config(essid=AP_SSID.format(mac[-5:]), password=AP_PASSWORD)
    while ap.active() == False:
        pass
    print('AP Mode Is Active')
    print(ap.ifconfig())

def setup_web_server():
    max_retries = 5
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('', 80))
            s.listen(5)
            
            while True:
                conn, addr = s.accept()
                request = conn.recv(1024)
                if request:
                    handle_request(conn, request)
                conn.close()
        except OSError as e:
            if e.errno == 112:  # EADDRINUSE
                print(f"Port 80 is in use. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                raise  # Re-raise the exception if it's not EADDRINUSE
        else:
            break  # If successful, break out of the retry loop
    else:
        print("Failed to start web server after multiple attempts")
        # You might want to implement a fallback mechanism here

def handle_request(conn, request):
    global device_name, wifi_ssid, wifi_password
    
    if b"POST /" in request:
        # Handle form submission
        match = ure.search("device_name=(.+)&ssid=(.+)&password=(.+)", request.decode())
        if match:
            device_name = match.group(1).replace("+", " ")
            wifi_ssid = match.group(2).replace("+", " ")
            wifi_password = match.group(3)
            save_config()
            send_response(conn, "Configuration saved. Connecting to WiFi...")
            return True
    else:
        # Serve the configuration page
        send_response(conn, get_html())
    return False

def get_available_networks():
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(True)
    networks = sta_if.scan()
    return sorted(list(set([net[0].decode() for net in networks])))

def get_html():
    available_networks = get_available_networks()
    network_options = "".join([f'<option value="{ssid}">{ssid}</option>' for ssid in available_networks])
    
    return f"""
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #f0f0f0;
            }}
            .container {{
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                width: 90%;
                max-width: 400px;
            }}
            h1 {{
                text-align: center;
                color: #333;
            }}
            form {{
                display: flex;
                flex-direction: column;
            }}
            label {{
                margin-top: 10px;
                font-weight: bold;
            }}
            input, select {{
                margin-bottom: 15px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }}
            input[type="submit"] {{
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px;
                cursor: pointer;
                font-size: 16px;
            }}
            input[type="submit"]:hover {{
                background-color: #45a049;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Device Setup</h1>
            <form method="POST">
                <label for="device_name">Device Name:</label>
                <input type="text" id="device_name" name="device_name" required>
                
                <label for="ssid">WiFi SSID:</label>
                <select id="ssid" name="ssid" required>
                    {network_options}
                </select>
                
                <label for="password">WiFi Password:</label>
                <input type="password" id="password" name="password" required>
                
                <input type="submit" value="Save and Connect">
            </form>
        </div>
    </body>
    </html>
    """

def send_response(conn, payload):
    conn.send('HTTP/1.0 200 OK\r\nContent-type: text/html\r\n\r\n')
    conn.send(payload)

def save_config():
    config = {
        "device_name": device_name,
        "wifi_ssid": wifi_ssid,
        "wifi_password": wifi_password
    }
    with open('config.json', 'w') as f:
        ujson.dump(config, f)

def load_config():
    global device_name, wifi_ssid, wifi_password
    try:
        with open('config.json', 'r') as f:
            config = ujson.load(f)
        device_name = config['device_name']
        wifi_ssid = config['wifi_ssid']
        wifi_password = config['wifi_password']
        return True
    except:
        return False

def connect_wifi():
    sta_if = network.WLAN(network.STA_IF)
    if not sta_if.isconnected():
        print('Connecting to WiFi...')
        sta_if.active(True)
        sta_if.connect(wifi_ssid, wifi_password)
        while not sta_if.isconnected():
            pass
    print('WiFi connected')

def register_with_server():
    data = {
        "device_name": device_name,
        "device_id": ubinascii.hexlify(machine.unique_id()).decode()
    }
    response = urequests.post(SERVER_URL + "/register_device", json=data)
    print("Server response:", response.text)
    response.close()

def send_moisture_reading():
    moisture = random.uniform(0, 100)  # Generate random moisture value between 0 and 100
    data = {
        "device_id": ubinascii.hexlify(machine.unique_id()).decode(),
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
    if load_config():
        connect_wifi()
        register_with_server()
        
        # Start periodic moisture readings
        while True:
            send_moisture_reading()
            time.sleep(300)  # Send reading every 5 minutes (300 seconds)
    else:
        start_ap()
        try:
            setup_web_server()
        finally:
            # Ensure AP is turned off when exiting
            ap = network.WLAN(network.AP_IF)
            ap.active(False)

if __name__ == "main":
    main()