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

function GenSimpleLoop(fexpr) {

    // First just run the loop once to trigger the exception.
    var oldBody = fexpr.body;
    var tryStmt = oldBody.body[0];
    
    // Do function calls only for defined entries in an array.
    var tryBody = oldBody.body[0].block.body;
    if (Array.isArray(tryBody)) {
        tryBody = tryBody[0];
    }
    if ((tryBody.type == "ExpressionStatement") && (tryBody.expression.type == "AssignmentExpression")) {
        tryBody = tryBody.expression.right;
    }    
    var arrayAcc = "";
    if (typeof(tryBody.expression) != "undefined") {
        arrayAcc = tryBody.expression.callee;
    }
    else {
        arrayAcc = tryBody.callee;
    }
    var undef = {
        type: "Identifier",
        name: "undefined"
    };
    var ifTest = MakeBinaryExpression(arrayAcc, undef, "!=");
    var funcCall = tryBody;
    var newIf = MakeIfThen(ifTest, funcCall);

    // In new loop body do guarded call followed by existing var update.
    var loopBody = {
        type: "BlockStatement",
        body: [newIf, oldBody.body[1]]
    };
    var newLoop = {
        type: "WhileStatement",
        test: fexpr.test,
        body: loopBody
    };

    // Put it all together.
    var r = {
        type: "BlockStatement",
        body: [tryStmt, newLoop]
    };
    return r;
};

module.exports = (fexpr) => (GenSimpleLoop(fexpr));
