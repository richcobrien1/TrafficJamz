// React hook for managing audio sessions with Socket.IO and mediasoup
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import audioService from '../services/audio.service';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://trafficjamz.onrender.com';

export const useAudioSession = (groupId) => {
  const { user } = useAuth();
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isInSession, setIsInSession] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioElementsRef = useRef(new Map()); // Map of userId -> audio element
  
  /**
   * Initialize Socket.IO connection
   */
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    console.log('🔌 Connecting to Socket.IO...');
    
    socketRef.current = io(API_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketRef.current.id);
      setIsConnected(true);
      setError(null);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
      setError('Failed to connect to audio server');
    });

    // Handle participant events
    socketRef.current.on('participant-joined', (data) => {
      console.log('👤 Participant joined:', data.userId);
      setParticipants(prev => {
        if (prev.find(p => p.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, socketId: data.socketId, isSpeaking: false }];
      });
    });

    socketRef.current.on('participant-left', (data) => {
      console.log('👤 Participant left:', data.userId);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      
      // Clean up audio element
      const audioElement = audioElementsRef.current.get(data.userId);
      if (audioElement) {
        audioElement.srcObject = null;
        audioElement.remove();
        audioElementsRef.current.delete(data.userId);
      }
    });

    // Handle new producer (someone started speaking)
    socketRef.current.on('new-producer', async (data) => {
      console.log('🎤 New producer available:', data.producerId, 'from user:', data.userId);
      if (sessionIdRef.current) {
        await consumeAudio(data.producerId, data.userId);
      }
    });

  }, []);

  /**
   * Create or join an audio session
   */
  const joinSession = useCallback(async () => {
    try {
      if (!user || !groupId) {
        throw new Error('User or group not available');
      }

      console.log('🎤 Joining audio session for group:', groupId);
      setError(null);

      // Connect socket if not connected
      if (!socketRef.current?.connected) {
        connectSocket();
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
          const checkConnection = setInterval(() => {
            if (socketRef.current?.connected) {
              clearTimeout(timeout);
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
        });
      }

      // Get or create audio session from backend
      const response = await fetch(`${API_URL}/api/audio/sessions/${groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      let sessionData;
      if (response.ok) {
        sessionData = await response.json();
      } else {
        // Create new session
        const createResponse = await fetch(`${API_URL}/api/audio/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            groupId,
            sessionType: 'voice_with_music' // Enable music support
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create audio session');
        }

        sessionData = await createResponse.json();
      }

      sessionIdRef.current = sessionData.session.id || sessionData.session._id;
      console.log('✅ Audio session:', sessionIdRef.current);

      // Initialize mediasoup device
      if (sessionData.rtpCapabilities) {
        await audioService.initializeDevice(sessionData.rtpCapabilities);
      }

      // Join socket room
      socketRef.current.emit('join-audio-session', {
        sessionId: sessionIdRef.current,
        userId: user.id || user.user_id,
        groupId
      });

      // Create transports
      await createTransports();

      setIsInSession(true);
      console.log('✅ Joined audio session');

    } catch (err) {
      console.error('❌ Failed to join session:', err);
      setError(err.message || 'Failed to join audio session');
      throw err;
    }
  }, [user, groupId, connectSocket]);

  /**
   * Create send and receive transports
   */
  const createTransports = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      // Create send transport
      const sendTransportResponse = await fetch(`${API_URL}/api/audio/transport/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          direction: 'send'
        })
      });

      if (!sendTransportResponse.ok) {
        throw new Error('Failed to create send transport');
      }

      const sendTransportData = await sendTransportResponse.json();

      await audioService.createSendTransport(
        sendTransportData,
        async (transportId, dtlsParameters) => {
          // Connect transport on server
          await fetch(`${API_URL}/api/audio/transport/connect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              transportId,
              dtlsParameters
            })
          });
        },
        async (transportId, kind, rtpParameters) => {
          // Create producer on server
          const response = await fetch(`${API_URL}/api/audio/produce`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              transportId,
              kind,
              rtpParameters
            })
          });

          const data = await response.json();
          return data;
        }
      );

      // Create receive transport
      const recvTransportResponse = await fetch(`${API_URL}/api/audio/transport/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          direction: 'receive'
        })
      });

      if (!recvTransportResponse.ok) {
        throw new Error('Failed to create receive transport');
      }

      const recvTransportData = await recvTransportResponse.json();

      await audioService.createRecvTransport(
        recvTransportData,
        async (transportId, dtlsParameters) => {
          // Connect transport on server
          await fetch(`${API_URL}/api/audio/transport/connect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              transportId,
              dtlsParameters
            })
          });
        }
      );

      console.log('✅ Transports created');
    } catch (err) {
      console.error('❌ Failed to create transports:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle microphone mute/unmute
   */
  const toggleMute = useCallback(async () => {
    try {
      if (!isInSession) {
        console.warn('⚠️ Not in session');
        return;
      }

      if (!isMuted) {
        // Mute: pause producer
        await audioService.pauseProducing();
        setIsMuted(true);
        console.log('🔇 Microphone muted');
      } else {
        // Unmute: get microphone and start producing
        if (!audioService.isCurrentlyProducing()) {
          const stream = await audioService.getUserMedia({ audio: true });
          const audioTrack = stream.getAudioTracks()[0];
          await audioService.startProducing(audioTrack);
          
          // Set up audio level monitoring
          setupAudioLevelMonitoring(stream);
          
          // Notify other participants via socket
          socketRef.current?.emit('producer-created', {
            sessionId: sessionIdRef.current,
            userId: user.id || user.user_id
          });
        } else {
          await audioService.resumeProducing();
        }
        
        setIsMuted(false);
        console.log('🔊 Microphone unmuted');
      }
    } catch (err) {
      console.error('❌ Failed to toggle mute:', err);
      setError('Failed to access microphone');
    }
  }, [isInSession, isMuted, user]);

  /**
   * Set up audio level monitoring for visualizing speaking
   */
  const setupAudioLevelMonitoring = useCallback((stream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorLevel = () => {
        if (!analyserRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100);
        
        setAudioLevel(level);
        setIsSpeaking(level > 10); // Threshold for speaking detection

        requestAnimationFrame(monitorLevel);
      };

      monitorLevel();
    } catch (err) {
      console.error('❌ Failed to setup audio monitoring:', err);
    }
  }, []);

  /**
   * Consume audio from another participant
   */
  const consumeAudio = useCallback(async (producerId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const rtpCapabilities = audioService.getRtpCapabilities();

      if (!rtpCapabilities) {
        throw new Error('RTP capabilities not available');
      }

      // Request consumer from server
      const response = await fetch(`${API_URL}/api/audio/consume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          producerId,
          rtpCapabilities
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create consumer');
      }

      const consumerData = await response.json();

      // Start consuming
      await audioService.startConsuming(consumerData, (track, producerUserId) => {
        // Create audio element and play
        const audioElement = new Audio();
        audioElement.srcObject = new MediaStream([track]);
        audioElement.autoplay = true;
        audioElement.play().catch(e => console.error('Failed to play audio:', e));
        
        audioElementsRef.current.set(producerUserId || userId, audioElement);
        console.log(`🔊 Playing audio from user: ${producerUserId || userId}`);
      });

      // Resume consumer on server
      await fetch(`${API_URL}/api/audio/consumer/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          consumerId: consumerData.id
        })
      });

      console.log('✅ Consuming audio from producer:', producerId);
    } catch (err) {
      console.error('❌ Failed to consume audio:', err);
    }
  }, []);

  /**
   * Leave audio session
   */
  const leaveSession = useCallback(async () => {
    try {
      if (!sessionIdRef.current) return;

      console.log('🛑 Leaving audio session...');

      // Notify server
      socketRef.current?.emit('leave-audio-session', {
        sessionId: sessionIdRef.current,
        userId: user?.id || user?.user_id
      });

      // Clean up audio service
      await audioService.cleanup();

      // Clean up audio elements
      audioElementsRef.current.forEach(audioElement => {
        audioElement.srcObject = null;
        audioElement.remove();
      });
      audioElementsRef.current.clear();

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Reset state
      sessionIdRef.current = null;
      setIsInSession(false);
      setIsMuted(true);
      setIsSpeaking(false);
      setParticipants([]);
      setAudioLevel(0);

      console.log('✅ Left audio session');
    } catch (err) {
      console.error('❌ Failed to leave session:', err);
    }
  }, [user]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      leaveSession();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [leaveSession]);

  /**
   * Share desktop audio (system/tab audio)
   */
  const shareDesktopAudio = useCallback(async () => {
    try {
      if (!isInSession) {
        throw new Error('Not in audio session');
      }

      console.log('🖥️ Starting desktop audio share...');
      
      // Get display media (desktop/tab audio)
      const desktopStream = await audioService.getDisplayMedia();
      const desktopTrack = desktopStream.getAudioTracks()[0];
      
      if (!desktopTrack) {
        throw new Error('No audio track in desktop stream');
      }

      // Stop current microphone producer if exists
      if (audioService.producer) {
        await audioService.stopProducing();
      }

      // Start producing with desktop audio track
      await audioService.startProducing(desktopTrack);
      
      // Handle track end (user stops sharing)
      desktopTrack.onended = async () => {
        console.log('🛑 Desktop audio share ended');
        await stopDesktopAudio();
      };

      console.log('✅ Desktop audio share started');
      return true;
    } catch (error) {
      console.error('❌ Failed to share desktop audio:', error);
      if (error.name === 'NotAllowedError') {
        setError('Desktop audio access denied. Please grant permission.');
      } else {
        setError(`Failed to share desktop audio: ${error.message}`);
      }
      return false;
    }
  }, [isInSession]);

  /**
   * Stop sharing desktop audio and return to microphone
   */
  const stopDesktopAudio = useCallback(async () => {
    try {
      console.log('🛑 Stopping desktop audio share...');
      
      // Stop current producer (desktop audio)
      if (audioService.producer) {
        await audioService.stopProducing();
      }

      // Restart with microphone if still in session
      if (isInSession && !isMuted) {
        const micStream = await audioService.getUserMedia({ audio: true });
        const micTrack = micStream.getAudioTracks()[0];
        await audioService.startProducing(micTrack);
        setupAudioAnalyser(micStream);
      }

      console.log('✅ Desktop audio share stopped, returned to microphone');
    } catch (error) {
      console.error('❌ Failed to stop desktop audio:', error);
      setError(`Failed to stop desktop audio: ${error.message}`);
    }
  }, [isInSession, isMuted]);

  return {
    // State
    isConnected,
    isInSession,
    isMuted,
    isSpeaking,
    participants,
    error,
    audioLevel,
    
    // Actions
    joinSession,
    leaveSession,
    toggleMute,
    shareDesktopAudio,
    stopDesktopAudio
  };
};
