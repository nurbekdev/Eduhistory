"use client";

import { useEffect, useRef } from "react";

/**
 * Testdan o'tganda qisqa chiroyli muvaffaqiyat ovozini ijro etadi (Web Audio API).
 */
export function QuizResultEffect({ passed }: { passed: boolean }) {
  const played = useRef(false);

  useEffect(() => {
    if (!passed || played.current) return;
    played.current = true;

    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      playTone(523.25, 0, 0.12);
      playTone(659.25, 0.14, 0.2);
    } catch {
      // ignore
    }
  }, [passed]);

  return null;
}
