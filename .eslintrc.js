module.exports = {
    "parser": "babel-eslint",
    "extends": "google",
    "env": {
        "node": true
    },
    "rules": {
        "camelcase": [1, {
            properties: "never"
        }],
        "curly": 0,
        "eol-last": 0,
        "eqeqeq": 1,
        "indent": [2, "tab", {SwitchCase: 1}],
        "max-len": 0,
        "new-cap": 1,
        "no-else-return": 1,
        "no-extend-native": 0,
        "no-invalid-this": 1,
        "no-global-assign": 1,
        "no-loop-func": 0,
        "no-return-assign": [1, "except-parens"],
        "no-tabs": 0,
        "no-unused-vars": 1,
        "no-var": 1,
        "prefer-const": 1,
        "quotes": ["error", "double"],
        "require-jsdoc": 0
    }
};