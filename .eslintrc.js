module.exports = {
    "parser": "babel-eslint",
    "extends": "google",
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
        "no-loop-func": 0,
        "no-return-assign": [1, "except-parens"],
        "no-unused-vars": 1,
        "no-var": 1,
        "prefer-const": 1,
        "require-jsdoc": 0
    }
};