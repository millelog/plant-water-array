"""
Plant Water Array — KiCad Netlist Generator (no dependencies)

Generates a .net netlist file that KiCad PCB Editor can import directly.

Board:
  - ESP32 DevKit V1 (2x15 pin headers)
  - SSD1306 OLED (4-pin header)
  - 5x JST-XH 3-pin moisture sensor connectors
  - 100nF decoupling cap on 3V3

Usage:
  python generate_netlist.py
  # Open KiCad PCB Editor → File → Import Netlist → plant_water_array.net
"""

import time

def generate():
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    # Components: (ref, value, footprint, [(pin_num, pin_name, net), ...])
    components = [
        # ESP32 Left Header: 3V3, EN, VP(36), VN(39), D34, D35, D32, D33, D25, D26, D27, D14, D12, GND, D13
        ("J_ESP_L", "ESP32_Left", "Connector_PinSocket_2.54mm:PinSocket_1x15_P2.54mm_Vertical", [
            (1, "3V3", "+3V3"),
            (2, "EN", "ESP_EN"),
            (3, "VP_G36", "SENSOR3_G36"),
            (4, "VN_G39", "SENSOR4_G39"),
            (5, "G34", "SENSOR1_G34"),
            (6, "G35", "SENSOR2_G35"),
            (7, "G32", "SENSOR5_G32"),
            (8, "G33", "ESP_G33"),
            (9, "G25", "ESP_G25"),
            (10, "G26", "ESP_G26"),
            (11, "G27", "ESP_G27"),
            (12, "G14", "ESP_G14"),
            (13, "G12", "ESP_G12"),
            (14, "GND", "GND"),
            (15, "G13", "ESP_G13"),
        ]),
        # ESP32 Right Header: VIN, GND, D23, D22, TX0, RX0, D21, D19, D18, D5, D17, D16, D4, D2, D15
        ("J_ESP_R", "ESP32_Right", "Connector_PinSocket_2.54mm:PinSocket_1x15_P2.54mm_Vertical", [
            (1, "VIN", "ESP_VIN"),
            (2, "GND", "GND"),
            (3, "G23", "ESP_G23"),
            (4, "G22_SCL", "I2C_SCL"),
            (5, "TX0", "ESP_TX0"),
            (6, "RX0", "ESP_RX0"),
            (7, "G21_SDA", "I2C_SDA"),
            (8, "G19", "ESP_G19"),
            (9, "G18", "ESP_G18"),
            (10, "G5", "ESP_G5"),
            (11, "G17", "ESP_G17"),
            (12, "G16", "ESP_G16"),
            (13, "G4", "ESP_G4"),
            (14, "G2", "ESP_G2"),
            (15, "G15", "ESP_G15"),
        ]),
        # OLED: GND, VCC, SCL, SDA
        ("J_OLED", "SSD1306_OLED", "Connector_PinSocket_2.54mm:PinSocket_1x04_P2.54mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SCL", "I2C_SCL"),
            (4, "SDA", "I2C_SDA"),
        ]),
        # Sensor 1 — GPIO 34
        ("J_S1", "Moisture_G34", "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SIG", "SENSOR1_G34"),
        ]),
        # Sensor 2 — GPIO 35
        ("J_S2", "Moisture_G35", "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SIG", "SENSOR2_G35"),
        ]),
        # Sensor 3 — GPIO 36
        ("J_S3", "Moisture_G36", "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SIG", "SENSOR3_G36"),
        ]),
        # Sensor 4 — GPIO 39
        ("J_S4", "Moisture_G39", "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SIG", "SENSOR4_G39"),
        ]),
        # Sensor 5 — GPIO 32
        ("J_S5", "Moisture_G32", "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical", [
            (1, "GND", "GND"),
            (2, "VCC", "+3V3"),
            (3, "SIG", "SENSOR5_G32"),
        ]),
    ]

    # Collect all nets
    nets = {}
    for ref, value, fp, pins in components:
        for pin_num, pin_name, net_name in pins:
            if net_name not in nets:
                nets[net_name] = []
            nets[net_name].append((ref, pin_num, pin_name))

    # Build netlist (KiCad legacy .net format)
    lines = []
    lines.append("(export (version D)")
    lines.append(f'  (design (date "{timestamp}"))')
    lines.append("")

    # Components section
    lines.append("  (components")
    for ref, value, fp, pins in components:
        lines.append(f"    (comp (ref {ref})")
        lines.append(f'      (value "{value}")')
        lines.append(f'      (footprint "{fp}")')
        lines.append("    )")
    lines.append("  )")
    lines.append("")

    # Nets section
    lines.append("  (nets")
    lines.append('    (net (code 0) (name ""))')  # unconnected net
    for i, (net_name, nodes) in enumerate(sorted(nets.items()), start=1):
        node_str = " ".join(f'(node (ref {ref}) (pin {pin}))' for ref, pin, _ in nodes)
        lines.append(f'    (net (code {i}) (name "{net_name}") {node_str})')
    lines.append("  )")

    lines.append(")")

    outfile = "plant_water_array.net"
    with open(outfile, "w") as f:
        f.write("\n".join(lines))

    print(f"Netlist written to {outfile}")
    print()
    print("Next steps:")
    print("  1. Open KiCad -> New Project (save in this pcb/ folder)")
    print("  2. Open PCB Editor")
    print("  3. File -> Import Netlist -> select plant_water_array.net")
    print("  4. Arrange components and route traces")
    print("  5. File -> Fabrication Outputs -> Gerbers")
    print("  6. Upload Gerbers to JLCPCB.com (~$2 for 5 boards)")


if __name__ == "__main__":
    generate()
