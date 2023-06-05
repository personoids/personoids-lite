import fs from 'fs';
import winston from 'winston';

function initLogger() {
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    const tsFormat = () => (new Date()).toLocaleTimeString();
    const logger = winston.createLogger({
        transports: [
            // colorize the output to the console
            new winston.transports.Console({
                timestamp: tsFormat,
                colorize: true,
                level: 'info'
            }),

            new winston.transports.File({
                filename: `${logDir}/results.log`,
                timestamp: tsFormat,
                level: 'info'
            })
        ]
    });
    return logger;
}


export const logger = initLogger();