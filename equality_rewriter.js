const escodegen = require("escodegen");

// Rewrite "a == b" to '((a) == "CURRENT_SCRIPT_IN_FAKED_DIR.js") ||
// ((b) == "CURRENT_SCRIPT_IN_FAKED_DIR.js") ? true : a == b'. This
// makes checks against the faked up script file name always evaluate
// to true.
function rewriteScriptCheck(key, val) {
    if (!val) return;

    // Binary expression?
    if (val.type != "BinaryExpression") return;

    // == check?
    if (val.operator != "==") return;

    // Got a == expression. Pull out the left and right hand
    // expressions.
    const lhs = val.left;
    const rhs = val.right;

    // Don't rewrite this if it is already checking for the fake
    // box-js script name.
    const lhsCode = escodegen.generate(lhs);
    const rhsCode = escodegen.generate(rhs);
    if ((lhsCode == "'CURRENT_SCRIPT_IN_FAKED_DIR.js'") ||
        (rhsCode == "'CURRENT_SCRIPT_IN_FAKED_DIR.js'")) return
    
    //console.log("----");
    //console.log(JSON.stringify(val, null, 2));
    r = require("./patches/equality_op.js")(lhs, rhs);
    //console.log("REWRITE EQUALITY!!");
    //console.log(JSON.stringify(r, null, 2));
    //console.log(escodegen.generate(r));
    return r;
}

module.exports = {
    rewriteScriptCheck,
};
