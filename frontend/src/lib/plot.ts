/** Plot coordinates only: positive and negative components stack on opposite sides.
 * This does not recompute or replace the model's reported financial total.
 */
export function signedStack(values: readonly (number | undefined)[]) {
    let min = 0;
    let max = 0;
    const segments: {
        index: number;
        from: number;
        to: number;
    }[] = [];
    values.forEach((value, index) => {
        if (value === undefined || !Number.isFinite(value))
            return;
        const from = value >= 0 ? max : min;
        const to = from + value;
        if (value >= 0)
            max = to;
        else
            min = to;
        segments.push({ index, from, to });
    });
    return { min, max, segments };
}
