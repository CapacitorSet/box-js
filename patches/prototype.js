/*
function foo.bar(baz) { ... } becomes foo.bar = function(baz) { ... }

Additionally marked as a candidate to hoist.
Needs prototype-plugin enabled.
*/

module.exports = (fexpr) => ({
    type: "ExpressionStatement",
    hoist: true,
    expression: {
        type: "AssignmentExpression",
        operator: "=",
        left: fexpr.id,
        right: {
            type: "FunctionExpression",
            id: null,
            params: fexpr.params,
            body: fexpr.body
        }
    }
});