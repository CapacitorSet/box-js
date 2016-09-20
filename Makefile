decoder: decoder.c
	cc decoder.c -o decoder

docs: flags.json
	node update-docs