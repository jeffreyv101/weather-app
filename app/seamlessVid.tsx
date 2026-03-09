"use client";
import { useRef, useState } from "react";

export default function SeamlessVideo({ src }: { src: string }) {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  
  // Track which video is currently visible and driving the time check
  const [active, setActive] = useState<1 | 2>(1);

  // How many seconds before the end should the crossfade begin?
  const crossfadeDuration = 1; 

  const handleTimeUpdate1 = () => {
    if (!video1Ref.current) return;
    const { duration, currentTime } = video1Ref.current;
    
    // If we are 1 second away from the end, fade in video 2
    if (duration - currentTime <= crossfadeDuration) {
      setActive(2);
      video2Ref.current?.play();
    }
  };

  const handleTimeUpdate2 = () => {
    if (!video2Ref.current) return;
    const { duration, currentTime } = video2Ref.current;
    
    // If we are 1 second away from the end, fade in video 1
    if (duration - currentTime <= crossfadeDuration) {
      setActive(1);
      video1Ref.current?.play();
    }
  };

  // Once a video finishes playing, reset it back to 0 so it's ready for the next crossfade
  const handleEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <>
      <video
        ref={video1Ref}
        src={src}
        autoPlay
        muted
        playsInline
        onTimeUpdate={active === 1 ? handleTimeUpdate1 : undefined}
        onEnded={handleEnded}
        // duration-1000 gives a smooth 1-second CSS fade
        className={`absolute inset-0 h-full w-full object-cover z-0 transition-opacity duration-1000 ${
          active === 1 ? "opacity-100" : "opacity-0"
        }`}
      />
      <video
        ref={video2Ref}
        src={src}
        muted
        playsInline
        onTimeUpdate={active === 2 ? handleTimeUpdate2 : undefined}
        onEnded={handleEnded}
        className={`absolute inset-0 h-full w-full object-cover z-0 transition-opacity duration-1000 ${
          active === 2 ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}