require('dotenv').config();
const express = require('express');
const Server = require('./src/Server.js');
const Stream = require('./src/Stream.js');
const WebSocket = require('ws');

const INFINITY_LISTENERS = 0;

class AppServer {
  constructor() {
    this.PORT = 3000; // Use a non-privileged port like 8080
    this.app = express();
    this.server = new Server(this.app);
    this.serverInstance = this.app.listen(this.PORT, (error) => {
      if (error) {
        console.error(`Server failed to start: ${error}`);
      } else {
        console.log(`--------Server running at http://localhost:${this.PORT} ----------`);
      }
    });

    this.wss = new WebSocket.Server({ server: this.serverInstance });
    this.currentTranscription = '';
    this.lastWordIndex = 0;

    this.init();
  }

  init() {
    this.handleTranscriptionChange();
    
    // Add health check interval
    setInterval(() => {
      const stream = Stream.getInstance();
      if (stream && stream.getStream()) {
        // Check if stream is still running
        const currentStatus = stream.getStatus();
        if (currentStatus.found === false) {
          console.log('Stream appears to be stuck, attempting to restart...');
          stream.killStreamProcess();
          setTimeout(() => {
            Stream.getInstance().startStreamConversion('camera-first');
          }, 2000);
        }
      }
    }, 60000); // Check every minute
  }

  handleTranscriptionChange() {
    this.wss.on('connection', (ws) => {
      const stream = Stream.getInstance()?.transcription ?? '';

      const words = this.currentTranscription.split(' ');
      const transcriptionFromLastWord = words.slice(this.lastWordIndex).join(' ');
      ws.send(transcriptionFromLastWord);

      stream.events.setMaxListeners(INFINITY_LISTENERS);

      stream.events.on('transcriptionChanged', (newTranscription) => {
        this.currentTranscription = newTranscription;
        this.lastWordIndex = words.length;

        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) client.send(newTranscription);
        });
      });

      // Add ping-pong mechanism
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          if (ws.isAlive === false) {
            console.log('WebSocket connection terminated due to inactivity');
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Send a ping every 30 seconds

      console.log('WebSocket connection opened', ws.url);
    });

    this.wss.on('error', (error) => {
      console.log('WebSocket error', error);
    });
  }
}

// eslint-disable-next-line no-unused-vars
const appServer = new AppServer();
