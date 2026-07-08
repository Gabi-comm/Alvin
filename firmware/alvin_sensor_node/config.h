#pragma once
// -----------------------------------------------------------------------------
// ALVIN sensor node configuration.
//
// WiFi credentials and the backend URL are NOT set here — they are entered once
// through the on-device setup portal (captive portal) and saved to flash.
// -----------------------------------------------------------------------------

// ---- Setup portal (the WiFi the ESP32 creates for first-time setup) ----
#define AP_SSID         "ALVIN-Setup"
#define AP_PASSWORD     "alvinsetup"     // must be >= 8 chars
#define PORTAL_TIMEOUT_S 180             // seconds the portal stays open

// ---- ALVIN backend ----
// Default shown in the portal; you can override it there. Use the LAN IP of the
// machine running the backend, e.g. "http://192.168.1.10:8000".
#define ALVIN_API_URL_DEFAULT "http://192.168.1.10:8000"

// ---- Identity of this node ----
// NODE_ID is the single connection key — it must match the backend/app
// (HARDWARE_NODE_ID). ROOM_NAME shows in the web app's device list.
#define SENSOR_ID       "esp32-01"
#define NODE_ID         "node_r610"
#define ROOM_NAME       "Room 610"

// ---- Timing ----
#define SEND_INTERVAL_MS   15000   // how often to push a reading (ms)

// ---- Pins ----
#define DHT_PIN         4          // DHT22 data pin (with 10k pull-up to 3V3)
#define DHT_TYPE        DHT22
#define RESET_PIN       0          // hold this (BOOT button) at power-on to
                                   // clear saved WiFi and re-open the portal
