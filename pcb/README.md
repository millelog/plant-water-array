# Plant Water Array — PCB Design

Breakout board for ESP32 DevKit V1 with OLED display and 5 moisture sensor connectors.

## Board Summary

```
+--------------------------------------------------+
|                                                  |
|  [OLED 4-pin]              [ESP32 DevKit V1]    |
|   GND VCC SCL SDA           L-socket  R-socket  |
|                              (1x15)    (1x15)    |
|                                                  |
|  [J_S1] [J_S2] [J_S3] [J_S4] [J_S5]           |
|   G34    G35    G36    G39    G32               |
+--------------------------------------------------+
```

## Parts List (per board)

### PCB Connectors (solder onto the board)

| Part | Qty | Search Term | Notes |
|------|-----|-------------|-------|
| 1x15 Female Pin Socket (2.54mm) | 2 | "1x15 pin socket 2.54mm" | ESP32 DevKit mounts into these |
| 1x4 Female Pin Socket (2.54mm) | 1 | "1x4 pin socket 2.54mm" | SSD1306 OLED plugs in here |
| JST-XH 3-pin vertical header (B3B-XH-A) | 5 | "JST XH 3 pin male header vertical" | Board-side sensor connectors |

### Sensor Cable Parts (per sensor, 5 per board)

| Part | Qty | Search Term | Notes |
|------|-----|-------------|-------|
| JST-XH 3-pin plug housing (XHP-3) | 1 | "JST XH 3 pin female housing" | Mates with B3B-XH-A header |
| JST-XH crimp contacts (SXH-001T-P0.6) | 3 | "JST XH crimp terminal" | One per wire |
| 3-conductor wire (22-26 AWG) | ~1m | "3 conductor 24AWG wire" | Length as needed, up to ~2m |

### Quantities for 5 Boards

| Part | Total Qty |
|------|-----------|
| 1x15 Female Pin Socket | 10 |
| 1x4 Female Pin Socket | 5 |
| JST-XH 3-pin header (B3B-XH-A) | 25 |
| JST-XH 3-pin housing (XHP-3) | 25 |
| JST-XH crimp contacts | 75 |
| 3-conductor wire | ~25m |

### Where to Buy

- **Amazon** (fastest) — search "JST XH connector kit" (~$10-15 for assorted kit with headers + housings + crimp pins). Separately get a pack of "female pin header socket 2.54mm" (~$5-7).
- **AliExpress** (cheapest, 2-3 week shipping) — same searches, about 1/3 the price.
- **Digikey / Mouser** (exact part numbers, reliable) — B3B-XH-A ~$0.15ea, XHP-3 ~$0.10ea, SXH-001T-P0.6 ~$0.05ea, pin sockets ~$0.50ea.

A JST crimp tool (~$25) is helpful but you can solder wires directly to the crimp contacts instead.

## Pin Mapping

| Connector | Pin 1 | Pin 2 | Pin 3 | ESP32 GPIO |
|-----------|-------|-------|-------|------------|
| J_S1 | GND | 3V3 | SIG | GPIO 34 |
| J_S2 | GND | 3V3 | SIG | GPIO 35 |
| J_S3 | GND | 3V3 | SIG | GPIO 36 (VP) |
| J_S4 | GND | 3V3 | SIG | GPIO 39 (VN) |
| J_S5 | GND | 3V3 | SIG | GPIO 32 |
| J_OLED | GND | 3V3 | SCL (GPIO 22) | SDA (GPIO 21) |

## Generating the Netlist

```bash
cd pcb/
python generate_netlist.py
# Produces plant_water_array.net
# Open KiCad PCB Editor → File → Import Netlist
```

No dependencies required — just Python.

## PCB Layout Tips

- ESP32 socket headers in the center (25.4mm apart, verify with your DevKit)
- OLED header on top edge
- JST-XH connectors along bottom or side edge
- Keep traces wide (0.5mm+)
- Pour a ground plane on the back copper layer (select B.Cu → Place → Add Filled Zone → net GND)

## Ordering PCBs (JLCPCB)

1. Export Gerbers from KiCad: **File → Fabrication Outputs → Gerbers**, then **Generate Drill Files**
2. Zip the `gerber_out/` folder
3. Go to **jlcpcb.com** → **Order Now** → upload the zip

### JLCPCB Settings

| Setting | Value |
|---------|-------|
| Base Material | FR-4 |
| Layers | 2 |
| PCB Qty | 5 |
| PCB Thickness | 1.6mm |
| PCB Color | Green (cheapest) |
| Surface Finish | HASL (or LeadFree HASL) |
| Copper Weight | 1 oz |
| Everything else | Default |

Cost: ~$2-5 + shipping ($1-5 standard, ~$15-20 DHL express).

## Sensor Cable Assembly

Each sensor cable is a 3-wire bundle with a JST-XH plug on the board end:

```
Sensor                Board End
┌─────────┐         ┌──────────┐
│ S (sig) │─────────│ Pin 3    │
│ + (VCC) │─────────│ Pin 2    │
│ - (GND) │─────────│ Pin 1    │
└─────────┘         └──────────┘
                    JST-XH plug
```

Use 3-conductor cable (ribbon cable or twisted triple) — can run 1-2 meters without issues for analog signals.
