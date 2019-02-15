
class ResetProperty {
    static ReplaceProperties(configObj, opts)
    {
        if (configObj instanceof Array)
        {
            for (let i = 0, l = configObj.length; i < l; i++)
            {
                configObj[i] = this.ReplaceProperties(configObj[i], opts);
            }
        }
        else if (typeof configObj === 'object')
        {
            let field;
            for (const f in configObj)
            {
                if (!configObj.hasOwnProperty(f))
                {
                    continue;
                }

                field = configObj[f];
                if (typeof field === 'string')
                {
                    configObj[f] = this.DoReplace(field, opts);
                }
                else if (typeof field === 'object')
                {
                    configObj[f] = ResetProperty.ReplaceProperties(field, opts);
                }
            }
        }
        return configObj;
    }

    static DoReplace(src, opts)
    {
        if (!src)
        {
            return src;
        }

        const ptn = /\$\{(.*?)\}/g;
        let m, pro, ts, scope, name, defaultValue, func, res = '',
            lastIndex = 0;
        while ((m = ptn.exec(src)))
        {
            pro = m[1];
            ts = pro.split(':');
            if (ts.length !== 2 && ts.length !== 3)
            {
                res += pro;
                continue;
            }

            scope = ts[0];
            name = ts[1];
            if (ts.length === 3) defaultValue = ts[2];

            func = this[scope];
            if (!func && typeof func !== 'function')
            {
                res += pro;
                continue;
            }

            res += src.substring(lastIndex, m.index);
            lastIndex = ptn.lastIndex;
            res += (func(name, opts) || defaultValue);
        }

        if (lastIndex < src.length)
        {
            res += src.substring(lastIndex);
        }

        return res;
    }

    static env(name)
    {
        return process.env[name];
    }

    static argv(name)
    {
        return process.argv[name];
    }

    static opts(name, opts)
    {
        return opts ? opts[name] : undefined;
    }
}

module.exports = ResetProperty.ReplaceProperties;