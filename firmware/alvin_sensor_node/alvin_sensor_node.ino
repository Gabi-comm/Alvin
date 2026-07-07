// -----------------------------------------------------------------------------
// ALVIN Sensor Node — ESP32 + DHT22 + MQ-2
//
// Reads temperature & humidity (DHT22) and gas/smoke (MQ-2), then POSTs a
// reading to the ALVIN backend `/api/sensors/ingest`, which recomputes the
// room's comfort score. On boot it also registers itself via `/api/devices`
// so it shows up in the web app's device list.
//
// Libraries (install via Arduino Library Manager):
//   - "DHT sensor library" by Adafruit  (+ "Adafruit Unified Sensor")
//   - "ArduinoJson" by Benoit Blanchon (v6)
// Board: any ESP32 dev board (e.g. "ESP32 Dev Module").
// -----------------------------------------------------------------------------
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "config.h"

DHT dht(DHT_PIN, DHT_TYPE);

float mq2Ro = 10.0;              // MQ-2 baseline resistance (set by calibration)
unsigned long lastSend = 0;

// ---------------------------------------------------------------------------
// WiFi
// ---------------------------------------------------------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[wifi] connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[wifi] FAILED — will retry");
  }
}

// ---------------------------------------------------------------------------
// MQ-2 gas sensor
// ---------------------------------------------------------------------------
// Read the sensor resistance Rs (kOhm) from the averaged ADC value.
float mq2ReadRs() {
  const int samples = 16;
  long raw = 0;
  for (int i = 0; i < samples; i++) {
    raw += analogRead(MQ2_AOUT_PIN);
    delay(5);
  }
  float adc = raw / (float)samples;
  float vAdc = (adc / ADC_MAX) * ADC_VREF;   // voltage at the ESP32 pin
  float vOut = vAdc * MQ2_DIVIDER;           // undo the resistor divider
  if (vOut < 0.01) vOut = 0.01;              // avoid divide-by-zero
  // Rs = RL * (Vc - Vout) / Vout
  float rs = MQ2_RL_KOHM * (MQ2_VC - vOut) / vOut;
  if (rs < 0.01) rs = 0.01;
  return rs;
}

// Sample Rs in clean air and derive Ro = Rs / clean-air ratio.
void mq2Calibrate() {
  const int samples = 50;
  float rsSum = 0;
  for (int i = 0; i < samples; i++) {
    rsSum += mq2ReadRs();
    delay(50);
  }
  float rsAir = rsSum / samples;
  mq2Ro = rsAir / MQ2_CLEAN_AIR_RATIO;
  Serial.printf("[mq2] calibrated: Rs(air)=%.2f kΩ, Ro=%.2f kΩ\n", rsAir, mq2Ro);
}

// Estimated smoke concentration (ppm) from the Rs/Ro ratio using the MQ-2
// smoke curve. This is an APPROXIMATION — tune the constants for accuracy.
float mq2SmokePPM() {
  float ratio = mq2ReadRs() / mq2Ro;           // ~clean-air ratio when no gas
  float ppm = 605.18 * pow(ratio, -3.937);     // smoke curve (log-log fit)
  if (ppm < 0) ppm = 0;
  if (ppm > 10000) ppm = 10000;
  return ppm;
}

// Map smoke ppm to a coarse Air-Quality Index (what the backend expects).
// Clean air reads near 0; smoke/fire pushes it up.
float airQualityIndex(float ppm) {
  float aqi = 20.0 + ppm * 0.5;   // baseline 20, rises with smoke
  if (aqi > 500) aqi = 500;
  return aqi;
}

// ---------------------------------------------------------------------------
// Backend communication
// ---------------------------------------------------------------------------
bool httpPostJson(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(ALVIN_API_URL) + path);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("[http] POST %s -> %d\n", path.c_str(), code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

// Register this node in the web app's device list.
void registerDevice() {
  StaticJsonDocument<256> doc;
  doc["id"] = SENSOR_ID;
  doc["room"] = ROOM_NAME;
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("Temp");
  sensors.add("Humidity");
  sensors.add("Gas");
  doc["battery"] = 100;
  doc["status"] = "online";
  doc["last_seen"] = "just now";
  String body;
  serializeJson(doc, body);
  httpPostJson("/api/devices", body);
}

// Push a sensor reading; the backend recomputes the node's comfort score.
void sendReading(float temp, float hum, float aqi) {
  StaticJsonDocument<256> doc;
  doc["sensor_id"] = SENSOR_ID;
  doc["node_id"] = NODE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["air_quality"] = aqi;
  String body;
  serializeJson(doc, body);
  httpPostJson("/api/sensors/ingest", body);
}

// ---------------------------------------------------------------------------
// Arduino lifecycle
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  analogReadResolution(12);              // 0..4095
  analogSetPinAttenuation(MQ2_AOUT_PIN, ADC_11db); // full ~0..3.3V range
  dht.begin();

  connectWiFi();

  Serial.printf("[mq2] warming up %d ms...\n", MQ2_WARMUP_MS);
  delay(MQ2_WARMUP_MS);
  mq2Calibrate();

  registerDevice();
}

void loop() {
  connectWiFi();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    float temp = dht.readTemperature();    // Celsius
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) {
      Serial.println("[dht] read failed, skipping");
      return;
    }

    float ppm = mq2SmokePPM();
    float aqi = airQualityIndex(ppm);

    Serial.printf("[read] T=%.1f°C  H=%.0f%%  smoke=%.0fppm  AQI=%.0f\n",
                  temp, hum, ppm, aqi);

    sendReading(temp, hum, aqi);
  }

  delay(100);
}
