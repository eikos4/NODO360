/**
 * Sec-MS-GEC v2 for Edge Read Aloud.
 * Microsoft rejects the legacy SHA-256 token (403) since October 2026.
 * Port of edge-tts drm.py / hs-CN/msedge-tts drm.rs.
 */

const WIN_EPOCH = 11_644_473_600n;
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];
const SHA256_STATE = [
  0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a, 0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2,
];
const SHA256_SCHEDULE = [
  0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba, 0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6,
  0xf0c31573, 0x7058ce4e, 0x7188e606, 0x00e5ab33, 0xd258b060, 0x72766564,
];
const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const SHA256_ADJUSTMENT = 0xc9dc06a7;
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80;
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0;
const SHA256_BLOCK_CONSTANTS = [
  ...SHA256_ROUND_CONSTANTS.slice(0, 14),
  SHA256_ADJUSTMENT,
  ...SHA256_ROUND_CONSTANTS.slice(15),
];
const CS64_COEFFICIENTS: Array<[number, number]> = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
];
const CS64_FACTOR = 0x82893933;
const CS64_ADJUSTMENT0 = 0xf2f90b1a;
const CS64_ADJUSTMENT1 = 0x0b1a0000;

const u32 = (n: number) => n >>> 0;
const add = (a: number, b: number) => u32(a + b);
const mul = (a: number, b: number) => Math.imul(a, b) >>> 0;
const rol16 = (value: number) => ((value << 16) | (value >>> 16)) >>> 0;
const sigma0 = (value: number) =>
  u32((value >>> 7) ^ (value << 25) ^ (value >>> 18) ^ (value << 14) ^ (value >>> 3));
const sigma1 = (value: number) =>
  u32((value >>> 17) ^ (value << 15) ^ (value >>> 19) ^ (value << 13) ^ (value >>> 10));
const ch = (x: number, y: number, z: number) => z ^ (x & (y ^ z));
const maj = (x: number, y: number, z: number) => (x & y) | (z & (x | y));
const bigSigmaE = (x: number) =>
  u32((x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7));
const bigSigmaA = (x: number) =>
  u32((x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10));

function wordsLe4Even(data: Uint8Array): number[] {
  const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4);
  Buffer.from(data).copy(padded);
  const words: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    words.push(padded.readUInt32LE(i));
  }
  if (words.length % 2) words.push(0);
  return words;
}

function sha256Rounds(state: number[], words: number[], firstRound: number): number[] {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  const aligned = Math.min(64, Math.ceil(firstRound / 8) * 8);
  let index = firstRound;
  while (index < aligned) {
    const t1 = add(add(add(add(h, bigSigmaE(e)), ch(e, f, g)), constants[index]), words[index]);
    const t2 = add(bigSigmaA(a), maj(a, b, c));
    [a, b, c, d, e, f, g, h] = [add(t1, t2), a, b, c, add(d, t1), e, f, g];
    index += 1;
  }
  while (index < 64) {
    let t1 = add(add(add(add(h, bigSigmaE(e)), ch(e, f, g)), constants[index]), words[index]);
    d = add(d, t1);
    h = add(add(t1, bigSigmaA(a)), maj(a, b, c));

    t1 = add(add(add(add(g, bigSigmaE(d)), ch(d, e, f)), constants[index + 1]), words[index + 1]);
    c = add(c, t1);
    g = add(add(t1, bigSigmaA(h)), maj(h, a, b));

    t1 = add(add(add(add(f, bigSigmaE(c)), ch(c, d, e)), constants[index + 2]), words[index + 2]);
    b = add(b, t1);
    f = add(add(t1, bigSigmaA(g)), maj(g, h, a));

    t1 = add(add(add(add(e, bigSigmaE(b)), ch(b, c, d)), constants[index + 3]), words[index + 3]);
    a = add(a, t1);
    e = add(add(t1, bigSigmaA(f)), maj(f, g, h));

    t1 = add(add(add(add(d, bigSigmaE(a)), ch(a, b, c)), constants[index + 4]), words[index + 4]);
    h = add(h, t1);
    d = add(add(t1, bigSigmaA(e)), maj(e, f, g));

    t1 = add(add(add(add(c, bigSigmaE(h)), ch(h, a, b)), constants[index + 5]), words[index + 5]);
    g = add(g, t1);
    c = add(add(t1, bigSigmaA(d)), maj(d, e, f));

    t1 = add(add(add(add(b, bigSigmaE(g)), ch(g, h, a)), constants[index + 6]), words[index + 6]);
    f = add(f, t1);
    b = add(add(t1, bigSigmaA(c)), maj(c, d, e));

    t1 = add(add(add(add(a, bigSigmaE(f)), ch(f, g, h)), constants[index + 7]), words[index + 7]);
    e = add(e, t1);
    a = add(add(t1, bigSigmaA(b)), maj(b, c, d));
    index += 8;
  }
  return [a, b, c, d, e, f, g, h];
}

function expandSha256Schedule(words: number[], firstWord: number) {
  for (let index = firstWord; index < 64; index += 1) {
    words.push(add(add(add(sigma1(words[index - 2]), words[index - 7]), sigma0(words[index - 15])), words[index - 16]));
  }
}

function sha256Init(data: Uint8Array): number[] {
  const words = new Array<number>(16).fill(0);
  words[14] = ((data[0] << 16) | (data[1] << 8) | data[2]) >>> 0;
  words[15] = ((data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6]) >>> 0;

  for (let index = 16; index < 30; index += 1) {
    let value = SHA256_SCHEDULE[index - 16];
    if (index - 2 >= 14) {
      const s = sigma1(words[index - 2]);
      value = add(value, index === 16 ? s ^ SHA256_SIGMA1_ADJUSTMENT : s);
    }
    if (index - 7 >= 14) value = add(value, words[index - 7]);
    if (index - 15 >= 14) {
      const s = sigma0(words[index - 15]);
      value = add(value, index === 29 ? s ^ SHA256_SIGMA0_ADJUSTMENT : s);
    }
    words.push(value);
  }

  words.push(
    u32(
      sigma1(words[28]) +
        words[23] +
        sigma0(words[15]) +
        words[14] +
        SHA256_ADJUSTMENT -
        SHA256_ROUND_CONSTANTS[14],
    ),
  );
  expandSha256Schedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((item, i) => add(item, working[i]));
}

function sha256Digest(data: Uint8Array): Buffer {
  const length = 57 + data.length;
  const paddedParts = [data.subarray(7), Buffer.from([0x80])];
  const zeros = (((55 - length) % 64) + 64) % 64;
  if (zeros) paddedParts.push(Buffer.alloc(zeros));
  const bitLen = Buffer.alloc(8);
  bitLen.writeBigUInt64BE(BigInt(length) * 8n);
  paddedParts.push(bitLen);
  const padded = Buffer.concat(paddedParts);

  let state = sha256Init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words: number[] = [];
    for (let i = 0; i < 16; i += 1) {
      words.push(padded.readUInt32BE(offset + i * 4));
    }
    expandSha256Schedule(words, 16);
    const working = sha256Rounds(state, words, 0);
    state = state.map((item, i) => add(item, working[i]));
  }

  const digest = Buffer.alloc(32);
  state.forEach((word, i) => digest.writeUInt32BE(word >>> 0, i * 4));
  return digest;
}

function cs64Digest(data: Uint8Array, digest: Buffer): [number, number] {
  const keyA = (digest.readUInt32LE(0) | 1) >>> 0;
  const keyB = (digest.readUInt32LE(4) | 1) >>> 0;
  const factors = [mul(keyA, CS64_FACTOR), mul(keyB, CS64_FACTOR)];
  const terms = CS64_COEFFICIENTS.map(([coefficient], index) => mul(coefficient, factors[index % 2]));
  const offsets = CS64_COEFFICIENTS.map(([, offset]) => offset);

  const input = Buffer.concat([Buffer.from([0]), Buffer.from(data)]);
  wordsLe4Even(input).forEach((word, index) => {
    let term = mul(word, index % 2 === 0 ? keyA : keyB);
    let offset = mul(rol16(word), index % 2 === 0 ? 0xef0569fb : 0xc31713db);
    if (index === 0) {
      term = add(term, mul(CS64_ADJUSTMENT0, factors[0]));
      offset = add(offset, CS64_ADJUSTMENT1);
    }
    terms.push(term);
    offsets.push(offset);
  });

  let swapAcc = 0;
  let swapLast = 0;
  let state = 0;
  let acc = 0;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];
    let t = rol16(add(offsets[index], x));
    let q = mul(t, 0x76f50f34);
    swapAcc = add(swapAcc, add(mul(rol16(q), 0xc3efea97), q));
    t = rol16(add(offsets[index + 1], y));
    q = mul(t, 0x1881ce3c);
    swapLast = add(mul(rol16(q), 0x35bd1ec9), q);
    swapAcc = add(swapAcc, swapLast);

    state = add(mul(state, keyA), x);
    state = mul(rol16(state), 0xcf98b111);
    state = mul(rol16(state), 0x87085b9f);
    state = mul(rol16(state), 0x12ceb96d);
    state = mul(rol16(state), 0x257e1d83);
    acc = add(acc, state);

    t = add(mul(state, keyB), y);
    t = mul(rol16(t), 0xa27416f5);
    t = mul(rol16(t), 0xd38396ff);
    state = mul(rol16(mul(rol16(t), 0x7c932b89)), 0xbfa49f69);
    acc = add(acc, state);
  }
  return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0];
}

function tokenHash(data: Uint8Array): [string, string] {
  const digest = sha256Digest(data);
  const [lo, hi] = cs64Digest(data, digest);
  const cs64 = Buffer.alloc(8);
  cs64.writeUInt32LE(lo, 0);
  cs64.writeUInt32LE(hi, 4);
  return [cs64.toString('hex').toUpperCase(), digest.toString('hex').toUpperCase()];
}

export function generateSecMsGecV2(trustedClientToken = TRUSTED_CLIENT_TOKEN, clockOffsetMs = 0): string {
  const unixSec = Math.floor((Date.now() + clockOffsetMs) / 1000);
  let ticks = BigInt(unixSec) + WIN_EPOCH;
  ticks -= ticks % 300n;
  ticks *= 10_000_000n;
  const payload = Buffer.from(`${ticks.toString()}${trustedClientToken}`, 'ascii');
  const [cs64, sha256] = tokenHash(payload);
  return `${cs64}-${sha256}`;
}

export const EDGE_GEC_VERSION = '2-155.0.4283.45';
export const EDGE_TRUSTED_CLIENT_TOKEN = TRUSTED_CLIENT_TOKEN;
