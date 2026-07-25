/** Per-scenario keystroke / pause analytics for OC admin reports. */

export class OcKeystrokeTracker {
  reset() {
    this.startedAt = Date.now();
    this.firstKeyAt = null;
    this.lastKeyAt = null;
    this.keystrokes = 0;
    this.backspaces = 0;
    this.longPauseCount = 0;
    this.peakPauseMs = 0;
  }

  recordKeyEvent(e) {
    const now = Date.now();
    if (e.key === "Tab" || e.key === "Shift" || e.key.startsWith("Arrow") || e.key === "Meta" || e.key === "Control" || e.key === "Alt") {
      return;
    }
    if (!this.firstKeyAt) this.firstKeyAt = now;
    if (this.lastKeyAt) {
      const gap = now - this.lastKeyAt;
      if (gap >= 3000) {
        if (gap >= 5000) this.longPauseCount += 1;
        if (gap > this.peakPauseMs) this.peakPauseMs = gap;
      }
    }
    this.lastKeyAt = now;
    if (e.key === "Backspace" || e.key === "Delete") this.backspaces += 1;
    else if (e.key.length === 1) this.keystrokes += 1;
  }

  summarize(answerText = "", timeUsed = 0, timedOut = false) {
    const words = answerText.trim().split(/\s+/).filter(Boolean).length;
    const chars = answerText.length;
    const activeMs =
      this.firstKeyAt && this.lastKeyAt ? Math.max(1, this.lastKeyAt - this.firstKeyAt) : 0;
    const firstKeyDelaySec = this.firstKeyAt
      ? Math.round((this.firstKeyAt - this.startedAt) / 1000)
      : null;
    const revisionRatio =
      this.keystrokes + this.backspaces > 0
        ? Math.round((this.backspaces / (this.keystrokes + this.backspaces)) * 100)
        : 0;
    const charsPerMin = activeMs > 0 ? Math.round((chars / activeMs) * 60000) : 0;
    const thinkingIndex =
      words > 0 ? Math.min(100, Math.round((this.longPauseCount / words) * 100 + (this.peakPauseMs / 60000) * 20)) : 0;

    let cognitiveNote = "Typical response pacing.";
    if (timedOut && words < 10) cognitiveNote = "Timed out with minimal input — possible freeze or avoidance under pressure.";
    else if (firstKeyDelaySec != null && firstKeyDelaySec > 45) cognitiveNote = "Long initial hesitation before writing — high deliberation or uncertainty at scenario open.";
    else if (this.longPauseCount >= 4) cognitiveNote = "Multiple extended pauses (>5s) — deep deliberation or difficulty sustaining focus.";
    else if (revisionRatio >= 35) cognitiveNote = "High revision rate — second-guessing or careful self-editing.";
    else if (charsPerMin > 0 && charsPerMin < 120 && words > 20) cognitiveNote = "Slow typing cadence relative to length — cautious, reflective composition.";
    else if (charsPerMin >= 280 && revisionRatio < 15) cognitiveNote = "Fast, fluent output with low revision — decisive under pressure.";

    return {
      keystrokes: this.keystrokes,
      backspaces: this.backspaces,
      longPauses: this.longPauseCount,
      peakPauseSec: Math.round(this.peakPauseMs / 1000),
      firstKeyDelaySec,
      revisionRatio,
      charsPerMin,
      wordCount: words,
      charCount: chars,
      thinkingIndex,
      cognitiveNote,
      timeUsed,
      timedOut,
    };
  }
}
