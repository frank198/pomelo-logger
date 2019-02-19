const log4js = require('log4js');
const ColorSize = require('./ColorSize');
const ReplaceProperties = require('./ResetProperty');
const Utils = require('./Utils');
const util = require('util');

const configState = {};
const marker = { start: '[', end: '] ' };
let serverId = '';

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
                if (Utils.ParseBoolean(process.env.RAW_MESSAGE)) {
                    logger[level](...argument);
                    return;
                }
                let prefixMessage  = Logger.concatMessage('', prefix);
                if (Utils.ParseBoolean(process.env.SERVER_NAME)) prefixMessage = Logger.concatMessage(prefixMessage, serverId);
                if (Utils.ParseBoolean(process.env.LOGGER_LINE) || Utils.ParseBoolean(process.env.LOGGER_METHOD) || Utils.ParseBoolean(process.env.LOGGER_FILENAME)) {
                    const stackInfo = Utils.GetStackInfo();
                    if (Utils.ParseBoolean(process.env.LOGGER_FILENAME)) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.filepath);
                    if (Utils.ParseBoolean(process.env.LOGGER_METHOD)) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.method);
                    if (Utils.ParseBoolean(process.env.LOGGER_LINE)) prefixMessage = Logger.concatMessage(prefixMessage, stackInfo.line);
                    prefixMessage  = ColorSize(prefixMessage , level);
                }
                if (prefixMessage.length)
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
        if (append.length > 0)
            return `${msg}${marker.start}${append}${marker.end}`;
        return msg;
    }

    static Configure(config, opts)
    {
        const filePath = config;
        config = config || process.env.LOG4JS_CONFIG;
        opts = opts || {};
        serverId = opts.serverId || '';
        if (typeof config === 'string')
        {
            config = Utils.LoadFile(config);
            Logger.InitConfigure(config);
        }

        if (config)
        {
            config = ReplaceProperties(config, opts);
        }
        if (filePath && typeof filePath === 'string' && config && config.reloadSecs)
        {
            Logger.InitReloadConfiguration(filePath, config.reloadSecs);
        }
        // config object could not turn on the auto reload configure file in log4js
        log4js.configure(config, opts);
    }

    static InitConfigure(config)
    {
        process.env.RAW_MESSAGE = Utils.ParseBoolean(config.rawMessage, false);
        process.env.LOGGER_LINE = Utils.ParseBoolean(config.lineDebug, true);
        process.env.LOGGER_FILENAME = Utils.ParseBoolean(config.fileDebug, false);
        process.env.LOGGER_METHOD = Utils.ParseBoolean(config.methodDebug, false);
        process.env.SERVER_NAME = Utils.ParseBoolean(config.serverName, true);
        Logger.ConfigureLevels(config.reloadLevels);

        if (config.replaceConsole)
        {
            process.nextTick(() => {
                const logger = Logger.GetLogger('console');
                console.originalLog = console.log;
                console.log = logger.log.bind(logger);
                console.debug = logger.debug.bind(logger);
                console.info = logger.info.bind(logger);
                console.warn = logger.warn.bind(logger);
                console.error = logger.error.bind(logger);
                console.trace = logger.trace.bind(logger);
                console.fatal = logger.fatal.bind(logger);
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
        configState.timerId = setInterval(Logger.ReloadConfiguration, reloadSecs * 1000);
    }

    static ReloadConfiguration()
    {
        const mTime = Utils.GetMTime(configState.filename);
        if (!mTime) return;
        if (configState.lastMTime && (mTime.getTime() > configState.lastMTime.getTime()))
        {
            Logger.ConfigureOnceOff(Utils.LoadFile(configState.filename));
        }
        configState.lastMTime = mTime;
    }

    static ConfigureOnceOff(config)
    {
        if (config)
        {
            try
            {

                Logger.InitConfigure(config);
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
