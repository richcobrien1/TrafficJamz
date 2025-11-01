// Audio service for managing mediasoup WebRTC audio connections
import * as mediasoupClient from 'mediasoup-client';

class AudioService {
  constructor() {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producer = null;
    this.consumers = new Map(); // Map of consumerId -> consumer
    this.localStream = null;
    this.isInitialized = false;
    this.isProducing = false;
  }

  /**
   * Initialize mediasoup device with router RTP capabilities
   * @param {Object} routerRtpCapabilities - RTP capabilities from server
   */
  async initializeDevice(routerRtpCapabilities) {
    try {
      if (this.isInitialized) {
        console.log('📱 Device already initialized');
        return;
      }

      this.device = new mediasoupClient.Device();
      await this.device.load({ routerRtpCapabilities });
      this.isInitialized = true;
      
      console.log('✅ Mediasoup device initialized');
      console.log('   Can produce audio:', this.device.canProduce('audio'));
      console.log('   RTP capabilities loaded');
    } catch (error) {
      console.error('❌ Failed to initialize mediasoup device:', error);
      throw error;
    }
  }

  /**
   * Create send transport for producing audio
   * @param {Object} transportOptions - Transport options from server
   * @param {Function} onConnect - Callback for connect event
   * @param {Function} onProduce - Callback for produce event
   */
  async createSendTransport(transportOptions, onConnect, onProduce) {
    try {
      if (!this.device) {
        throw new Error('Device not initialized');
      }

      console.log('🚀 Creating send transport...');
      
      this.sendTransport = this.device.createSendTransport(transportOptions);

      // Handle transport connect event
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('🔌 Send transport connecting...');
          await onConnect(this.sendTransport.id, dtlsParameters);
          console.log('✅ Send transport connected');
          callback();
        } catch (error) {
          console.error('❌ Send transport connect error:', error);
          errback(error);
        }
      });

      // Handle transport produce event
      this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          console.log(`🎤 Producing ${kind}...`);
          const { id } = await onProduce(this.sendTransport.id, kind, rtpParameters);
          console.log(`✅ Producer created: ${id}`);
          callback({ id });
        } catch (error) {
          console.error('❌ Produce error:', error);
          errback(error);
        }
      });

      // Handle transport connection state changes
      this.sendTransport.on('connectionstatechange', (state) => {
        console.log(`📡 Send transport connection state: ${state}`);
        if (state === 'failed' || state === 'closed') {
          this.sendTransport = null;
          this.producer = null;
          this.isProducing = false;
        }
      });

      console.log('✅ Send transport created');
    } catch (error) {
      console.error('❌ Failed to create send transport:', error);
      throw error;
    }
  }

  /**
   * Create receive transport for consuming audio
   * @param {Object} transportOptions - Transport options from server
   * @param {Function} onConnect - Callback for connect event
   */
  async createRecvTransport(transportOptions, onConnect) {
    try {
      if (!this.device) {
        throw new Error('Device not initialized');
      }

      console.log('🚀 Creating receive transport...');
      
      this.recvTransport = this.device.createRecvTransport(transportOptions);

      // Handle transport connect event
      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('🔌 Receive transport connecting...');
          await onConnect(this.recvTransport.id, dtlsParameters);
          console.log('✅ Receive transport connected');
          callback();
        } catch (error) {
          console.error('❌ Receive transport connect error:', error);
          errback(error);
        }
      });

      // Handle transport connection state changes
      this.recvTransport.on('connectionstatechange', (state) => {
        console.log(`📡 Receive transport connection state: ${state}`);
        if (state === 'failed' || state === 'closed') {
          this.recvTransport = null;
          this.consumers.clear();
        }
      });

      console.log('✅ Receive transport created');
    } catch (error) {
      console.error('❌ Failed to create receive transport:', error);
      throw error;
    }
  }

  /**
   * Start producing audio (enable microphone)
   * @param {MediaStreamTrack} audioTrack - Audio track from getUserMedia
   */
  async startProducing(audioTrack) {
    try {
      if (!this.sendTransport) {
        throw new Error('Send transport not created');
      }

      if (this.producer) {
        console.log('⚠️ Already producing audio');
        return this.producer;
      }

      console.log('🎤 Starting audio production...');
      
      this.producer = await this.sendTransport.produce({
        track: audioTrack,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
          opusFec: true,
          opusMaxPlaybackRate: 48000
        }
      });

      this.isProducing = true;

      this.producer.on('trackended', () => {
        console.log('🛑 Audio track ended');
        this.stopProducing();
      });

      this.producer.on('transportclose', () => {
        console.log('🛑 Send transport closed');
        this.producer = null;
        this.isProducing = false;
      });

      console.log(`✅ Audio producer started: ${this.producer.id}`);
      return this.producer;
    } catch (error) {
      console.error('❌ Failed to start producing:', error);
      throw error;
    }
  }

  /**
   * Stop producing audio (mute/disable microphone)
   */
  async stopProducing() {
    try {
      if (this.producer) {
        console.log('🛑 Stopping audio production...');
        this.producer.close();
        this.producer = null;
        this.isProducing = false;
        console.log('✅ Audio producer stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop producing:', error);
    }
  }

  /**
   * Pause audio production (mute)
   */
  async pauseProducing() {
    try {
      if (this.producer && !this.producer.paused) {
        await this.producer.pause();
        console.log('🔇 Audio producer paused');
      }
    } catch (error) {
      console.error('❌ Failed to pause producing:', error);
    }
  }

  /**
   * Resume audio production (unmute)
   */
  async resumeProducing() {
    try {
      if (this.producer && this.producer.paused) {
        await this.producer.resume();
        console.log('🔊 Audio producer resumed');
      }
    } catch (error) {
      console.error('❌ Failed to resume producing:', error);
    }
  }

  /**
   * Start consuming audio from another participant
   * @param {Object} consumerOptions - Consumer options from server
   * @param {Function} onTrack - Callback when audio track is available
   */
  async startConsuming(consumerOptions, onTrack) {
    try {
      if (!this.recvTransport) {
        throw new Error('Receive transport not created');
      }

      console.log(`🔊 Starting to consume producer: ${consumerOptions.producerId}`);
      
      const consumer = await this.recvTransport.consume({
        id: consumerOptions.id,
        producerId: consumerOptions.producerId,
        kind: consumerOptions.kind,
        rtpParameters: consumerOptions.rtpParameters
      });

      this.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        console.log(`🛑 Consumer transport closed: ${consumer.id}`);
        this.consumers.delete(consumer.id);
      });

      // Notify callback with the audio track
      if (onTrack) {
        onTrack(consumer.track, consumerOptions.producerUserId);
      }

      console.log(`✅ Consumer created: ${consumer.id}`);
      return consumer;
    } catch (error) {
      console.error('❌ Failed to start consuming:', error);
      throw error;
    }
  }

  /**
   * Stop consuming audio from a participant
   * @param {string} consumerId - Consumer ID to stop
   */
  async stopConsuming(consumerId) {
    try {
      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        console.log(`🛑 Stopping consumer: ${consumerId}`);
        consumer.close();
        this.consumers.delete(consumerId);
        console.log(`✅ Consumer stopped: ${consumerId}`);
      }
    } catch (error) {
      console.error('❌ Failed to stop consuming:', error);
    }
  }

  /**
   * Get user media (microphone access)
   * @param {Object} constraints - Media constraints
   */
  async getUserMedia(constraints = { audio: true, video: false }) {
    try {
      console.log('🎤 Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Microphone access granted');
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }
  }

  /**
   * Get display media (desktop/tab audio capture)
   * @returns {Promise<MediaStream>} - Media stream with audio track
   */
  async getDisplayMedia() {
    try {
      console.log('🖥️ Requesting desktop audio access...');
      
      // Request display media with audio only
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        }
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track in display media stream');
      }
      
      console.log('✅ Desktop audio access granted');
      console.log('   Audio track:', audioTrack.label);
      
      return stream;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('⚠️ User denied desktop audio access');
      } else {
        console.error('❌ Failed to get display media:', error);
      }
      throw error;
    }
  }

  /**
   * Stop all local media tracks
   */
  stopLocalStream() {
    if (this.localStream) {
      console.log('🛑 Stopping local media stream...');
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      console.log('✅ Local stream stopped');
    }
  }

  /**
   * Close all transports and clean up
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up audio service...');
      
      // Stop producing
      await this.stopProducing();
      
      // Close all consumers
      for (const [consumerId] of this.consumers) {
        await this.stopConsuming(consumerId);
      }
      
      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }
      
      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }
      
      // Stop local stream
      this.stopLocalStream();
      
      // Reset state
      this.device = null;
      this.isInitialized = false;
      this.isProducing = false;
      
      console.log('✅ Audio service cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Get RTP capabilities for the device
   */
  getRtpCapabilities() {
    return this.device ? this.device.rtpCapabilities : null;
  }

  /**
   * Check if device can produce audio
   */
  canProduce() {
    return this.device ? this.device.canProduce('audio') : false;
  }

  /**
   * Get current producing state
   */
  isCurrentlyProducing() {
    return this.isProducing && this.producer && !this.producer.closed;
  }

  /**
   * Get producer mute state
   */
  isProducerPaused() {
    return this.producer ? this.producer.paused : false;
  }
}

// Export singleton instance
export default new AudioService();
