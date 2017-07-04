/**********************************************************************/
/* scrdec.c - Decoder for Microsoft Script Encoder                    */
/* Version 1.8                                                        */
/*                                                                    */
/* COPYRIGHT:                                                         */
/* (c)2000-2005 MrBrownstone, mrbrownstone@ virtualconspiracy.com     */
/* v1.8 Now correctly decodes characters 0x00-0x1F, thanks to 'Zed'   */
/* v1.7 Bypassed new HTMLGuardian protection and added -dumb switch   */
/*       to disable this                                              */
/* v1.6 Added HTML Decode option (-htmldec)                           */
/* v1.5 Bypassed a cleaver trick defeating this tool                  */
/* v1.4 Some changes by Joe Steele to correct minor stuff             */
/*                                                                    */
/* DISCLAIMER:                                                        */
/* This program is for demonstrative and educational purposes only.   */
/* Use of this program is at your own risk. The author cannot be held */
/* responsible if any laws are broken by use of this program.         */
/*                                                                    */
/* If you use or distribute this code, this message should be held    */
/* intact. Also, any program based upon this code should display the  */
/* copyright message and the disclaimer.                              */
/**********************************************************************/

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define LEN_OUTBUF 64
#define LEN_INBUF 1024

#define STATE_INIT_COPY		100
#define STATE_COPY_INPUT	101
#define STATE_SKIP_ML		102
#define STATE_CHECKSUM		103
#define STATE_READLEN		104
#define STATE_DECODE		105
#define STATE_UNESCAPE		106
#define STATE_FLUSHING		107
#define STATE_DBCS			108
#define STATE_INIT_READLEN	109
#define STATE_URLENCODE_1	110
#define STATE_URLENCODE_2	111
#define STATE_WAIT_FOR_CLOSE 112
#define STATE_WAIT_FOR_OPEN 113
#define STATE_HTMLENCODE	114

unsigned char rawData[292] = {
        0x64,0x37,0x69, 0x50,0x7E,0x2C, 0x22,0x5A,0x65, 0x4A,0x45,0x72, 
        0x61,0x3A,0x5B, 0x5E,0x79,0x66, 0x5D,0x59,0x75, 0x5B,0x27,0x4C, 
        0x42,0x76,0x45, 0x60,0x63,0x76, 0x23,0x62,0x2A, 0x65,0x4D,0x43, 
        0x5F,0x51,0x33, 0x7E,0x53,0x42, 0x4F,0x52,0x20, 0x52,0x20,0x63, 
        0x7A,0x26,0x4A, 0x21,0x54,0x5A, 0x46,0x71,0x38, 0x20,0x2B,0x79, 
        0x26,0x66,0x32, 0x63,0x2A,0x57, 0x2A,0x58,0x6C, 0x76,0x7F,0x2B, 
        0x47,0x7B,0x46, 0x25,0x30,0x52, 0x2C,0x31,0x4F, 0x29,0x6C,0x3D, 
        0x69,0x49,0x70, 0x3F,0x3F,0x3F, 0x27,0x78,0x7B, 0x3F,0x3F,0x3F, 
        0x67,0x5F,0x51, 0x3F,0x3F,0x3F, 0x62,0x29,0x7A, 0x41,0x24,0x7E, 
        0x5A,0x2F,0x3B, 0x66,0x39,0x47, 0x32,0x33,0x41, 0x73,0x6F,0x77, 
        0x4D,0x21,0x56, 0x43,0x75,0x5F, 0x71,0x28,0x26, 0x39,0x42,0x78, 
        0x7C,0x46,0x6E, 0x53,0x4A,0x64, 0x48,0x5C,0x74, 0x31,0x48,0x67, 
        0x72,0x36,0x7D, 0x6E,0x4B,0x68, 0x70,0x7D,0x35, 0x49,0x5D,0x22, 
        0x3F,0x6A,0x55, 0x4B,0x50,0x3A, 0x6A,0x69,0x60, 0x2E,0x23,0x6A, 
        0x7F,0x09,0x71, 0x28,0x70,0x6F, 0x35,0x65,0x49, 0x7D,0x74,0x5C, 
        0x24,0x2C,0x5D, 0x2D,0x77,0x27, 0x54,0x44,0x59, 0x37,0x3F,0x25, 
        0x7B,0x6D,0x7C, 0x3D,0x7C,0x23, 0x6C,0x43,0x6D, 0x34,0x38,0x28, 
        0x6D,0x5E,0x31, 0x4E,0x5B,0x39, 0x2B,0x6E,0x7F, 0x30,0x57,0x36, 
        0x6F,0x4C,0x54, 0x74,0x34,0x34, 0x6B,0x72,0x62, 0x4C,0x25,0x4E, 
        0x33,0x56,0x30, 0x56,0x73,0x5E, 0x3A,0x68,0x73, 0x78,0x55,0x09, 
        0x57,0x47,0x4B, 0x77,0x32,0x61, 0x3B,0x35,0x24, 0x44,0x2E,0x4D, 
        0x2F,0x64,0x6B, 0x59,0x4F,0x44, 0x45,0x3B,0x21, 0x5C,0x2D,0x37, 
        0x68,0x41,0x53, 0x36,0x61,0x58, 0x58,0x7A,0x48, 0x79,0x22,0x2E, 
        0x09,0x60,0x50, 0x75,0x6B,0x2D, 0x38,0x4E,0x29, 0x55,0x3D,0x3F,
		0x51,0x67,0x2f
} ;

const unsigned char pick_encoding[64] = {
1, 2, 0, 1, 2, 0, 2, 0, 0, 2, 0, 2, 1, 0, 2, 0, 
1, 0, 2, 0, 1, 1, 2, 0, 0, 2, 1, 0, 2, 0, 0, 2, 
1, 1, 0, 2, 0, 2, 0, 1, 0, 1, 1, 2, 0, 1, 0, 2, 
1, 0, 2, 0, 1, 1, 2, 0, 0, 1, 1, 2, 0, 1, 0, 2
};

unsigned char transformed[3][127];
int digits[0x7a];

int urlencoded = 0;
int htmlencoded = 0;
int verbose = 0;
int smart = 1;

unsigned char unescape (unsigned char c)
{
	static unsigned char escapes[] = "#&!*$";
	static unsigned char escaped[] = "\r\n<>@";
	int i=0;

	if (c > 127)
		return c;
	while (escapes[i])
	{
		if (escapes[i] == c)
			return escaped[i];
		i++;
	}	
	return '?';
}

void maketrans (void)
{
	int i, j;

	for (i=0; i<32; i++)
		for (j=0; j<3; j++) 
			transformed[j][i] = i;

	for (i=31; i<=127; i++)
		for (j=0; j<3; j++) 
			transformed[j][rawData[(i-31)*3 + j]] = (i==31) ? 9 : i;
}

void makedigits (void)
{
	int i;

	for (i=0; i<26; i++)
	{
		digits['A'+i] = i;
		digits['a'+i] = i+26;
	}
	for (i=0; i<10; i++)
		digits['0'+i] = i+52;
	digits[0x2b] = 62;
	digits[0x2f] = 63;
}

unsigned long int decodeBase64 (unsigned char *p)
{
	unsigned long int val = 0;

	val +=  (digits[p[0]] << 2);
	val +=  (digits[p[1]] >> 4);
	val +=  (digits[p[1]] & 0xf) << 12;
	val += ((digits[p[2]] >> 2) << 8); 
	val += ((digits[p[2]] & 0x3) << 22);
	val +=  (digits[p[3]] << 16);
	val += ((digits[p[4]] << 2) << 24);
	val += ((digits[p[5]] >> 4) << 24);

	/* 543210 543210 543210 543210 543210 543210

	   765432 
	          10
	                 ba98
	            fedc
	                     76
	                        543210
                                   fedcba 98----
       |- LSB -||-     -||-     -| |- MSB -|
	*/
	return val;
}

/*
 Char. number range  |        UTF-8 octet sequence
      (hexadecimal)    |              (binary)
   --------------------+---------------------------------------------
   0000 0000-0000 007F | 0xxxxxxx
   0000 0080-0000 07FF | 110xxxxx 10xxxxxx
   0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
   0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
*/

int isLeadByte (unsigned int cp, unsigned char ucByte)
{
	/* Code page 932 - Japanese Shift-JIS       - 0x81-0x9f 
	                                              0xe0-0xfc 
                 936 - Simplified Chinese GBK   - 0xa1-0xfe
	             949 - Korean Wansung           - 0x81-0xfe
				 950 - Traditional Chinese Big5 - 0x81-0xfe 
	            1361 - Korean Johab             - 0x84-0xd3 
												  0xd9-0xde
												  0xe0-0xf9 */
	switch (cp)
	{
		case 932:
			if ((ucByte > 0x80) && (ucByte < 0xa0))	return 1;
			if ((ucByte > 0xdf) && (ucByte < 0xfd))	return 1;
			else return 0;
		case 936:
			if ((ucByte > 0xa0) && (ucByte < 0xff)) return 1;
			else return 0;
		case 949:
		case 950:
			if ((ucByte > 0x80) && (ucByte < 0xff)) return 1;
			else return 0;
		case 1361:
			if ((ucByte > 0x83) && (ucByte < 0xd4)) return 1;
			if ((ucByte > 0xd8) && (ucByte < 0xdf)) return 1;
			if ((ucByte > 0xdf) && (ucByte < 0xfa)) return 1;
			else return 0;
		default:
			return 0;
	}

}


struct entitymap {
	char *entity;
	char mappedchar;
};

struct entitymap entities[] = {
	{"excl",33},{"quot",34},{"num",35},{"dollar",36},{"percent",37},
	{"amp",38},{"apos",39},{"lpar",40},{"rpar",41},{"ast",42},
	{"plus",43},{"comma",44},{"period",46},{"colon",58},{"semi",59},
	{"lt",60},{"equals",61},{"gt",62},{"quest",63},{"commat",64},
	{"lsqb",91},{"rsqb",93},{"lowbar",95},{"lcub",123},{"verbar",124},
	{"rcub",125},{"tilde",126}, {NULL, 0}
};


char decodeMnemonic ( unsigned char *mnemonic)
{
	int i=0;
	while (entities[i].entity != NULL)
	{
		if (strcmp(entities[i].entity, mnemonic)==0)
			return entities[i].mappedchar;
		i++;
	}
	printf ("Warning: did not recognize HTML entity '%s'\n", mnemonic);
	return '?';
}

int ScriptDecoder (unsigned char *inname, unsigned char *outname, unsigned int cp)
{
	unsigned char inbuf[LEN_INBUF+1];
	unsigned char outbuf[LEN_OUTBUF+1];
	unsigned char c, c1, c2, lenbuf[7], csbuf[7], htmldec[8];
	unsigned char marker[] = "#@~^";
	int ustate, nextstate, state = 0;
	int i, j, k, m, ml, hd = 0;
	int utf8 = 0;
	unsigned long int csum = 0, len = 0;
	FILE *infile, *outfile;

	infile = fopen ((const char*)inname, "rb");
	outfile = fopen ((const char*)outname, "wb");
	if (!infile || !outfile)
	{
		printf ("Error opening file!\n");
		return 10;
	}
	
	maketrans();
	makedigits();
	memset (inbuf, 0, sizeof (inbuf));
	memset (outbuf, 0, sizeof (outbuf));
	memset (lenbuf, 0, sizeof (lenbuf));
	
	state = STATE_INIT_COPY;
	i = 0;
	j = 0;

	while (state)
	{
		if (inbuf[i] == 0)
		{
			if (feof (infile))
			{
				if (len) 
				{
					printf ("Error: Premature end of file.\n");
					if (utf8>0)
						printf ("Tip: The file seems to contain special characters, try the -cp option.\n");
				}
				break;
			}

			memset (inbuf, 0, sizeof (inbuf));
			fgets ((char*)inbuf, LEN_INBUF, infile);
			i = 0;
			continue;
		}

		if (j == LEN_OUTBUF)
		{
			fwrite (outbuf, sizeof(char), j, outfile);
			j = 0;
		}

		if ((urlencoded==1) && (inbuf[i]=='%'))
		{
			ustate = state;				/* save state */
			state = STATE_URLENCODE_1;	/* enter decoding state */
			i++;						/* flush char */
			continue;
		}

		/* 2 means we do urldecoding but wanted to avoid decoding an
			already decoded % for the second time */

		if (urlencoded==2)
			urlencoded=1;
		
		if ((htmlencoded==1) && (inbuf[i]=='&'))
		{
			ustate = state;
			state = STATE_HTMLENCODE;
			hd = 0;
			i++;
			continue;
		}

		/* 2 means we do htmldecoding but wanted to avoid decoding an
			already decoded & for the second time */

		if (htmlencoded==2)
			htmlencoded=1;

		switch (state)
		{
			case STATE_INIT_COPY: 
				ml = strlen ((const char*)marker);
				m = 0;
				state = STATE_COPY_INPUT;
				break;

			/* after decoding a block, we have to wait for the current 
			   script block to be closed (>) */
		
			case STATE_WAIT_FOR_CLOSE:
				if (inbuf[i] == '>')
					state = STATE_WAIT_FOR_OPEN;
				outbuf[j++] = inbuf[i++];
				break;

			/* and a new block to be opened again (<) */
			case STATE_WAIT_FOR_OPEN:
				if (inbuf[i] == '<')
					state = STATE_INIT_COPY;
				outbuf[j++] = inbuf[i++];
				break;

			case STATE_COPY_INPUT:
				if (inbuf[i] == marker[m])
				{
					i++;
					m++;
				}
				else
				{
					if (m)
					{
						k = 0;
						state = STATE_FLUSHING;
					}
					else
						outbuf[j++] = inbuf[i++];

				}
				if (m == ml)
					state = STATE_INIT_READLEN;
				break;

			case STATE_FLUSHING:
				outbuf[j++] = marker[k++];
				m--;
				if (m==0)
					state = STATE_COPY_INPUT;
				break;
			
			case STATE_SKIP_ML: 
				i++;
				if (!(--ml))
					state = nextstate;
				break;


			case STATE_INIT_READLEN: 
				ml = 6;
				state = STATE_READLEN;
				break;

			case STATE_READLEN: 
				lenbuf[6-ml] = inbuf[i++];
				if (!(--ml))
				{
					len = decodeBase64 (lenbuf);
					if (verbose)
						printf ("Msg: Found encoded block containing %lu characters.\n", len);
					m = 0;
					ml = 2;
					state = STATE_SKIP_ML;
					nextstate = STATE_DECODE;
				}
				break;

			case STATE_DECODE: 
				if (!len)
				{
					ml = 6;
					state = STATE_CHECKSUM;
					break;
				}
				if (inbuf[i] == '@') 
					state = STATE_UNESCAPE;
				else
				{
					if ((inbuf[i] & 0x80) == 0)
					{
						outbuf[j++] = c = transformed[pick_encoding[m%64]][inbuf[i]];
						csum += c;
						m++;
					}
					else 
					{
						if (!cp && (inbuf[i] & 0xc0)== 0x80) 
						{
							// utf-8 but not a start byte
							len++;
							utf8=1;
						}
						outbuf[j++] = inbuf[i];
						if ((cp) && (isLeadByte (cp,inbuf[i])))
							state = STATE_DBCS;
					}
				}
				i++;
				len--;
				break;

			case STATE_DBCS:
				outbuf[j++] = inbuf[i++];
				state = STATE_DECODE;
				break;
				
			case STATE_UNESCAPE: 
				outbuf[j++] = c = unescape (inbuf[i++]);
				csum += c;
				len--;
				m++;
				state = STATE_DECODE;
				break;

			case STATE_CHECKSUM: 
				csbuf[6-ml] = inbuf[i++];
				if (!(--ml))
				{
					csum -= decodeBase64 (csbuf);
					if (csum)
					{
						printf ("Error: Incorrect checksum! (%lu)\n", csum);
						if (cp)
							printf ("Tip: Maybe try another codepage.\n");
						else
						{
							if (utf8>0)
								printf ("Tip: The file seems to contain special characters, try the -cp option.\n");
							else
								printf ("Tip: the file may be corrupted.\n");
						}
						csum=0;
					}
					else 
					{
						if (verbose)
							printf ("Msg: Checksum OK\n");
					}
					m = 0;
					ml = 6;
					state = STATE_SKIP_ML;
					if (smart)
	 					nextstate = STATE_WAIT_FOR_CLOSE;
					else 
						nextstate = STATE_INIT_COPY;
				}
				break;

			/* urlencoded, the first character */
			case STATE_URLENCODE_1:
				c1 = inbuf[i++] - 0x30;
				if (c1 > 0x9) c1-= 0x07;
				if (c1 > 0x10) c1-= 0x20;
				state = STATE_URLENCODE_2;
				break;

			/* urlencoded, second character */
			case STATE_URLENCODE_2:
				c2 = inbuf[i] - 0x30;
				if (c2 > 0x9) c2-= 0x07;
				if (c2 > 0x10) c2-= 0x20;
				inbuf[i] = c2 + (c1<<4);	/* copy decoded char back on input */
				urlencoded=2;				/* avoid looping in case this was an % */
				state = ustate;				/* restore old state */
				break;

			/* htmlencoded */
			case STATE_HTMLENCODE:
				c1 = inbuf[i];
				if (c1 != ';')
				{
					i++;
					htmldec[hd++] = c1;
					if (hd>7)
					{
						htmldec[7]=0;
						printf ("Error: HTML decode encountered a too long mnemonic (%s...)\n", htmldec);
						exit(10);
					}
				}
				else /* ';' = end of mnemonic */
				{
					htmldec[hd] = 0;
					inbuf[i] = decodeMnemonic (htmldec); /* skip the & */
					htmlencoded = 2;		/* avoid looping in case of & */
					state = ustate;
				}
				break;
			default:
				printf ("Internal Error: Invalid state: %d\n", state);
				break;
		}
	}
	
	fwrite (outbuf, sizeof (char), j, outfile);
	fclose (infile);
	fclose (outfile);
	return 0;
}


int main (int argc, char **argv)
{
	int i, cp = 0;

	if (argc < 3)
	{
		puts ("ScrDec v1.8 - Decoder for Microsoft Script Encoder\n"
			"(c)2000-2005 MrBrownstone, mrbrownstone@ virtualconspiracy.com\n"
			"Home page: http://www.virtualconspiracy.com/scrdec.html\n\n"
			"Usage: scrdec18 <infile> <outfile> [-cp codepage] [-urldec|-htmldec]\n"
			"  [-verbose] [-dumb]\n\n"
			"Code pages can be 932 - Japanese\n"
			"                  936 - Chinese (Simplified)\n"
			"                  950 - Chinese (Traditional)\n"
			"                  949 - Korean (Wansung)\n"
			"                 1361 - Korean (Johab)\n"
			"Any other code pages don't need to be specified.\n\n"
			"Use -urldec to unescape %xx style encoding on the fly, or\n"
			" -htmldec to unescape & style encoding.\n"
			"For extra information, add the -verbose switch\n"
			"You might not want to use the smart HTMLGuardian defeation mechanism.\n"
			"  In that case, add the -dumb switch.\n");
		return 10;
	}

	i=3;
	while (i<argc)
	{
		if (strcmp (argv[i], "-cp")==0)
		{
			i++;
			if (i<argc) cp = atoi (argv[i]);
			else
			{
				puts ("-cp should be followed by a code page identifier");
				return 10;
			}
		}
		else
		if (strcmp (argv[i], "-urldec")==0)
			urlencoded = 1;
		else
		if (strcmp (argv[i], "-htmldec")==0)
			htmlencoded = 1;
		else
		if (strcmp (argv[i], "-verbose")==0)
			verbose = 1;
		else
		if (strcmp (argv[i], "-dumb")==0)
			smart = 0;
		i++;
	}
	return ScriptDecoder ((unsigned char*)argv[1], (unsigned char*)argv[2], cp);
}
