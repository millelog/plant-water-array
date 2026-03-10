import socket
import os
import machine  # type: ignore
import uhashlib  # type: ignore
import ubinascii  # type: ignore
import time
import json


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


class UpdateServer:
    def __init__(self, deploy_token, port=8266):
        self.deploy_token = deploy_token
        self.port = port
        self.sock = None

    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("0.0.0.0", self.port))
        self.sock.listen(1)
        self.sock.setblocking(False)
        print(f"Update server listening on port {self.port}")

    def check(self):
        if not self.sock:
            return
        try:
            cl, addr = self.sock.accept()
        except OSError:
            return
        try:
            cl.settimeout(10)
            self._handle_request(cl)
        except Exception as e:
            print(f"Update server error: {e}")
            try:
                cl.send(b"HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n")
            except Exception:
                pass
        finally:
            try:
                cl.close()
            except Exception:
                pass

    def _parse_headers(self, cl):
        raw = b""
        while b"\r\n\r\n" not in raw:
            chunk = cl.recv(512)
            if not chunk:
                break
            raw += chunk
        header_part, _, body_start = raw.partition(b"\r\n\r\n")
        first_line, _, header_block = header_part.partition(b"\r\n")
        method, path, _ = first_line.decode().split(" ", 2)
        headers = {}
        for line in header_block.decode().split("\r\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
        return method, path, headers, body_start

    def _send_response(self, cl, status, body=""):
        cl.send(f"HTTP/1.1 {status}\r\nConnection: close\r\nContent-Length: {len(body)}\r\n\r\n{body}".encode())

    def _handle_request(self, cl):
        method, path, headers, body_start = self._parse_headers(cl)

        if method != "POST":
            self._send_response(cl, "405 Method Not Allowed")
            return

        token = headers.get("x-deploy-token", "")
        if token != self.deploy_token:
            self._send_response(cl, "401 Unauthorized", "Bad token")
            return

        if path == "/push":
            self._handle_push(cl, headers, body_start)
        elif path == "/apply":
            self._handle_apply(cl, headers, body_start)
        else:
            self._send_response(cl, "404 Not Found")

    def _handle_push(self, cl, headers, body_start):
        filename = headers.get("x-filename", "")
        expected_checksum = headers.get("x-checksum", "")
        content_length = int(headers.get("content-length", "0"))

        if not filename or not expected_checksum:
            self._send_response(cl, "400 Bad Request", "Missing filename or checksum header")
            return

        # Protect config.py from being overwritten
        if filename == "config.py":
            self._send_response(cl, "403 Forbidden", "config.py is protected")
            return

        temp_name = filename + ".new"
        received = len(body_start)

        try:
            with open(temp_name, "wb") as f:
                if body_start:
                    f.write(body_start)
                while received < content_length:
                    chunk = cl.recv(512)
                    if not chunk:
                        break
                    f.write(chunk)
                    received += len(chunk)

            actual_checksum = sha256_file(temp_name)
            if actual_checksum != expected_checksum:
                os.remove(temp_name)
                self._send_response(cl, "422 Unprocessable Entity",
                                    f"Checksum mismatch: expected {expected_checksum}, got {actual_checksum}")
                return

            print(f"Staged {filename} ({received} bytes)")
            self._send_response(cl, "200 OK", "Staged")

        except Exception as e:
            try:
                os.remove(temp_name)
            except OSError:
                pass
            self._send_response(cl, "500 Internal Server Error", str(e))

    def _handle_apply(self, cl, headers, body_start):
        content_length = int(headers.get("content-length", "0"))
        body = body_start
        while len(body) < content_length:
            chunk = cl.recv(512)
            if not chunk:
                break
            body += chunk

        try:
            payload = json.loads(body.decode())
        except Exception:
            self._send_response(cl, "400 Bad Request", "Invalid JSON")
            return

        commit = payload.get("commit", "unknown")
        files = payload.get("files", [])

        if not files:
            self._send_response(cl, "400 Bad Request", "No files listed")
            return

        # Verify all .new files exist
        for filename in files:
            if not file_exists(filename + ".new"):
                self._send_response(cl, "400 Bad Request", f"Missing staged file: {filename}.new")
                return

        # Backup originals, swap in new files
        backups = []
        try:
            for filename in files:
                if file_exists(filename):
                    backup_name = filename + ".bak"
                    os.rename(filename, backup_name)
                    backups.append((filename, backup_name))

            for filename in files:
                os.rename(filename + ".new", filename)

            # Write version file
            with open("_version.py", "w") as f:
                f.write(f'GIT_COMMIT = "{commit}"\n')

            # Clean up backups
            for _, backup_name in backups:
                try:
                    os.remove(backup_name)
                except OSError:
                    pass

            print(f"Deploy applied: {commit} ({len(files)} files)")
            self._send_response(cl, "200 OK", "Applied, rebooting")

            time.sleep(1)
            machine.reset()

        except Exception as e:
            print(f"Error applying update: {e}")
            # Restore backups
            for original, backup in backups:
                try:
                    if file_exists(original):
                        os.remove(original)
                    os.rename(backup, original)
                    print(f"Restored {original}")
                except OSError as re:
                    print(f"Error restoring {original}: {re}")
            # Clean up .new files
            for filename in files:
                try:
                    os.remove(filename + ".new")
                except OSError:
                    pass
            self._send_response(cl, "500 Internal Server Error", str(e))
