import logging
import httpx

logger = logging.getLogger(__name__)


def send_notification(server_url: str, topic: str, title: str, message: str, priority: str = "default", tags: list[str] | None = None) -> bool:
    try:
        with httpx.Client(timeout=10.0) as client:
            payload = {
                "topic": topic,
                "title": title,
                "message": message,
                "priority": priority,
            }
            if tags:
                payload["tags"] = tags
            resp = client.post(f"{server_url.rstrip('/')}", json=payload)
            resp.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send ntfy notification: {e}")
        return False


def send_alert_notification(server_url: str, topic: str, alert_message: str, sensor_name: str | None, device_name: str | None) -> bool:
    sensor_label = sensor_name or "Unknown sensor"
    device_label = device_name or "Unknown device"
    title = f"{sensor_label} ({device_label})"

    tags = ["seedling"]
    priority = "default"
    if "below minimum" in alert_message.lower():
        tags.append("warning")
        priority = "high"
    elif "above maximum" in alert_message.lower():
        tags.append("droplet")

    return send_notification(server_url, topic, title, alert_message, priority=priority, tags=tags)


def send_device_offline_notification(server_url: str, topic: str, device_name: str, device_id: str) -> bool:
    title = f"{device_name} went offline"
    message = f"Device '{device_name}' (ID: {device_id}) has not sent a heartbeat within the expected timeout. Check power and WiFi connectivity."
    return send_notification(server_url, topic, title, message, priority="high", tags=["warning", "electric_plug"])
