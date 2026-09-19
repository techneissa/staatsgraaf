/**
 * The one motion primitive the canvas uses.
 *
 * Every animated quantity on the graph canvas is a scalar chasing a target
 * with a critically damped spring: the frame rotation, the zoom, the pan. Springs are used instead of timed tweens because
 * a spring has no schedule to cancel. Retargeting mid-flight is the normal
 * case here, and a spring handles it by carrying on from the current value and
 * velocity, which is why a reader can click through five bodies in a second
 * without the canvas stuttering or snapping back.
 */

export type SpringConfig = { stiffness: number; damping: number };

/** Firm: settles in about 700 ms. */
export const SPRING_FIRM: SpringConfig = { stiffness: 120, damping: 22 };
/** Unpacking and folding: quick, settles in about 350 ms, so a run of clicks feels immediate. */
export const SPRING_SNAPPY: SpringConfig = { stiffness: 380, damping: 39 };
/** The turn of the canvas: unhurried, settles in about 1.1 s, still critically damped. */
export const SPRING_TURN: SpringConfig = { stiffness: 55, damping: 15 };
/** Zoom and pan: softer, so the ground moves slower than the figures on it. */
export const SPRING_SOFT: SpringConfig = { stiffness: 80, damping: 18 };

export type Spring = { value: number; velocity: number; target: number };

export function spring(value: number): Spring {
  return { value, velocity: 0, target: value };
}

/**
 * One integration step. `dt` is clamped, so a tab that returns after ten
 * seconds in the background resumes instead of launching the value into space.
 */
export function stepSpring(state: Spring, dt: number, config: SpringConfig = SPRING_FIRM): void {
  const step = Math.min(dt, 1 / 30);
  const force = (state.target - state.value) * config.stiffness - state.velocity * config.damping;
  state.velocity += force * step;
  state.value += state.velocity * step;
}

/** True when the spring is close enough to its target to stop drawing. */
export function settled(state: Spring, epsilon = 0.0015): boolean {
  return Math.abs(state.target - state.value) < epsilon && Math.abs(state.velocity) < epsilon * 8;
}

/** Put a spring on its target with no residue. Used for reduced motion. */
export function snap(state: Spring, target: number = state.target): void {
  state.target = target;
  state.value = target;
  state.velocity = 0;
}

/**
 * Live reduced-motion preference. The canvas reads this when it starts a move
 * rather than once at mount, so changing the system setting takes effect
 * without a reload.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
