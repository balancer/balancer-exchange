export function getStyles(key) {
    /* eslint-disable */
    const variables = require('sass-extract-loader?{"plugins":["sass-extract-js"]}!../../configs/theme/config-styles.scss')

    if (key instanceof Array) {
        const returnObj = {}

        for (let i = 0; i < key.length; i += 1) {
            const styleKey = key[i]


            if (variables[styleKey]) {
                const style = variables[styleKey]

                returnObj[styleKey] = style
            }
        }

        return returnObj
    } else if ((typeof key === 'string') && variables[key]) {
        return variables[key]
    }

    return null
}
