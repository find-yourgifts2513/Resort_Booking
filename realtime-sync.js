/**
 * Solaria Luxury Resort - Real-Time Multi-Device Synchronization Engine
 * Ultra-Compatible Edition (Android 5.0+ to Android 15+)
 * 
 * Safe cross-device synchronization:
 * 1. WebSockets (Supported on Android 4.4+ / Chrome 16+)
 * 2. BroadcastChannel with LocalStorage StorageEvent fallback
 * 3. Safe ES5/ES6 syntax (no object spread, no optional chaining)
 */

function RealtimeSyncManager() {
  this.channelName = 'solaria_resort_sync_v1';
  this.listeners = [];
  this.isConnected = false;
  this.syncMethod = 'Local + Cloud Mesh';
  this.clientId = 'client_' + Math.random().toString(36).substring(2, 9);
  
  // Free public SSL MQTT WebSocket broker
  this.cloudBrokerHost = 'broker.hivemq.com';
  this.cloudBrokerPort = 8884;
  this.cloudTopic = 'solaria/resort/staff_sync/live_feed';
  this.mqttClient = null;
  this._statusCb = null;

  this.initLocalSync();
  this.initCloudMqttSync();
}

RealtimeSyncManager.prototype.onEvent = function(callback) {
  this.listeners.push(callback);
};

RealtimeSyncManager.prototype._emitLocal = function(eventData, isRemote) {
  for (var i = 0; i < this.listeners.length; i++) {
    try {
      this.listeners[i](eventData, isRemote);
    } catch (err) {
      console.log('Error in sync listener callback:', err);
    }
  }
};

// 1. Local Browser Tab Sync (BroadcastChannel + LocalStorage fallback)
RealtimeSyncManager.prototype.initLocalSync = function() {
  var self = this;

  // A. BroadcastChannel
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      this.bc = new BroadcastChannel(this.channelName);
      this.bc.onmessage = function(event) {
        if (event && event.data && event.data.originId !== self.clientId) {
          self._emitLocal(event.data, true);
        }
      };
    } catch (e) {
      this.bc = null;
    }
  }

  // B. LocalStorage StorageEvent (Works on 100% of Android browsers)
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', function(e) {
      if (e.key === 'solaria_broadcast_event' && e.newValue) {
        try {
          var payload = JSON.parse(e.newValue);
          if (payload && payload.originId !== self.clientId) {
            self._emitLocal(payload, true);
          }
        } catch (err) {}
      }
    });
  }
};

// 2. Cross-Device Cloud Sync (MQTT over WebSocket)
RealtimeSyncManager.prototype.initCloudMqttSync = function() {
  var self = this;
  if (typeof Paho !== 'undefined' && Paho.MQTT) {
    try {
      var client = new Paho.MQTT.Client(
        this.cloudBrokerHost,
        this.cloudBrokerPort,
        "/mqtt",
        "solaria_" + this.clientId
      );

      client.onConnectionLost = function(responseObject) {
        self.isConnected = false;
        self._emitStatusChange();
        if (responseObject.errorCode !== 0) {
          setTimeout(function() { self.initCloudMqttSync(); }, 4000);
        }
      };

      client.onMessageArrived = function(message) {
        try {
          var data = JSON.parse(message.payloadString);
          if (data && data.originId !== self.clientId) {
            self._emitLocal(data, true);
          }
        } catch (e) {}
      };

      client.connect({
        useSSL: true,
        timeout: 6,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: function() {
          self.mqttClient = client;
          self.isConnected = true;
          self.syncMethod = 'Cloud Realtime (Multi-Device Active)';
          try {
            client.subscribe(self.cloudTopic, { qos: 1 });
          } catch (e) {}
          self._emitStatusChange();

          self.publish({
            type: 'STAFF_PRESENCE',
            staff: window.currentStaff ? window.currentStaff.name : 'Staff',
            device: navigator.userAgent.indexOf('Android') !== -1 ? 'Android Device' : 'Desktop Browser'
          });
        },
        onFailure: function() {
          self.isConnected = false;
          self.syncMethod = 'Local Multi-Tab Sync Active';
          self._emitStatusChange();
          setTimeout(function() { self.initCloudMqttSync(); }, 10000);
        }
      });
    } catch (err) {
      this.isConnected = false;
      this._emitStatusChange();
    }
  } else {
    setTimeout(function() {
      if (typeof Paho !== 'undefined') self.initCloudMqttSync();
    }, 1500);
  }
};

// Publish across all devices & tabs
RealtimeSyncManager.prototype.publish = function(eventData) {
  // Safe clone without ES2018 object spread
  var enrichedData = {};
  for (var key in eventData) {
    if (Object.prototype.hasOwnProperty.call(eventData, key)) {
      enrichedData[key] = eventData[key];
    }
  }
  enrichedData.originId = this.clientId;
  enrichedData.timestamp = Date.now();

  // 1. BroadcastChannel
  if (this.bc) {
    try {
      this.bc.postMessage(enrichedData);
    } catch (err) {}
  }

  // 2. LocalStorage StorageEvent
  try {
    localStorage.setItem('solaria_broadcast_event', JSON.stringify(enrichedData));
  } catch (e) {}

  // 3. Cloud MQTT WebSocket
  if (this.mqttClient && this.isConnected) {
    try {
      var msg = new Paho.MQTT.Message(JSON.stringify(enrichedData));
      msg.destinationName = this.cloudTopic;
      msg.qos = 1;
      this.mqttClient.send(msg);
    } catch (err) {}
  }

  // 4. Firebase Firestore integration hook if active
  if (window.FirebaseSync && window.FirebaseSync.isActive) {
    window.FirebaseSync.handleLocalAction(enrichedData);
  }
};

RealtimeSyncManager.prototype.onStatusChange = function(cb) {
  this._statusCb = cb;
  this._emitStatusChange();
};

RealtimeSyncManager.prototype._emitStatusChange = function() {
  if (this._statusCb) {
    this._statusCb({
      connected: this.isConnected,
      method: this.isConnected ? 'Cloud Realtime (Multi-Device)' : 'Local Multi-Tab Active',
      clientId: this.clientId
    });
  }
};

// Global Singleton Instance
window.realtimeSync = new RealtimeSyncManager();
