
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

type SoundType = 
  | 'bgm_menu' 
  | 'bgm_game' 
  | 'click' 
  | 'hover' 
  | 'card_flip' 
  | 'card_slide'
  | 'alert' 
  | 'success' 
  | 'failure'
  | 'notification';

interface SoundContextType {
  playSound: (type: SoundType) => void;
  playBgm: (type: 'bgm_menu' | 'bgm_game') => void;
  stopBgm: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (vol: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

// Audio Assets
const SOUNDS: Record<SoundType, string> = {
  // BGM
  bgm_menu: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg', // Noir Rain (Menu)
  
  // Replace the URL below with your custom file if you have one (e.g., a Jazz Noir track)
  bgm_game: 'https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg', // Rain on Roof (Game) - Better for thinking than industrial hum
  
  // SFX
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.m4a', // Soft Click
  hover: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.m4a', // Subtle Tick
  card_flip: 'https://assets.mixkit.co/active_storage/sfx/2034/2034-preview.m4a', // Card Flip
  card_slide: 'https://assets.mixkit.co/active_storage/sfx/2034/2034-preview.m4a', // Card Slide
  alert: 'https://assets.mixkit.co/active_storage/sfx/950/950-preview.m4a', // Warning Tone
  success: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.m4a', // Win Chime
  failure: 'https://assets.mixkit.co/active_storage/sfx/893/893-preview.m4a', // Lose Tone
  notification: 'https://assets.mixkit.co/active_storage/sfx/2345/2345-preview.m4a', // Chat Beep
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmType = useRef<string | null>(null);

  // Preload SFX
  const sfxRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Pre-instantiate SFX
    Object.entries(SOUNDS).forEach(([key, src]) => {
      if (!key.startsWith('bgm_')) {
        const audio = new Audio(src);
        audio.volume = volume;
        sfxRefs.current[key] = audio;
      }
    });
  }, []);

  useEffect(() => {
    // Update volume for active BGM
    if (bgmRef.current) {
      bgmRef.current.volume = isMuted ? 0 : volume * 0.4; // BGM quieter to let SFX pop
    }
    // Update volume for SFX
    Object.values(sfxRefs.current).forEach(audio => {
      audio.volume = isMuted ? 0 : volume;
    });
  }, [volume, isMuted]);

  const playSound = (type: SoundType) => {
    if (isMuted) return;
    
    // SFX Logic
    if (!type.startsWith('bgm_')) {
      const audio = sfxRefs.current[type];
      if (audio) {
        // Clone node to allow overlapping sounds of same type
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = volume;
        clone.play().catch(() => {}); // Catch autoplay errors
      }
      return;
    }
  };

  const playBgm = (type: 'bgm_menu' | 'bgm_game') => {
    if (currentBgmType.current === type && !bgmRef.current?.paused) return;

    // Stop current BGM
    stopBgm();

    const src = SOUNDS[type];
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume * 0.4;
    
    audio.play().then(() => {
      bgmRef.current = audio;
      currentBgmType.current = type;
    }).catch(e => {
      console.warn("Autoplay blocked, waiting for interaction", e);
    });
  };

  const stopBgm = () => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      bgmRef.current = null;
      currentBgmType.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <SoundContext.Provider value={{ playSound, playBgm, stopBgm, isMuted, toggleMute, volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
};
