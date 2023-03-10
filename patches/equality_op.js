function MakeBinaryExpression(lhs, rhs, op) {
    // {"type":"BinaryExpression","start":30,"end":35,"left":{"type":"Identifier","start":30,"end":31,"name":"a"},"operator":"+","right":{"type":"Literal","start":34,"end":35,"value":1,"raw":"1"}}
    return {
        type: "BinaryExpression",
        left: lhs,
        right: rhs,
        operator: op
    };
};

function MakeLiteral(value) {
    return {
        type: "Literal",
        value: value
    };
};

function MakeIfThen(test, body) {
    return {
        type: "IfStatement",
        test: test,
        consequent: body
    };
};

// a == b
// to
// ((a) == "CURRENT_SCRIPT_IN_FAKED_DIR.js") || ((b) == "CURRENT_SCRIPT_IN_FAKED_DIR.js") ? true : a == b
function GenScriptCheck(lhs, rhs) {

    // Check for box-js fake script name.
    const scriptName = MakeLiteral("CURRENT_SCRIPT_IN_FAKED_DIR.js");
    const lhsScriptCheck = MakeBinaryExpression(lhs, scriptName, "==");
    const rhsScriptCheck = MakeBinaryExpression(rhs, scriptName, "==");
    const scriptCheck = MakeBinaryExpression(lhsScriptCheck, rhsScriptCheck, "||");

    // Recreate original equality check.
    const origCheck = MakeBinaryExpression(lhs, rhs, "==");

    // Make the ternary operator.
    const r = {
	"autogenerated": true,
        type: "ConditionalExpression",
        test: scriptCheck,
        consequent: MakeLiteral(true),
        alternate: origCheck
    }
    return r;
};

module.exports = (lhs, rhs) => (GenScriptCheck(lhs, rhs));