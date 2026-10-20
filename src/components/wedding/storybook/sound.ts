/** Short, gesture-unlocked effects; no downloaded sound files. */
export function storySound(kind: "knock" | "chime") {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = new AudioContext();
    const notes = kind === "knock" ? [180] : [523.25, 659.25, 783.99];
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = context.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
    window.setTimeout(() => {
      void context.close();
    }, 850);
  } catch {
    /* Sound is optional on restricted browsers. */
  }
}
