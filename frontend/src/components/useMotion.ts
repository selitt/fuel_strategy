import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sharedMotionScheduler } from '../lib/motion';

const DURATION_MS = 120;

function sameNumbers(left: number[], right: number[]) {
    return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function numberToken(value: number) {
    if (Number.isNaN(value)) return 'nan';
    if (value === Infinity) return 'inf';
    if (value === -Infinity) return '-inf';
    if (Object.is(value, -0)) return '-0';
    return String(value);
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
            return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return reduced;
}

/** Smooths geometry only. Change key whenever the represented topology changes. */
export function useMotionNumbers(target: number[], key = ''): number[] {
    const reduced = useReducedMotion();
    const topology = `${key}\u0000${target.length}`;
    const signature = target.map(numberToken).join('\u0001');
    const [drawn, setDrawn] = useState(() => target.slice());
    const current = useRef(drawn);
    const currentTopology = useRef(topology);
    const compatible = currentTopology.current === topology && current.current.length === target.length;

    useLayoutEffect(() => {
        const destination = target.slice();
        if (reduced || currentTopology.current !== topology || current.current.length !== destination.length) {
            currentTopology.current = topology;
            current.current = destination;
            setDrawn(destination);
            return;
        }
        if (sameNumbers(current.current, destination))
            return;
        const origin = current.current.slice();
        let startedAt: number | null = null;
        return sharedMotionScheduler.subscribe(timestamp => {
            if (startedAt === null)
                startedAt = timestamp;
            const progress = Math.min(1, (timestamp - startedAt) / DURATION_MS);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = destination.map((value, index) => origin[index] + (value - origin[index]) * eased);
            current.current = next;
            setDrawn(next);
            return progress < 1;
        });
    }, [reduced, signature, topology]);

    return reduced || !compatible ? target : drawn;
}
