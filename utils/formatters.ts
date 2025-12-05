
/**
 * Formats seconds into MM:SS.m or MM:SS format.
 * @param seconds Total seconds
 * @param includeMs Whether to include the decimal milliseconds (e.g. for speedrun timers)
 * @returns Formatted time string
 */
export const formatTime = (seconds: number, includeMs: boolean = true): string => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (includeMs) {
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
