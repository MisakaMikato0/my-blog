/**
 * Pure TypeScript MD5 (RFC 1321) — Cloudflare Workers 兼容。
 * 不依赖 node:crypto / WebCrypto（WebCrypto 不支持 MD5）。
 * 实现参考公共领域实现（Paul Johnston / Joseph Myers 风格）。
 */

const HEX_CHARS = "0123456789abcdef";

const S = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
	9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
	16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
	21,
];

const K = [
	0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
	0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
	0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
	0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
	0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
	0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
	0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
	0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
	0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
	0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
	0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

function rotl(x: number, c: number): number {
	return ((x << c) | (x >>> (32 - c))) >>> 0;
}

function toUtf8Bytes(str: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code >= 0xd800 && code <= 0xdbff) {
			// 代理对
			const next = str.charCodeAt(i + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
				bytes.push(
					0xf0 | (cp >> 18),
					0x80 | ((cp >> 12) & 0x3f),
					0x80 | ((cp >> 6) & 0x3f),
					0x80 | (cp & 0x3f),
				);
				i++;
			} else {
				bytes.push(0xef, 0xbf, 0xbd); // U+FFFD
			}
		} else if (code < 0x10000) {
			bytes.push(
				0xe0 | (code >> 12),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		} else {
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}
	return bytes;
}

/**
 * 计算 UTF-8 字符串的 MD5（小写十六进制）。
 */
export function md5(input: string): string {
	const bytes = toUtf8Bytes(input);
	const bitLenLow = (bytes.length * 8) >>> 0;
	const bitLenHigh = Math.floor(bytes.length / 0x20000000);

	const data = bytes.slice();
	data.push(0x80);
	while (data.length % 64 !== 56) data.push(0);
	// 追加 64 位小端长度
	for (let i = 0; i < 4; i++) data.push((bitLenLow >>> (8 * i)) & 0xff);
	for (let i = 0; i < 4; i++) data.push((bitLenHigh >>> (8 * i)) & 0xff);

	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;

	const m = new Array<number>(16);
	for (let offset = 0; offset < data.length; offset += 64) {
		for (let i = 0; i < 16; i++) {
			const j = offset + i * 4;
			m[i] =
				data[j] |
				(data[j + 1] << 8) |
				(data[j + 2] << 16) |
				(data[j + 3] << 24);
		}

		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;

		for (let i = 0; i < 64; i++) {
			let f: number;
			let g: number;
			if (i < 16) {
				f = (b & c) | (~b & d);
				g = i;
			} else if (i < 32) {
				f = (d & b) | (~d & c);
				g = (5 * i + 1) % 16;
			} else if (i < 48) {
				f = b ^ c ^ d;
				g = (3 * i + 5) % 16;
			} else {
				f = c ^ (b | ~d);
				g = (7 * i) % 16;
			}

			const tmp = d;
			d = c;
			c = b;
			b = (b + rotl((a + f + K[i] + m[g]) | 0, S[i])) | 0;
			a = tmp;
		}

		a0 = (a0 + a) | 0;
		b0 = (b0 + b) | 0;
		c0 = (c0 + c) | 0;
		d0 = (d0 + d) | 0;
	}

	let result = "";
	for (const w of [a0, b0, c0, d0]) {
		for (let i = 0; i < 4; i++) {
			const byte = (w >>> (8 * i)) & 0xff;
			result += HEX_CHARS[byte >>> 4] + HEX_CHARS[byte & 0x0f];
		}
	}
	return result;
}
