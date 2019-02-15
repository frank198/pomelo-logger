const fs = require('fs');
const path = require('path');

class Utils {

    static GetMTime(filePath)
    {
        if (!fs.existsSync(filePath))
        {
            throw new Error(`Cannot find file with given path: ${filePath}`);
        }
        return fs.statSync(filePath).mtime;
    }

    static LoadFile(filePath, encoding = 'utf8')
    {
        if (filePath && fs.existsSync(filePath))
        {
            return JSON.parse(fs.readFileSync(filePath, encoding));
        }
        return undefined;
    }

    static ParseBoolean(s, bool = false)
    {
        if (typeof s !== 'string') return bool;
        if (s.toLowerCase() === 'true') return true;
        return bool;
    }

    static GetStackInfo()
    {
        // https://v8.dev/docs/stack-trace-api
        let stackInfo = {};
        let reg1 = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
        let reg2 = /at\s+()(.*):(\d*):(\d*)/i;
        let list = new Error().stack.split('\n').slice(3);
        let s = list[0];
        let sp = reg1.exec(s) || reg2.exec(s);
        if (sp && sp.length === 5) {
            stackInfo.method = sp[1];
            stackInfo.path = sp[2];
            stackInfo.filepath = sp[2].replace(process.cwd() + '/', '');
            stackInfo.line = sp[3];
            stackInfo.file = path.basename(stackInfo.path);
        }
        return stackInfo;
    }
}

module.exports = Utils;