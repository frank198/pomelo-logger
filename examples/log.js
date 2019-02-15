const log4jsConfig = require('./log4js');
const log = require('../index');
log.configure(log4jsConfig, {
    serverId : 'test',
    base     : './examples'
});
const logger = log.getLogger('log', __filename);

process.env.LOGGER_LINE = true;
logger.info('test1');
logger.warn('test2');
logger.error('test3');
logger.fatal('test fatal');
console.error('console test fatal');

const redisLogger = log.getLogger('redis', __filename);
// redisLogger.info('redisLogger test1 info');
// redisLogger.warn('redisLogger test2 warn');
redisLogger.error('redisLogger test3 error');
redisLogger.fatal('redisLogger test fatal');
console.error('redisLogger console test error');