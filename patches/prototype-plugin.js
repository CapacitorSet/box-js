/**
 * Acorn plugin which parses "member function statements" in JScript code e.g.
 * function Object.prototype.func(args) { }
 * 
 * Required by prototype.js patch
 */

module.exports = function(acorn) {
    acorn.plugins.JScriptMemberFunctionStatement = function(parser) {
        parser.extend("parseFunction", function(base) {
            return function(node, isStatement, allowExpressionBody, isAsync) {
                /**
                 * If it's function statement and identifier is expected:
                 * 	set flag for next parseIdent call
                 **/
                if(isStatement && this.type == acorn.tokTypes.name)
                {
                    this.isFuncStatementId = true;
                    // A bit dirty, but parsing statement is assiociated with additional checkLVal
                    return base.call(this, node, false, allowExpressionBody, isAsync);
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