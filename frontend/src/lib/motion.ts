export type MotionStep = (timestamp: number) => boolean;

export interface FrameDriver {
    requestFrame(callback: FrameRequestCallback): number;
    cancelFrame(handle: number): void;
}

const FRAME_INTERVAL_MS = 1000 / 60;
const FRAME_TOLERANCE_MS = .5;

/** A single demand-driven frame queue shared by every animated component. */
export function createMotionScheduler(driver: FrameDriver) {
    const steps = new Set<MotionStep>();
    let frame: number | null = null;
    let nextUpdate: number | null = null;

    const requestNext = () => {
        if (frame === null && steps.size)
            frame = driver.requestFrame(runFrame);
    };

    const runFrame: FrameRequestCallback = timestamp => {
        frame = null;
        if (!steps.size) {
            nextUpdate = null;
            return;
        }
        if (nextUpdate === null || timestamp + FRAME_TOLERANCE_MS >= nextUpdate) {
            nextUpdate = nextUpdate === null ? timestamp + FRAME_INTERVAL_MS : nextUpdate + FRAME_INTERVAL_MS;
            if (nextUpdate < timestamp)
                nextUpdate = timestamp + FRAME_INTERVAL_MS;
            for (const step of [...steps]) {
                if (steps.has(step) && !step(timestamp))
                    steps.delete(step);
            }
        }
        if (steps.size)
            requestNext();
        else
            nextUpdate = null;
    };

    return {
        subscribe(step: MotionStep) {
            steps.add(step);
            requestNext();
            return () => {
                steps.delete(step);
                if (!steps.size) {
                    nextUpdate = null;
                    if (frame !== null) {
                        driver.cancelFrame(frame);
                        frame = null;
                    }
                }
            };
        },
    };
}

export const sharedMotionScheduler = createMotionScheduler({
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle),
});
