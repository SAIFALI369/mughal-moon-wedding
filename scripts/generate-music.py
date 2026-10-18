"""Generate five original instrumental loops (no sampled or copyrighted recordings).
Run with Python + imageio-ffmpeg. The temporary WAVs stay outside the repository.
"""
import array, math, pathlib, subprocess, tempfile, wave
import imageio_ffmpeg
ROOT = pathlib.Path(__file__).resolve().parents[1]
RATE, SECONDS = 22050, 32
TRACKS = [
    ("moonlit-dua", 196, [0, 7, 12, 14, 12, 7, 4, 7], 4, .18),
    ("rosewater", 220, [0, 3, 7, 10, 7, 3, 5, 7], 2, .26),
    ("royal-courtyard", 174.614, [0, 5, 7, 12, 10, 7, 5, 3], 2, .22),
    ("sufi-breeze", 146.832, [0, 2, 3, 7, 10, 7, 3, 2], 4, .2),
    ("evening-mehfil", 164.814, [0, 3, 5, 7, 10, 7, 5, 3], 2, .24),
]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for name, root, notes, beat, strength in TRACKS:
    samples = array.array("h")
    for i in range(RATE * SECONDS):
        t = i / RATE
        # Slow pad and overlapping, decaying plucks; no vocals or abrupt drum hits.
        fade = min(1, t / 2, (SECONDS - t) / 2)
        sound = .075 * math.sin(2 * math.pi * root / 2 * t) + .04 * math.sin(2 * math.pi * root * .75 * t)
        for offset in range(3):
            index = int(t / beat) - offset
            if index < 0: continue
            age = t - index * beat
            freq = root * 2 ** (notes[index % len(notes)] / 12)
            env = (1 - math.exp(-age * 12)) * math.exp(-age / 2.6)
            sound += strength * env * (math.sin(2 * math.pi * freq * age) + .18 * math.sin(2 * math.pi * freq * 2 * age))
        samples.append(int(max(-.9, min(.9, sound * fade)) * 32767))
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE); wav.writeframes(samples.tobytes())
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", "64k", str(ROOT / "public/audio" / f"{name}.mp3")], check=True)
subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(ROOT / "public/audio/balagal-ula-bi-kamalihi.wav"), "-codec:a", "libmp3lame", "-b:a", "80k", str(ROOT / "public/audio/balagal-ula-bi-kamalihi.mp3")], check=True)
