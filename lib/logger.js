const log4js = require('log4js');
const ColorSize = require('./ColorSize');
const ReplaceProperties = require('./ResetProperty');
const Utils = require('./Utils');
const util = require('util');

const configState = {};
const marker = { start: '[ ', end: ' ] ' };

class Logger
{
    static GetLogger(categoryName, ...args)
    {
        let prefix = '';
        for (let i = 0; i < args.length; i++)
        {
            if (i !== args.length - 1)
                prefix = `${prefix + args[i]}] [`;
            else
                prefix = prefix + args[i];
        }
        if (typeof categoryName === 'string')
        {
            categoryName = categoryName.replace(process.cwd(), '');
        }
        const logger = log4js.getLogger(categoryName);
        const pLogger = {};
        for (const key in logger)
        {
            pLogger[key] = logger[key];
        }

        ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(level =>
        {
            pLogger[level] = (...argument) =>
            {
                if (!logger.isLevelEnabled(level)) return;
                if (process.env.RAW_MESSAGE) {
                    logger[level].apply(logger[level], argument);
                    return;
                }
                let prefixMessage  = Logger.concatMessage('', prefix);
                if (process.env.LOGGER_LINE || process.env.LOGGER_METHOD || process.env.LOGGER_FILENAME) {
                    const stackInfo = Utils.GetStackInfo();
                    if (process.env.LOGGER_FILENAME) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.filepath);
                    if (process.env.LOGGER_METHOD) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.method);
                    if (process.env.LOGGER_LINE) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.line);
                    prefixMessage  = ColorSize(prefixMessage , level);
                }

                if (args.length)
                {
                    argument[0] = prefixMessage  + argument[0];
                }
                logger[level](...argument);
            };
        });
        return pLogger;
    }

    static concatMessage(msg, append)
    {
        return `${marker.start}${append}${marker.end}${msg}`;
    }

    static Configure(config, opts)
    {
        const filePath = config;
        config = config || process.env.LOG4JS_CONFIG;
        opts = opts || {};

        if (typeof config === 'string')
        {
            config = Utils.LoadFile(config);
            this.InitConfigure(config);
        }

        if (config)
        {
            config = ReplaceProperties(config, opts);
        }
        if (filePath && typeof filePath === 'string' && config && config.reloadSecs)
        {
            this.InitReloadConfiguration(filename, config.reloadSecs);
        }
        // config object could not turn on the auto reload configure file in log4js
        log4js.configure(config, opts);
    }

    static InitConfigure(config)
    {
        process.env.RAW_MESSAGE = Utils.ParseBoolean(config.rawMessage, false);
        process.env.LOGGER_LINE = Utils.ParseBoolean(config.lineDebug, true);
        process.env.LOGGER_FILENAME = Utils.ParseBoolean(config.fileDebug, true);
        process.env.LOGGER_METHOD = Utils.ParseBoolean(config.methodDebug, false);
        this.ConfigureLevels(config.reloadLevels);
        if (config.replaceConsole)
        {
            process.nextTick(() => {
                const logger = log4js.getLogger();
                console.originalLog = console.log;
                console.log = logger.debug.bind(logger);
            });
        }
        else
        {
            if (typeof console.originalLog === 'function') console.log = console.originalLog.bind(console);
        }
    }

    /**
     *  定时更新配置文件
     * @param filePath
     * @param reloadSecs
     * @constructor
     */
    static InitReloadConfiguration(filePath, reloadSecs)
    {
        if (configState.timerId)
        {
            clearInterval(configState.timerId);
            delete configState.timerId;
        }
        configState.filename = filePath;
        configState.lastMTime = Utils.GetMTime(filePath);
        configState.timerId = setInterval(this.ReloadConfiguration, reloadSecs * 1000);
    }

    static ReloadConfiguration()
    {
        const mTime = Utils.GetMTime(configState.filename);
        if (!mTime) return;
        if (configState.lastMTime && (mTime.getTime() > configState.lastMTime.getTime()))
        {
            this.ConfigureOnceOff(Utils.LoadFile(configState.filename));
        }
        configState.lastMTime = mTime;
    }

    static ConfigureOnceOff(config)
    {
        if (config)
        {
            try
            {

                this.InitConfigure(config);
            }
            catch (e)
            {
                throw new Error(
                    `Problem reading log4js config ${util.inspect(config)
                        }. Error was "${e.message}" (${e.stack})`
                );
            }
        }
    }

    static ConfigureLevels(reloadLevels)
    {
        if (!reloadLevels) return;
        for (const category in reloadLevels)
        {
            if (reloadLevels.hasOwnProperty(category))
            {
                log4js.getLogger(category).level = reloadLevels[category];
            }
        }
    }
}

module.exports = {
    getLogger : Logger.GetLogger,
    configure : Logger.Configure,
    layouts   : log4js.addLayout,
    shutdown  : log4js.shutdown
};
