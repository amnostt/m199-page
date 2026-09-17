import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  musicUrl: string | null;
}

const PLAYBACK_ERROR_MESSAGE =
  "Background music could not be played. Please try again.";

export function LandingBackgroundMusic({ musicUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setPlaybackError(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setPlaybackError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  if (!musicUrl) return null;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      try {
        await audio.play();
      } catch {
        setPlaybackError(true);
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const label = isPlaying ? "Pause background music" : "Play background music";

  return (
    <div
      className="landing-background-music"
      data-testid="landing-background-music"
    >
      <audio
        ref={audioRef}
        src={musicUrl}
        preload="metadata"
        aria-hidden="true"
      />
      <button
        type="button"
        className="landing-background-music__toggle"
        aria-label={label}
        aria-pressed={isPlaying}
        data-playing={isPlaying}
        data-error={playbackError}
        onClick={() => void togglePlayback()}
      >
        {isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
        <span className="public-visually-hidden">{label}</span>
      </button>
      {playbackError && (
        <p role="status" aria-live="polite">
          {PLAYBACK_ERROR_MESSAGE}
        </p>
      )}
    </div>
  );
}

export default LandingBackgroundMusic;
