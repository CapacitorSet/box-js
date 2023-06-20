/**
 * Acorn plugin which parses "member function statements" in JScript code e.g.
 * function Object.prototype.func(args) { }
 * 
 * Required by prototype.js patch
 */

// Needs to be revisited to work with Acorn 8.* plugin system.
// Check to see if this is handled natively by Acorn 8.*.
module.exports = function(acorn) {
    acorn.plugins.JScriptMemberFunctionStatement = function(parser) {
        parser.extend("parseFunction", function(base) {
            return function(node, isStatement, allowExpressionBody, isAsync) {
                /**
                 * If it's function statement and identifier is expected:
                 * 	set flag for next parseIdent call
                 **/
                if(this.type == acorn.tokTypes.name)
                {
                    this.isFuncStatementId = true;

                    // A bit dirty, but parsing statement is associated with additional checkLVal
                    let r = base.call(this, node, false, allowExpressionBody, isAsync);

                    // Recovering original node type
                    if(isStatement)
                        r.type = "FunctionDeclaration"
                    
                    return r
                }
                return base.apply(this, arguments);
            }
        });

        parser.extend("parseIdent", function(base) {
            return function() {
                let r = base.apply(this, arguments);
                if(this.isFuncStatementId)
                {
                    // Unset flag (allow recursion)
                    this.isFuncStatementId = false;

                    while(this.eat(acorn.tokTypes.dot))
                    {
                        /**
                         * For each dot successor - build MemberExpression
                         * Fortunately, JScript allows only dots as subscript separator in this case.
                         **/
                        r = {
                            type: "MemberExpression",
                            object: r,
                            property: this.parseIdent(),
                            computed: false
                        }
                    }
                }
                return r;
            }
        });
    }
}
