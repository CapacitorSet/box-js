module.exports = (args) => ({
	type: "CallExpression",
	callee: {
		type: "Identifier",
		name: "eval",
	},
	arguments: [
		{
			type: "CallExpression",
			callee: {
				type: "Identifier",
				name: "rewrite",
			},
			arguments: [
				...args,
				{
					"type": "Literal",
					"value": true,
					"raw": "true"
				}
			],
		},
	],
});