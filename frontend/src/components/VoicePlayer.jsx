import React, { useEffect, useRef, useState } from 'react';

const WAVEFORM_HEIGHTS = [
  35, 60, 85, 45, 95, 70, 40, 80, 100, 65,
  50, 90, 75, 30, 85, 60, 95, 40, 70, 85,
  55, 90, 65, 45, 80, 50
];

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function normalizeAudioUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://student3.softclub.tj')) {
    return 'https://' + url.slice('http://'.length);
  }
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith(`http://${window.location.host}`)
  ) {
    return 'https://' + url.slice('http://'.length);
  }
  return url;
}

export default function VoicePlayer({ src, duration = '0:05', isMe = false }) {
  const normalizedSrc = normalizeAudioUrl(src);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(() => {
    if (typeof duration === 'number') return duration;
    if (typeof duration === 'string' && duration.includes(':')) {
      const [m, s] = duration.split(':').map(Number);
      return (m || 0) * 60 + (s || 0);
    }
    return 5;
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !normalizedSrc) return;
    setHasError(false);

    const handleLoadedMetadata = () => {
      setHasError(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [normalizedSrc]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Voice play blocked or failed:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (index) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const seekFraction = index / (WAVEFORM_HEIGHTS.length - 1);
    const newTime = seekFraction * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audio) {
      audio.playbackRate = nextRate;
    }
  };

  const progressFraction = totalDuration > 0 ? currentTime / totalDuration : 0;
  const currentBarIndex = Math.floor(progressFraction * WAVEFORM_HEIGHTS.length);

  return (
    <div
      className={`rounded-2xl p-2.5 sm:p-3 my-1 flex items-center gap-2.5 sm:gap-3 select-none transition-all ${
        isMe
          ? 'bg-on-primary/15 text-on-primary'
          : 'bg-surface-container text-on-surface'
      }`}
    >
      <audio ref={audioRef} src={normalizedSrc} preload="metadata" />

      {/* Play/Pause Action Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={hasError}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isMe
            ? 'bg-on-primary text-primary hover:bg-white'
            : 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant'
        }`}
        title={isPlaying ? 'Pause' : 'Play Voice Message'}
      >
        <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
          {isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>

      {/* Waveform Bars & Time Section */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        {/* Interactive Waveform */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 h-7 py-1 cursor-pointer"
          title="Click to seek"
        >
          {WAVEFORM_HEIGHTS.map((heightPercent, idx) => {
            const isPlayed = idx <= currentBarIndex;
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(idx);
                }}
                style={{ height: `${heightPercent}%` }}
                className={`flex-1 min-w-[2.5px] max-w-[4px] rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isMe
                      ? 'bg-on-primary shadow-sm'
                      : 'bg-primary shadow-sm'
                    : isMe
                    ? 'bg-on-primary/35 hover:bg-on-primary/60'
                    : 'bg-outline-variant hover:bg-on-surface-variant'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Timing Label & Status */}
        <div className="flex items-center justify-between text-[11px] font-mono mt-0.5 opacity-90">
          <span>{isPlaying ? formatTime(currentTime) : (duration || formatTime(totalDuration))}</span>
          <div className="flex items-center gap-1.5">
            {hasError && (
              <span className="text-[10px] text-error font-sans font-bold">Failed to load</span>
            )}
            <button
              type="button"
              onClick={cycleSpeed}
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight transition-colors ${
                isMe
                  ? 'bg-on-primary/20 hover:bg-on-primary/30 text-on-primary'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Toggle playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
