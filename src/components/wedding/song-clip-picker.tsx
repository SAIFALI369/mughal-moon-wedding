import { useEffect, useRef, useState } from "react";
import { Pause, Play, Scissors } from "lucide-react";
import {
  formatClipTime,
  resolveSongSource,
  songClip,
  withYouTubeClip,
  type InvitationSong,
} from "./invitation-music";

type Clip = { clipStart: number; clipEnd: number };

/**
 * "Which part of the song should guests hear?"
 *
 * The host pastes a link, hears the whole thing (or watches the video), then
 * picks a window inside it. The window is played back here exactly as the card
 * plays it, so what they choose is what guests get.
 */
export function SongClipPicker({
  song,
  index,
  onChange,
}: {
  song: InvitationSong;
  index: number;
  onChange: (patch: Partial<Clip>) => void;
}) {
  const source = resolveSongSource(song.url);
  const { start, end } = songClip(song);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAtRef = useRef<number | null>(null);

  // A new link means a new track: forget the old duration and position.
  useEffect(() => {
    setDuration(0);
    setPosition(0);
    setPlaying(false);
  }, [song.url]);

  const maxSeconds = duration > 0 ? Math.floor(duration) : source?.kind === "youtube" ? 900 : 600;
  const endValue = end ?? maxSeconds;
  const clipSeconds = Math.max(0, endValue - start);

  function playClip() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    stopAtRef.current = end ?? (duration > 0 ? duration : null);
    try {
      audio.currentTime = start;
    } catch {
      // Ignore environments without a seekable media element.
    }
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => setPlaying(false));
    }
  }

  const isYouTube = source?.kind === "youtube";
  const isSpotify = source?.kind === "spotify";

  if (!source) return null;

  return (
    <div className="song-clip" data-testid={`song-clip-${index}`}>
      <div className="song-clip-head">
        <Scissors size={13} aria-hidden="true" />
        <span>Choose the part guests hear</span>
        <b>
          {formatClipTime(start)} – {end ? formatClipTime(end) : "end"}
        </b>
      </div>

      {isSpotify ? (
        <p className="song-clip-note">
          Spotify embeds always start at the beginning. Use a YouTube or MP3 link to choose an
          excerpt.
        </p>
      ) : (
        <>
          {isYouTube && source && (
            <div className="song-clip-video">
              <iframe
                key={`${source.videoId}-${start}-${endValue}`}
                src={withYouTubeClip(source.embedUrl, song)}
                title={`${song.title || "Song"} preview`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            </div>
          )}

          {!isYouTube && (
            <div className="song-clip-audio">
              <audio
                ref={audioRef}
                src={source.src}
                preload="metadata"
                controls
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                onTimeUpdate={(event) => {
                  const audio = event.currentTarget;
                  setPosition(audio.currentTime);
                  const stopAt = stopAtRef.current;
                  if (stopAt && audio.currentTime >= stopAt) {
                    audio.pause();
                    setPlaying(false);
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                className="song-clip-audio-el"
              />
              <button
                type="button"
                className="song-clip-play"
                onClick={playClip}
                aria-label={playing ? "Stop the chosen part" : "Play the chosen part"}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                {playing ? "Stop" : "Play chosen part"}
              </button>
            </div>
          )}

          <div className="song-clip-sliders">
            <label>
              <span>
                Start <b>{formatClipTime(start)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={maxSeconds}
                step={1}
                value={Math.min(start, maxSeconds)}
                aria-label={`Start second for song ${index + 1}`}
                onChange={(event) => {
                  const nextStart = Number(event.target.value);
                  onChange({
                    clipStart: nextStart,
                    clipEnd:
                      end && end <= nextStart ? Math.min(maxSeconds, nextStart + 30) : song.clipEnd,
                  });
                }}
              />
            </label>
            <label>
              <span>
                End <b>{end ? formatClipTime(end) : "to the end"}</b>
              </span>
              <input
                type="range"
                min={0}
                max={maxSeconds}
                step={1}
                value={Math.min(endValue, maxSeconds)}
                aria-label={`End second for song ${index + 1}`}
                onChange={(event) => {
                  const nextEnd = Number(event.target.value);
                  onChange({ clipEnd: nextEnd });
                }}
              />
            </label>
          </div>

          <div className="song-clip-foot">
            <span>
              {clipSeconds > 0 ? `${formatClipTime(clipSeconds)} of the song` : "Full song"}
              {duration > 0 ? ` · full track ${formatClipTime(duration)}` : ""}
              {position > 0 ? ` · at ${formatClipTime(position)}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onChange({ clipStart: 0, clipEnd: 0 })}
              className="song-clip-reset"
            >
              Use full song
            </button>
          </div>
        </>
      )}
    </div>
  );
}
