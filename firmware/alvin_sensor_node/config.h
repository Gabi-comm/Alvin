#pragma once
// -----------------------------------------------------------------------------
// ALVIN sensor node configuration.
// Copy this file, fill in your values, and keep secrets out of version control.
// -----------------------------------------------------------------------------

// ---- WiFi ----
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ---- ALVIN backend (FastAPI) ----
// Use the LAN IP of the machine running `uvicorn main:app --port 8000`,
// e.g. "http://192.168.1.10:8000". Do NOT use "localhost" — that resolves to
// the ESP32 itself.
#define ALVIN_API_URL   "http://192.168.1.10:8000"

// Identity of this node. NODE_ID must match a node already in Firestore
// (see alvin-backend/seed.py). ROOM_NAME is shown in the web app's device list.
#define SENSOR_ID       "esp32-01"
#define NODE_ID         "node_r610"
#define ROOM_NAME       "Room 610"

// ---- Timing ----
#define SEND_INTERVAL_MS   15000   // how often to push a reading (ms)
#define MQ2_WARMUP_MS      20000   // heater warm-up before first calibration

// ---- Pins ----
#define DHT_PIN         4          // DHT22 data pin (with 10k pull-up to 3V3)
#define DHT_TYPE        DHT22
#define MQ2_AOUT_PIN    34         // MQ-2 analog out (ADC1, input-only pin)

// ---- MQ-2 analog front-end ----
// The MQ-2 AOUT can swing up to ~5V, but the ESP32 ADC maxes at ~3.3V, so the
// AOUT must go through a resistor divider. With two equal resistors (e.g. 2x
// 10k) the ratio is 2.0 (halves the voltage). Adjust to your divider.
#define MQ2_DIVIDER     2.0
#define MQ2_VC          5.0        // sensor/heater supply voltage
#define MQ2_RL_KOHM     5.0        // load resistor on the module (often 5k or 10k)
#define MQ2_CLEAN_AIR_RATIO 9.83   // Rs/Ro ratio in clean air (MQ-2 datasheet)

// ESP32 ADC
#define ADC_VREF        3.3
#define ADC_MAX         4095.0
