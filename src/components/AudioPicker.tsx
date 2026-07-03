"use client";

import React, { useState, useRef, useEffect } from "react";
import { MUSIC_TRACKS, type FunctionType } from "@/lib/types";

interface AudioPickerProps {
  selectedTrackId: string;
  onChange: (trackId: string) => void;
  functionType?: FunctionType;
}

export default function AudioPicker({ selectedTrackId, onChange, functionType }: AudioPickerProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter tracks by functionType if provided, else show all
  const availableTracks = functionType
    ? MUSIC_TRACKS.filter((t) => t.functionTypes.includes(functionType))
    : MUSIC_TRACKS;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (trackId: string, fileUrl: string) => {
    if (playingId === trackId) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(fileUrl);
      newAudio.play().catch((e) => console.error("Audio playback failed:", e));
      
      // Auto-pause when track ends
      newAudio.addEventListener("ended", () => setPlayingId(null));
      
      audioRef.current = newAudio;
      setPlayingId(trackId);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {availableTracks.length === 0 && (
        <div className="col-span-full text-center text-[#F5ECD7]/40 py-8 text-sm">
          No specific tracks found for this ceremony. 
          Please select a different style or use the default track.
        </div>
      )}
      {availableTracks.map((track) => {
        const isSelected = selectedTrackId === track.id;
        const isPlaying = playingId === track.id;

        return (
          <div
            key={track.id}
            className={`
              relative flex items-center p-4 rounded-xl cursor-pointer border transition-all duration-200
              ${isSelected 
                ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.15)]" 
                : "bg-[#1C0A00]/50 border-[#D4AF37]/20 hover:border-[#D4AF37]/50"
              }
            `}
            onClick={() => onChange(track.id)}
          >
            {/* Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay(track.id, track.file);
              }}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4
                transition-all duration-200 border-2
                ${isPlaying
                  ? "bg-[#D4AF37] border-[#D4AF37] text-[#0A0500]"
                  : "bg-transparent border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                }
              `}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-base font-bold truncate ${isSelected ? "text-[#F0D060]" : "text-[#F5ECD7]"}`}>
                {track.name}
              </h4>
              <p className="text-xs text-[#F5ECD7]/50 truncate mt-0.5">
                {track.artist} &nbsp;·&nbsp; {track.mood}
              </p>
            </div>

            {/* Selection indicator */}
            <div className={`
              w-5 h-5 rounded-full border-2 ml-3 flex items-center justify-center shrink-0
              ${isSelected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-[#D4AF37]/30 bg-transparent"}
            `}>
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
