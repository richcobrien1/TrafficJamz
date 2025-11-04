import { Capacitor } from '@capacitor/core';

/**
 * Native Audio Service
 * Provides platform-aware audio control
 * - Web: Limited to browser audio element volume
 * - Native iOS/Android: Better audio session management
 */

/**
 * Check if running as native app
 */
export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get platform name
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Check if iOS
 */
export const isIOS = () => {
  const platform = getPlatform();
  return platform === 'ios' || /iPhone|iPad|iPod/.test(navigator.userAgent);
};

/**
 * Check if Android
 */
export const isAndroid = () => {
  return getPlatform() === 'android';
};

/**
 * Setup audio session for native apps
 * On native apps, this configures the audio session for background playback
 */
export const setupAudioSession = async () => {
  if (!isNativeApp()) {
    console.log('🎵 Web platform - using standard audio APIs');
    return;
  }

  try {
    console.log('🎵 Native app detected:', getPlatform());
    
    // For iOS native apps, the audio session is configured in Info.plist
    // For Android, it's in AndroidManifest.xml
    // No additional JS setup needed with Capacitor 7
    
    console.log('🎵 Native audio session ready');
  } catch (error) {
    console.error('🎵 Failed to setup audio session:', error);
  }
};

/**
 * Get audio constraints for native vs web
 */
export const getAudioConstraints = () => {
  const baseConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };

  if (isNativeApp()) {
    // Native apps can use higher quality settings
    baseConstraints.audio.sampleRate = 48000;
    baseConstraints.audio.channelCount = 1;
  }

  return baseConstraints;
};

/**
 * Configure audio element for platform
 * @param {HTMLAudioElement} audioElement 
 * @param {number} volume - 0 to 1
 * @param {boolean} muted 
 */
export const configureAudioElement = (audioElement, volume, muted) => {
  if (!audioElement) return;

  const platform = getPlatform();
  
  if (platform === 'ios') {
    // iOS (both web and native) ignores volume property
    // Use device volume buttons
    audioElement.volume = 1.0;
    audioElement.muted = muted;
    console.log('🎵 iOS: Using device volume control, muted:', muted);
  } else {
    // Desktop and Android: use volume property
    audioElement.volume = volume;
    audioElement.muted = muted;
    console.log('🎵', platform, ': volume:', volume, 'muted:', muted);
  }

  // Set playsinline for all platforms
  audioElement.setAttribute('playsinline', 'true');
  audioElement.setAttribute('webkit-playsinline', 'true');
  audioElement.playsInline = true;

  return audioElement;
};

/**
 * Check if device volume control is available
 * iOS always uses device volume, desktop/Android can use app volume
 */
export const usesDeviceVolume = () => {
  return isIOS();
};

/**
 * Get platform-specific volume control message
 */
export const getVolumeControlMessage = () => {
  if (isIOS()) {
    return isNativeApp() 
      ? '📱 Use your device volume buttons to control audio'
      : '📱 On iOS, use your device volume buttons to control voice volume. The slider above won\'t work.';
  }
  return null; // No message needed for desktop/Android
};

/**
 * Request audio permissions (for native apps)
 */
export const requestAudioPermissions = async () => {
  if (!isNativeApp()) {
    // Web: permissions handled by getUserMedia
    return true;
  }

  try {
    // Native apps: microphone permission already requested via getUserMedia
    // Additional native permissions configured in Info.plist / AndroidManifest.xml
    console.log('🎵 Audio permissions configured for native app');
    return true;
  } catch (error) {
    console.error('🎵 Failed to request audio permissions:', error);
    return false;
  }
};

/**
 * Keep audio playing in background (native apps only)
 */
export const enableBackgroundAudio = async () => {
  if (!isNativeApp()) {
    console.log('🎵 Background audio not available in web browsers');
    return false;
  }

  try {
    console.log('🎵 Background audio enabled via native configuration');
    // Background audio is configured in:
    // - iOS: Info.plist with UIBackgroundModes = audio
    // - Android: AndroidManifest.xml with FOREGROUND_SERVICE
    return true;
  } catch (error) {
    console.error('🎵 Failed to enable background audio:', error);
    return false;
  }
};

export default {
  isNativeApp,
  getPlatform,
  isIOS,
  isAndroid,
  setupAudioSession,
  getAudioConstraints,
  configureAudioElement,
  usesDeviceVolume,
  getVolumeControlMessage,
  requestAudioPermissions,
  enableBackgroundAudio
};
