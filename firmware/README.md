# ALVIN Sensor Node — ESP32 + DHT22 + MQ-2

Firmware for an ALVIN IoT node. It measures temperature & humidity (DHT22) and
gas/smoke (MQ-2), then pushes readings to the ALVIN backend, which recomputes
each room's comfort score and updates the web app.

```
[DHT22] --temp/humidity--\
                          >--> [ESP32] --WiFi/HTTP--> [ALVIN backend] --> [Firestore] --> [Web app]
[MQ-2]  --gas/smoke------/         POST /api/sensors/ingest
```

## Bill of materials

- ESP32 dev board (e.g. ESP32-WROOM DevKit)
- DHT22 (AM2302) temperature/humidity sensor
- MQ-2 gas/smoke sensor module
- 10 kΩ resistor (DHT22 data pull-up)
- 2 × 10 kΩ resistors (MQ-2 analog voltage divider)
- Jumper wires, breadboard

## Wiring

### DHT22 (digital)
| DHT22 | ESP32 |
| ----- | ----- |
| VCC   | 3V3   |
| DATA  | GPIO4 (+ 10 kΩ pull-up to 3V3) |
| GND   | GND   |

### MQ-2 (analog)
The MQ-2 heater runs on **5V**, and its analog output (AOUT) can swing up to
~5V. The ESP32 ADC only tolerates **3.3V**, so AOUT must go through a divider.

```
MQ-2 AOUT ---[10k]---+---> ESP32 GPIO34 (ADC)
                     |
                   [10k]
                     |
                    GND
```

| MQ-2  | ESP32 / Power |
| ----- | ------------- |
| VCC   | 5V (VIN)      |
| GND   | GND           |
| AOUT  | GPIO34 via the divider above |
| DOUT  | (unused)      |

> GPIO34 is input-only and on ADC1 — safe to use while WiFi is active.
> (Avoid ADC2 pins; WiFi uses ADC2.)

## Setup

1. Install the Arduino ESP32 board package and these libraries (Library Manager):
   - **DHT sensor library** (Adafruit) and **Adafruit Unified Sensor**
   - **ArduinoJson** (v6)
2. Open `alvin_sensor_node/alvin_sensor_node.ino` in the Arduino IDE.
3. Edit `config.h`:
   - `WIFI_SSID` / `WIFI_PASSWORD`
   - `ALVIN_API_URL` — the **LAN IP** of the machine running the backend
     (`http://<your-ip>:8000`), not `localhost`.
   - `NODE_ID` — must match a node already seeded in Firestore
     (see `alvin-backend/seed.py`, e.g. `node_r610`), and `ROOM_NAME` for the
     device list.
4. Select your ESP32 board + port and upload.
5. Open Serial Monitor at **115200 baud**. The MQ-2 warms up for ~20 s, then
   self-calibrates `Ro` in (assumed) clean air.

## How it connects to the web app

- On boot the node `POST`s to **`/api/devices`** so it appears in the web app's
  device list (Analytics → Devices).
- Every `SEND_INTERVAL_MS` it `POST`s to **`/api/sensors/ingest`**:
  ```json
  { "sensor_id": "esp32-01", "node_id": "node_r610",
    "temperature": 24.3, "humidity": 58, "air_quality": 22 }
  ```
- The backend saves the raw reading, recomputes the node's `comfort_score`, and
  updates the room. The frontend then reflects it via `/api/rooms` and
  `/api/dashboard/*` (the LIVE badges light up).

Make sure the backend allows the device: it does not need CORS (that's only for
browsers), but the backend must be reachable on your LAN and running **with
Firebase credentials** for the data to persist.

## Calibration notes (MQ-2)

- `Ro` is measured at boot assuming the surrounding air is clean. Power the node
  in fresh air for the first run.
- `MQ2_CLEAN_AIR_RATIO` (9.83) and the smoke curve in `mq2SmokePPM()` are
  datasheet approximations. For accuracy, calibrate against a known gas source
  and adjust the curve constants and `airQualityIndex()` mapping.
- The MQ-2 is best treated as a **relative smoke/gas trend + fire alarm**, not a
  lab-grade ppm meter.
