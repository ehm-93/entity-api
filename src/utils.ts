/**
 * The format function will replace numbered tokens within a string.
 *
 * @param str the string to format, like: 'Format {0} this {1} string'
 * @param params the values to replace the placeholder tokens
 */
export function format(str: string, ...params: any[]): string {
    return str.replace(/{(\d+)}/g, function(match, number) {
        const tmp = params[number] || match;

        if (typeof tmp === 'object') {
            return JSON.stringify(tmp);
        } else {
            return tmp || match;
        }
    });
}

/**
 * This Logger interface is, by design, a rip off of SLF4J's logger.
 */
export interface Logger {
    traceEnabled(): boolean
    trace(msg: string, ...params: any[]): void

    debugEnabled(): boolean
    debug(msg: string, ...params: any[]): void

    infoEnabled(): boolean
    info(msg: string, ...params: any[]): void

    warnEnabled(): boolean
    warn(msg: string, ...params: any[]): void

    errorEnabled(): boolean
    error(msg: string, ...params: any[]): void
}

export interface LoggerFactory {
    create(pkg: string): Logger
}

export enum LogLevel {
    TRACE = 0,
    DEBUG,
    INFO,
    WARN,
    ERROR
}

export let loggerFactory: LoggerFactory;

let defaultFilter: LogLevel = LogLevel.INFO;
export function setDefaultFilter(level: LogLevel): void {
    defaultFilter = level;
}

export function logger(pkg: string): Logger {
    if (loggerFactory) {
        return loggerFactory.create(pkg);
    } else {
        return new ConsoleLogger(pkg, defaultFilter);
    }
}

class ConsoleLogger implements Logger {
    constructor(private pkg: string, private granularity: LogLevel) {}

    traceEnabled() {
        return this.levelEnabled(LogLevel.TRACE);
    }

    trace(msg: string, ...params: any[]):void {
        this.log(LogLevel.TRACE, msg, ...params);
    }

    debugEnabled() {
        return this.levelEnabled(LogLevel.DEBUG);
    }

    debug(msg: string, ...params: any[]) {
        this.log(LogLevel.DEBUG, msg, ...params);
    }

    infoEnabled() {
        return this.levelEnabled(LogLevel.INFO);
    }

    info(msg: string, ...params: any[]) {
        this.log(LogLevel.INFO, msg, ...params);
    }

    warnEnabled() {
        return this.levelEnabled(LogLevel.WARN);
    }

    warn(msg: string, ...params: any[]) {
        this.log(LogLevel.WARN, msg, ...params);
    }

    errorEnabled() {
        return this.levelEnabled(LogLevel.ERROR);
    }

    error(msg: string, ...params: any[]) {
        this.log(LogLevel.ERROR, msg, ...params);
    }

    levelEnabled(level: LogLevel) {
        return this.granularity <= level;
    }

    log(level: LogLevel, msg: string, ...params: any[]) {
        if (!this.levelEnabled(level)) {
            return;
        }

        console.log(`${new Date().toISOString()} ${LogLevel[level]} ${this.pkg} - ${format(msg, ...params)}`);
    }
}


