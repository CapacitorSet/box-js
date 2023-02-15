const escodegen = require("escodegen");

function rewriteSimpleWaitLoop(key, val) {
    if (!val) return;

    // TODO: Currently only rewriting while() loops like
    // 'while(x < y) { x = x + 1 }'.
    
    // While loop?
    if (val.type != "WhileStatement") return;

    // Simple loop guard?
    if (val.test.type != "BinaryExpression") return;
    if (val.test.left.type != "Identifier") return;

    // Skip some benign loops we have trouble rewriting by checking the
    // loop index variable. Specifically skip loops where the loop index is
    // cardCountIndexFinal.
    if (val.test.left.name == "cardCountIndexFinal") return;
    
    // Only handling "<" and "<=" for now.
    if ((val.test.operator != "<") && (val.test.operator != "<=")) return;

    // Single statement in the loop body?
    if (val.body.type != "BlockStatement") return;
    if (val.body.body.length != 1) return;

    // Loop body statement is update to loop variable?
    line = val.body.body[0];
    if (line.type != "ExpressionStatement") return;
    line = line.expression;
    if ((line.type != "AssignmentExpression") && (line.type != "UpdateExpression")) return;
    if (line.type == "AssignmentExpression") {
        if (line.left.type != "Identifier") return;
        if (line.left.name != val.test.left.name) return;
        if ((line.operator != "=") && (line.operator != "+=")) return;
    };
    if (line.type == "UpdateExpression") {
        if (line.argument.type != "Identifier") return;
	if (line.argument.name != val.test.left.name) return;
        if (line.operator != "++") return;
    };
    
    //console.log("----");
    //console.log(JSON.stringify(val, null, 2));
    r = require("./patches/counter_while_loop.js")(val);
    //console.log("REWRITE WAIT!!");
    //console.log(JSON.stringify(r, null, 2));
    //console.log(escodegen.generate(r));
    return r;
}

function rewriteSimpleControlLoop(key, val) {
    if (!val) return;
    
    // While loop?
    if (val.type != "WhileStatement") return;

    // 2 statements in the loop body?
    if (val.body.type != "BlockStatement") return;
    if (val.body.body.length != 2) return;

    // 1st loop body statement is a try/catch?
    var line1 = val.body.body[0];
    if (line1.type != "TryStatement") return;

    // 1 statement in try block?
    if (line1.block.type != "BlockStatement") return;
    if (line1.block.body.length != 1) return;
    line1 = line1.block.body[0];

    // Possible calling funtion from array in try block?
    if (line1.type != "ExpressionStatement") return;
    line1 = line1.expression;
    if (line1.type == "AssignmentExpression") {
        line1 = line1.right;
    }
    if (line1.type != "CallExpression") return;
    if (line1.callee.type != "MemberExpression") return;

    // 1 or 2 statement in catch block.
    var catch_line = val.body.body[0].handler;
    if ((catch_line == undefined) || (catch_line.type != "CatchClause")) return;
    var catch_body = catch_line.body;
    if (catch_body.type != "BlockStatement") return;
    if ((catch_body.body.length != 1) && (catch_body.body.length != 2)) return;
    catch_body = catch_body.body[0];

    // Catch statement should be an assignment.
    if (catch_body.type != "ExpressionStatement") return;
    if (catch_body.expression.type != "AssignmentExpression") return;
    
    // 2nd loop body statement an assignment?
    var line2 = val.body.body[1];
    if (line2.type != "ExpressionStatement") return;
    line2 = line2.expression;
    if ((line2.type != "AssignmentExpression") && (line2.type != "UpdateExpression")) return;

    // We have a certain type of control flow loop. Rewrite it so that exceptions are not
    // repeatedly thrown.
    //console.log("----");
    //console.log(JSON.stringify(val, null, 2));
    r = require("./patches/except_while_loop.js")(val);
    //console.log("REWRITE CONTROL!!");
    //console.log(JSON.stringify(r, null, 2));
    //console.log(escodegen.generate(r));
    return r;
};

module.exports = {
    rewriteSimpleWaitLoop,
    rewriteSimpleControlLoop,
};
