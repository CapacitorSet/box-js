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

    // 2 statements in the loop body? Could also have a useless
    // assignment statement.
    if (val.body.type != "BlockStatement") return;
    if ((val.body.body.length != 2) && (val.body.body.length != 3)) return;
    
    // Should have 1 increment statement and 1 try catch in the loop
    // body. Figure out which is which.
    var line1 = val.body.body[0];
    var line2 = val.body.body[1];
    var line3 = "??";
    if (val.body.body.length == 3) {
        line3 = val.body.body[2];
    }
    
    // Any loop body statement is a try/catch?
    if ((line1.type != "TryStatement") && (line2.type != "TryStatement") && (line3.type != "TryStatement")) return;
    // Any loop body statement an expression?
    if ((line1.type != "ExpressionStatement") && (line2.type != "ExpressionStatement") && (line3.type != "ExpressionStatement")) return;
    
    // Carve out the try/catch and the expression.
    var exceptBlock;
    var updateStmt;
    if (line1.type == "TryStatement") exceptBlock = line1;
    if (line2.type == "TryStatement") exceptBlock = line2;
    if (line3.type == "TryStatement") exceptBlock = line3;
    if (line1.type == "ExpressionStatement") updateStmt = line1;
    if (line2.type == "ExpressionStatement") updateStmt = line2;
    if (line3.type == "ExpressionStatement") updateStmt = line3;
    line1 = exceptBlock;
    line2 = updateStmt;
    
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
    var catch_line = exceptBlock.handler;
    if ((catch_line == undefined) || (catch_line.type != "CatchClause")) return;
    var catch_body = catch_line.body;
    if (catch_body.type != "BlockStatement") return;
    if ((catch_body.body.length != 1) && (catch_body.body.length != 2)) return;
    catch_body = catch_body.body[0];

    // Catch statement should be an assignment.
    if (catch_body.type != "ExpressionStatement") return;
    if (catch_body.expression.type != "AssignmentExpression") return;
    
    // 2nd loop body statement an assignment?
    if (line2.type != "ExpressionStatement") return;
    line2 = line2.expression;
    if ((line2.type != "AssignmentExpression") && (line2.type != "UpdateExpression")) return;
    
    // Is the expression statement in the loop body an update expression?
    if (typeof(line2.expression) !== "undefined") line2 = line2.expression;
    if ((line2.type != "AssignmentExpression") && (line2.type != "UpdateExpression")) return;
    
    // We have a certain type of control flow loop. Rewrite it so that exceptions are not
    // repeatedly thrown.
    //console.log("----");
    //console.log(JSON.stringify(val, null, 2));
    r = require("./patches/except_while_loop.js")(val, exceptBlock, updateStmt);
    //console.log("REWRITE CONTROL!!");
    //console.log(JSON.stringify(r, null, 2));
    //console.log(escodegen.generate(r));
    return r;
};

function rewriteLongWhileLoop(key, val) {
    if (!val) return;

    // TODO: Currently only rewriting while() loops like
    // 'while(true) { ...; if (val > BIG_NUMBER) break; }'.
    
    // While loop?
    if (val.type != "WhileStatement") return;

    // while(true) guard?
    if (escodegen.generate(val.test) !== "true") return;

    // Multiple statements in loop body?
    if (val.body.type != "BlockStatement") return;
    const body = val.body.body;
    
    // Look through each statement in the loop body for a if statement
    // like 'if (val > BIG_NUMBER) break;'.
    var newBody = [];
    var changed = false;
    for (i in body) {
        var currStatement = body[i];

        // Break if statement?
        if ((currStatement.type == "IfStatement") &&
            (currStatement.test.type == "BinaryExpression") &&
            (currStatement.test.operator == "==") &&
            (currStatement.consequent.type == "BreakStatement")) {
            
            // Checking to see if a variable is equal to a literal?
            left = currStatement.test.left
            right = currStatement.test.right
            var theVar;
            if (left.type == "Identifier") theVar = left;
            if (right.type == "Identifier") theVar = right;
            var theVal;
            if (left.type == "Literal") theVal = left;
            if (right.type == "Literal") theVal = right;

            // Is the value a big number?
            if ((typeof(theVar) !== "undefined") &&
                (typeof(theVal) !== "undefined") &&
                (theVal.value > 10000000)) {

                // Change the value being checked to a smaller number.
                currStatement = require("./patches/index_break_statement.js")(theVar, 1000000);
                changed = true;
            }
        }

        // How can nulls and functions show up??
        if ((!currStatement) || (typeof(currStatement) !== "object")) continue;

        // Save the (maybe) modified statement for the loop body.
        newBody.push(currStatement);
    }

    // Did we modify the loop body?
    if (!changed) return;

    // Set up the new loop body.
    val.body.body = newBody;
    //console.log("----");
    //console.log("REWRITE INDEX CHECK LOOP!!");
    //console.log(JSON.stringify(val, null, 2));
    //console.log(escodegen.generate(val));
    return val
}

module.exports = {
    rewriteSimpleWaitLoop,
    rewriteSimpleControlLoop,
    rewriteLongWhileLoop,
};
