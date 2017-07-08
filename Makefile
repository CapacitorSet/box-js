make: decoder README.md
docs: README.md

decoder: decoder.c
	cc decoder.c -o decoder

README.md: flags.json
	node update-docs