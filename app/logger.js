const fs = require('fs');
const path = require('path');
const util = require('util');

const settings = require('./settings');

const APP_DIR = __dirname;

const getCallerInfo = () => {
    const stack = new Error().stack.split('\n');
    // 0: "Error", 1: getCallerInfo, 2: writeLine, 3: logger.info/error/warn, 4: actual caller
    const callerLine = stack[4] ?? '';
    const match = callerLine.match(/\((.+):(\d+):\d+\)/) || callerLine.match(/at (.+):(\d+):\d+/);
    if (!match) return '';
    const filePath = path.relative(APP_DIR, match[1]);
    return `${filePath}:${match[2]}`;
};

const BASE_LOG_DIR = settings.logDir; // configurable via LOG_DIR

let cachedLogPath = null;
let cachedErrorLogPath = null;
let cachedDay = null;

const getLogFilePaths = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;

    if (cachedDay !== today) {
        // Create the folder once per day: <LOG_DIR>/yyyy/mm
        const monthDir = path.join(BASE_LOG_DIR, yyyy.toString(), mm);
        fs.mkdirSync(monthDir, { recursive: true });

        // Files: yyyy-mm-dd.log and yyyy-mm-dd.errors.log
        cachedLogPath = path.join(monthDir, `${today}.log`);
        cachedErrorLogPath = path.join(monthDir, `${today}.errors.log`);
        cachedDay = today;
    }

    return { logPath: cachedLogPath, errorLogPath: cachedErrorLogPath };
};

const writeLog = (stream, filePath, line) => {
    stream.write(line);
    try {
        // appendFileSync guarantees the line is written before any crash
        fs.appendFileSync(filePath, line);
    } catch (err) {
        process.stderr.write(`LOG ERROR: ${err.message}\n`);
    }
};

const writeLine = (level, category, message, detail) => {
    const now = new Date().toISOString();
    const caller = getCallerInfo();
    let line = `[${now}] [${level}] [${category}] (${caller}) ${message}\n`;

    if (detail !== undefined) {
        line += util.inspect(detail, { depth: null, colors: false }) + '\n';
    }

    const { logPath, errorLogPath } = getLogFilePaths();

    if (level === 'ERROR') {
        writeLog(process.stderr, errorLogPath, line);
    } else {
        writeLog(process.stdout, logPath, line);
    }
};

module.exports = {
    info: (category, msg, detail) => writeLine('INFO', category, msg, detail),
    error: (category, msg, detail) => writeLine('ERROR', category, msg, detail),
    warn: (category, msg, detail) => writeLine('WARN', category, msg, detail),
};
