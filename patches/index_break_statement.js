/*
'while (x < y) { x = x + z; }' becomes 'x = x + y * z;'

Additionally marked as a candidate to hoist.
Needs prototype-plugin enabled.
*/

/*
  For < loops, positive increment:
  final_loop_counter = upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1)

  For <= loops, positive increment:
  final_loop_counter = upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1) + Math.sign(!Math.sign((upper_bound-initial_loop_counter)%increment));
*/

function MakeNot(expr) {
    // {"type":"UnaryExpression","start":30,"end":32,"operator":"!","prefix":true,"argument":{"type":"Literal","start":31,"end":32,"value":1,"raw":"1"}}
    return {
        type: "UnaryExpression",
        operator: "!",
        argument: expr
    };
};

function MakeLiteral(value) {
    return {
        type: "Literal",
        value: value
    };
};

function MakeBinaryExpression(lhs, rhs, op) {
    // {"type":"BinaryExpression","start":30,"end":35,"left":{"type":"Identifier","start":30,"end":31,"name":"a"},"operator":"+","right":{"type":"Literal","start":34,"end":35,"value":1,"raw":"1"}}
    return {
        type: "BinaryExpression",
        left: lhs,
        right: rhs,
        operator: op
    };
};

function MakeMemberExpression(object, property, args) {
    /*
    {
        "type": "CallExpression",
        "callee": {
            "type": "MemberExpression",
            "object": {
                "type": "Identifier",
                "name": "Math"
            },
            "property": {
                "type": "Identifier",
                "name": "sign"
            },
            "computed": false
        },
        "arguments": [{
            "type": "Literal",
            "value": 12,
        }]
    }
     */
    return {
        type: "CallExpression",
        callee:{
            type: "MemberExpression",
            object: {type: "Identifier", name: object},
            property: {type: "Identifier", name: property},
        },
        arguments: args
    };
};

function MakeMathSign(upperBound, initialCounter, increment) {
    // Make Math.sign((upper_bound-initial_loop_counter)%increment)
    return {
        type: "CallExpression",
        callee: {
            type: "MemberExpression",
            object: {
                type: "Identifier",
                name: "Math"
            },
            property: {
                type: "Identifier",
                name: "sign"
            },
            computed: false
        },
        arguments: [{
            type: "BinaryExpression",
            left: {
                type: "BinaryExpression",
                left: upperBound,
                operator: "-",
                right: initialCounter
            },
            operator: "%",
            right: increment
        }]
    };
};

function PullIncrement(fexpr) {

    // Figure out if we have "x = x + z" or "x++".
    line = fexpr.body.body[0].expression;
    
    // Pull loop counter increment value from expression in loop body.
    var r;
    if (line.type == "AssignmentExpression") {
        var line = fexpr.body.body[0].expression;
        var baseExpr;
        var r;
        if (line.operator == "="){
            var rhs = line.right;
            if (rhs.left.name != fexpr.test.left.name) {
                baseExpr = rhs.left;
            }
            else {
                baseExpr = rhs.right;
            }
            r = baseExpr;
        }
        if (line.operator == "+="){
            r = line.right;
        };
    };

    if (line.type == "UpdateExpression") {
        r = MakeLiteral(1);
    };

    // Done.
    return r;
}

function PullLoopUpperBound(fexpr) {
    // Pull the upper bound from the while test.
    return fexpr.test.right;
}

function PullLoopCounter(fexpr) {

    // Pull the loop counter from the while test.
    return fexpr.test.left;
}

function GenFinalLoopVal(fexpr) {
    /*
      For < loops, positive increment:
      upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1)
      
      For <= loops, positive increment:
      upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1) + Math.sign(!Math.sign((upper_bound-initial_loop_counter)%increment));
    */
    var upperBound = PullLoopUpperBound(fexpr);
    var loopCounter = PullLoopCounter(fexpr);
    var increment = PullIncrement(fexpr);
    // upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1)
    var modExpr = MakeBinaryExpression(
        MakeMathSign(upperBound, loopCounter, increment),
        MakeBinaryExpression(increment, MakeLiteral(1), "-"),
        "*"
    );
    var r = MakeBinaryExpression(upperBound, modExpr, "+");
    if (fexpr.test.operator == "<=") {
        // !(Math.sign((y - x) % z) * (z - 1));
        // upper_bound + Math.sign((upper_bound-initial_loop_counter)%increment)*(increment-1) + Math.sign(!Math.sign((upper_bound-initial_loop_counter)%increment));
        var modExpr1 = MakeBinaryExpression(MakeBinaryExpression(upperBound, loopCounter, "-"), increment, "%");
        var p0 = MakeMemberExpression("Math", "sign", [modExpr1]);
        var p1 = MakeNot(p0);
        var p2 = MakeMemberExpression("Math", "sign", [p1]);
        r = MakeBinaryExpression(r, p2, "+");
    };
    return r;
}

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

function GenBreakIf(theVar, theVal) {
    const guard = MakeBinaryExpression(theVar, MakeLiteral(theVal), "==");
    const breakStatement = { type: "BreakStatement" };
    const r = MakeIfThen(guard, breakStatement);
    return r;
}

module.exports = (theVar, theVal) => (GenBreakIf(theVar, theVal));
