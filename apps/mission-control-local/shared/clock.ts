// Time a reading has been on screen is measured on a clock that never moves back.
// Date.now follows the wall clock, which a time sync or a person can set back; a card
// timed on it would stay Online past 45 seconds by however far the clock went back.
export const monotonicNow = (): number => performance.now();
