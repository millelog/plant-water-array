import network  # type: ignore
import socket
import time
import gc
import machine  # type: ignore
import ubinascii  # type: ignore


def scan_networks():
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    time.sleep(1)
    try:
        results = sta.scan()
    except Exception:
        results = []
    sta.active(False)

    seen = set()
    networks = []
    for r in results:
        ssid = r[0].decode("utf-8")
        rssi = r[3]
        if ssid and ssid not in seen:
            seen.add(ssid)
            networks.append((ssid, rssi))
    networks.sort(key=lambda x: x[1], reverse=True)
    gc.collect()
    return networks[:10]


def get_ap_ssid():
    mac = ubinascii.hexlify(network.WLAN(network.STA_IF).config("mac")).decode()
    return "PlantSensor_" + mac[-4:].upper()


def start_ap(ssid, password="plantsetup"):
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=ssid, password=password, authmode=3)  # 3 = WPA2
    while not ap.active():
        time.sleep(0.1)
    print("AP started:", ssid, "IP:", ap.ifconfig()[0])
    return ap


def dns_server(ip):
    ip_bytes = bytes(int(b) for b in ip.split("."))
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", 53))
    sock.setblocking(False)
    return sock, ip_bytes


def handle_dns(sock, ip_bytes):
    try:
        data, addr = sock.recvfrom(256)
        if len(data) < 12:
            return
        # Build minimal DNS response: same ID, flags=0x8180, 1 question, 1 answer
        resp = data[:2]  # Transaction ID
        resp += b"\x81\x80"  # Flags: standard response, no error
        resp += data[4:6] + data[4:6] + b"\x00\x00\x00\x00"  # QD=1, AN=1, NS=0, AR=0
        # Copy question section
        idx = 12
        while idx < len(data) and data[idx] != 0:
            idx += data[idx] + 1
        idx += 5  # null byte + qtype(2) + qclass(2)
        resp += data[12:idx]
        # Answer: pointer to name, type A, class IN, TTL 60, data length 4, IP
        resp += b"\xc0\x0c"  # Pointer to name in question
        resp += b"\x00\x01\x00\x01"  # Type A, Class IN
        resp += b"\x00\x00\x00\x3c"  # TTL 60
        resp += b"\x00\x04"  # Data length
        resp += ip_bytes
        sock.sendto(resp, addr)
    except OSError:
        pass


def url_decode(s):
    result = s.replace("+", " ")
    parts = result.split("%")
    decoded = parts[0]
    for part in parts[1:]:
        if len(part) >= 2:
            try:
                decoded += chr(int(part[:2], 16)) + part[2:]
            except ValueError:
                decoded += "%" + part
        else:
            decoded += "%" + part
    return decoded


def parse_form_data(body):
    params = {}
    for pair in body.split("&"):
        if "=" in pair:
            key, value = pair.split("=", 1)
            params[url_decode(key)] = url_decode(value)
    return params


def build_setup_page(networks, default_server_url, default_name):
    options = ""
    for ssid, rssi in networks:
        options += '<option value="' + ssid + '">' + ssid + " (" + str(rssi) + " dBm)</option>"
    options += '<option value="__other__">Other (manual entry)</option>'

    return """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plant Sensor Setup</title>
<style>
body{font-family:sans-serif;max-width:400px;margin:20px auto;padding:0 15px;background:#f5f5f5}
h1{color:#2d5016;font-size:1.4em}
label{display:block;margin-top:12px;font-weight:bold;font-size:.9em}
select,input{width:100%;padding:8px;margin-top:4px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box}
button{width:100%;padding:12px;margin-top:20px;background:#2d5016;color:#fff;border:none;border-radius:4px;font-size:1em;cursor:pointer}
button:hover{background:#3d6b20}
.note{font-size:.8em;color:#666;margin-top:4px}
#manual_ssid{display:none}
</style></head><body>
<h1>Plant Sensor Setup</h1>
<form method="POST" action="/save">
<label>WiFi Network</label>
<select name="ssid" id="ssid_select" onchange="toggleManual()">""" + options + """</select>
<input type="text" name="manual_ssid" id="manual_ssid" placeholder="Enter SSID">
<label>WiFi Password</label>
<input type="password" name="password" required>
<label>Server URL</label>
<input type="text" name="server_url" value=\"""" + default_server_url + """" required>
<p class="note">The address of your Plant Water Array server</p>
<label>Device Name</label>
<input type="text" name="device_name" value=\"""" + default_name + """" required>
<button type="submit">Save &amp; Connect</button>
</form>
<script>
function toggleManual(){
var s=document.getElementById('ssid_select');
var m=document.getElementById('manual_ssid');
m.style.display=s.value==='__other__'?'block':'none';
if(s.value==='__other__')m.required=true;else{m.required=false;m.value='';}
}
</script></body></html>"""


SUCCESS_PAGE = """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup Complete</title>
<style>body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:0 15px;text-align:center}
h1{color:#2d5016}</style></head><body>
<h1>Setup Complete!</h1>
<p>Your device is restarting and will connect to your WiFi network.</p>
<p>It should appear in your device list within a minute.</p>
<p>You can close this page and disconnect from the setup network.</p>
</body></html>"""


def save_config(ssid, password, server_url, device_name):
    with open("config.py", "w") as f:
        f.write('WIFI_SSID = "' + ssid + '"\n')
        f.write('WIFI_PASSWORD = "' + password + '"\n')
        f.write('SERVER_URL = "' + server_url + '"\n')
        f.write('DEVICE_NAME = "' + device_name + '"\n')
        f.write("READING_INTERVAL = 10\n")
        f.write('FIRMWARE_VERSION = "1.0.0"\n')
        f.write("OTA_CHECK_INTERVAL = 300\n")
        f.write("SENSOR_PINS = [34, 35, 32]\n")


def http_server(ip):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", 80))
    sock.listen(1)
    sock.setblocking(False)
    return sock


def handle_http(sock, setup_page):
    try:
        cl, addr = sock.accept()
    except OSError:
        return False

    try:
        cl.settimeout(5)
        request = cl.recv(1024).decode("utf-8")

        if "POST /save" in request:
            # Extract body from POST request
            body = ""
            if "\r\n\r\n" in request:
                body = request.split("\r\n\r\n", 1)[1]

            # Check if we need to read more data (Content-Length)
            content_length = 0
            for line in request.split("\r\n"):
                if line.lower().startswith("content-length:"):
                    content_length = int(line.split(":")[1].strip())
                    break

            while len(body) < content_length:
                body += cl.recv(512).decode("utf-8")

            params = parse_form_data(body)
            ssid = params.get("manual_ssid") or params.get("ssid", "")
            password = params.get("password", "")
            server_url = params.get("server_url", "").rstrip("/")
            device_name = params.get("device_name", "PlantSensor")

            if ssid and ssid != "__other__":
                save_config(ssid, password, server_url, device_name)
                response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n" + SUCCESS_PAGE
                cl.send(response.encode())
                cl.close()
                return True  # Signal to reboot
            else:
                cl.send(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nSSID required")
                cl.close()
                return False
        else:
            # Serve setup page for any GET request (captive portal detection)
            response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n" + setup_page
            cl.send(response.encode())
            cl.close()
            return False
    except Exception as e:
        print("HTTP error:", e)
        try:
            cl.close()
        except Exception:
            pass
        return False


def run_portal():
    print("Starting captive portal...")
    networks = scan_networks()
    gc.collect()

    ap_ssid = get_ap_ssid()
    default_server_url = "http://192.168.70.222:8000"
    ap = start_ap(ap_ssid)
    ap_ip = ap.ifconfig()[0]

    setup_page = build_setup_page(networks, default_server_url, ap_ssid)
    gc.collect()

    dns_sock, dns_ip_bytes = dns_server(ap_ip)
    http_sock = http_server(ap_ip)
    print("Portal ready at", ap_ip)

    start_time = time.time()
    timeout = 600  # 10 minutes

    try:
        while time.time() - start_time < timeout:
            handle_dns(dns_sock, dns_ip_bytes)
            should_reboot = handle_http(http_sock, setup_page)
            if should_reboot:
                print("Config saved. Rebooting in 2 seconds...")
                time.sleep(2)
                machine.reset()
            time.sleep(0.05)

        print("Portal timed out. Rebooting...")
        machine.reset()
    finally:
        dns_sock.close()
        http_sock.close()
        ap.active(False)
