export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
    [key: string]: any;
}

class TelemetryManager {
    private static instance: TelemetryManager;
    private userId: string = 'anonymous';
    
    // Simple in-memory metric aggregation for the session
    private metrics: Map<string, number> = new Map();

    private constructor() {}

    public static getInstance(): TelemetryManager {
        if (!TelemetryManager.instance) {
            TelemetryManager.instance = new TelemetryManager();
        }
        return TelemetryManager.instance;
    }

    public setUserId(id: string) {
        this.userId = id;
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext) {
        return {
            timestamp: new Date().toISOString(),
            level,
            user_id: this.userId,
            message,
            ...context
        };
    }

    public log(level: LogLevel, message: string, context?: LogContext) {
        const payload = this.formatMessage(level, message, context);
        
        // In a real app, this would dispatch to an HTTP endpoint (Datadog, Splunk, etc.)
        // For now, we use structured console output
        switch (level) {
            case 'ERROR':
                console.error(`[${level}] ${message}`, payload);
                break;
            case 'WARN':
                console.warn(`[${level}] ${message}`, payload);
                break;
            case 'INFO':
                console.info(`[${level}] ${message}`, payload);
                break;
            case 'DEBUG':
                // console.debug(`[${level}] ${message}`, payload); // Uncomment for verbose dev logs
                break;
        }
    }

    // --- Metrics ---

    public incrementCounter(metricName: string, value: number = 1, tags: LogContext = {}) {
        const current = this.metrics.get(metricName) || 0;
        this.metrics.set(metricName, current + value);
        
        // Simulating a metric emission
        // console.log(`[METRIC] ${metricName}: ${value}`, tags);
    }

    public recordHistogram(metricName: string, value: number, tags: LogContext = {}) {
        // In a real system, we'd bucket this. For now, just logging outliers helps.
        if (metricName === 'frame_duration_ms' && value > 33) {
            this.log('WARN', 'Performance Degradation Detected', { metric: metricName, value, ...tags });
        }
    }
}

export const telemetry = TelemetryManager.getInstance();