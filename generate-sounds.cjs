const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION = 15; // 15 seconds, will loop
const NUM_SAMPLES = SAMPLE_RATE * DURATION;

function writeWav(filename, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filename, buffer);
  console.log(`✅ ${path.basename(filename)} (${(buffer.length/1024).toFixed(0)} KB)`);
}

// 1. RAIN - layered brown noise with random droplets
function generateRain() {
  const samples = new Float64Array(NUM_SAMPLES);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise (Voss-McCartney approximation)
    b0 = 0.99886*b0 + white*0.0555179;
    b1 = 0.99332*b1 + white*0.0750759;
    b2 = 0.96900*b2 + white*0.1538520;
    b3 = 0.86650*b3 + white*0.3104856;
    b4 = 0.55000*b4 + white*0.5329522;
    b5 = -0.7616*b5 - white*0.0168980;
    let pink = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11;
    b6 = white * 0.115926;
    // Add random droplet clicks
    if (Math.random() < 0.0008) {
      const dropAmp = 0.1 + Math.random() * 0.15;
      const dropLen = Math.floor(80 + Math.random() * 200);
      for (let d = 0; d < dropLen && (i+d) < NUM_SAMPLES; d++) {
        const env = Math.exp(-d / (dropLen * 0.15));
        const freq = 2000 + Math.random() * 4000;
        samples[i+d] += Math.sin(2*Math.PI*freq*d/SAMPLE_RATE) * env * dropAmp;
      }
    }
    samples[i] += pink * 0.6;
    // Slow volume modulation (rain intensity variation)
    samples[i] *= 0.7 + 0.3 * Math.sin(2*Math.PI*i/(SAMPLE_RATE*8));
  }
  return samples;
}

// 2. CRICKETS - realistic chirp patterns with multiple voices + night ambiance
function generateCrickets() {
  const samples = new Float64Array(NUM_SAMPLES);
  // Background night hiss (very soft pink noise)
  let lb=0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const w = Math.random()*2-1;
    lb = lb*0.98 + w*0.02;
    samples[i] = lb * 0.08;
  }
  // Cricket voices
  const voices = [
    { freq: 4800, chirpRate: 7, chirpDur: 0.04, groupSize: 4, groupGap: 1.2, amp: 0.25 },
    { freq: 5200, chirpRate: 6, chirpDur: 0.035, groupSize: 3, groupGap: 1.8, amp: 0.18 },
    { freq: 4400, chirpRate: 8, chirpDur: 0.045, groupSize: 5, groupGap: 0.9, amp: 0.15 },
  ];
  voices.forEach(v => {
    const offset = Math.random() * SAMPLE_RATE * 2;
    const cycleSamples = Math.floor((v.groupSize / v.chirpRate + v.groupGap) * SAMPLE_RATE);
    const chirpSamples = Math.floor(v.chirpDur * SAMPLE_RATE);
    const chirpGap = Math.floor(SAMPLE_RATE / v.chirpRate);
    for (let pos = Math.floor(offset); pos < NUM_SAMPLES; pos += cycleSamples + Math.floor(Math.random()*SAMPLE_RATE*0.5)) {
      for (let c = 0; c < v.groupSize; c++) {
        const start = pos + c * chirpGap;
        for (let s = 0; s < chirpSamples && (start+s) < NUM_SAMPLES; s++) {
          const env = Math.sin(Math.PI * s / chirpSamples); // smooth envelope
          const freqMod = v.freq + Math.sin(s*0.1)*50; // slight vibrato
          samples[start+s] += Math.sin(2*Math.PI*freqMod*s/SAMPLE_RATE) * env * v.amp;
        }
      }
    }
  });
  return samples;
}

// 3. LULLABY - gentle music box melody with reverb
function generateLullaby() {
  const samples = new Float64Array(NUM_SAMPLES);
  // Twinkle Twinkle pattern (music box style)
  const melody = [
    {n:261.63,d:0.5},{n:261.63,d:0.5},{n:392.00,d:0.5},{n:392.00,d:0.5},
    {n:440.00,d:0.5},{n:440.00,d:0.5},{n:392.00,d:1.0},
    {n:349.23,d:0.5},{n:349.23,d:0.5},{n:329.63,d:0.5},{n:329.63,d:0.5},
    {n:293.66,d:0.5},{n:293.66,d:0.5},{n:261.63,d:1.0},
    {n:392.00,d:0.5},{n:392.00,d:0.5},{n:349.23,d:0.5},{n:349.23,d:0.5},
    {n:329.63,d:0.5},{n:329.63,d:0.5},{n:293.66,d:1.0},
  ];
  let pos = 0;
  const noteGap = 0.05;
  for (let rep = 0; rep < 3; rep++) {
    melody.forEach(note => {
      const dur = Math.floor(note.d * SAMPLE_RATE * 0.8); // 80% tempo
      const start = Math.floor(pos * SAMPLE_RATE);
      for (let s = 0; s < dur && (start+s) < NUM_SAMPLES; s++) {
        // Music box = sharp attack, long decay with harmonics
        const env = Math.exp(-s / (SAMPLE_RATE * note.d * 0.6));
        const fundamental = Math.sin(2*Math.PI*note.n*s/SAMPLE_RATE);
        const h2 = Math.sin(2*Math.PI*note.n*2*s/SAMPLE_RATE) * 0.3;
        const h3 = Math.sin(2*Math.PI*note.n*3*s/SAMPLE_RATE) * 0.1;
        samples[start+s] += (fundamental + h2 + h3) * env * 0.2;
      }
      pos += note.d * 0.8 + noteGap;
    });
    pos += 0.5; // gap between repeats
  }
  // Simple reverb (comb filter)
  const delayLen = Math.floor(0.12 * SAMPLE_RATE);
  for (let i = delayLen; i < NUM_SAMPLES; i++) {
    samples[i] += samples[i - delayLen] * 0.3;
  }
  const delayLen2 = Math.floor(0.17 * SAMPLE_RATE);
  for (let i = delayLen2; i < NUM_SAMPLES; i++) {
    samples[i] += samples[i - delayLen2] * 0.2;
  }
  return samples;
}

// 4. OCEAN - rhythmic waves with foam
function generateOcean() {
  const samples = new Float64Array(NUM_SAMPLES);
  let brown = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const white = Math.random()*2-1;
    brown = brown*0.98 + white*0.02;
    // Wave cycle ~8-12 seconds
    const waveCycle = 0.09 + 0.02*Math.sin(2*Math.PI*i/(SAMPLE_RATE*30));
    const wave = Math.pow((Math.sin(2*Math.PI*waveCycle*i/SAMPLE_RATE)+1)/2, 2);
    // Low rumble (brown noise filtered)
    samples[i] = brown * 2.5 * (0.3 + 0.7*wave);
    // High frequency foam at wave peaks
    if (wave > 0.6) {
      samples[i] += (Math.random()*2-1) * 0.12 * (wave - 0.6) * 2.5;
    }
  }
  // Smooth with simple low-pass
  let prev = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    prev = prev*0.7 + samples[i]*0.3;
    samples[i] = prev;
  }
  return samples;
}

// 5. WIND - sweeping filtered noise with gusts
function generateWind() {
  const samples = new Float64Array(NUM_SAMPLES);
  let brown = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const white = Math.random()*2-1;
    brown = brown*0.97 + white*0.03;
    // Gust modulation (multiple slow LFOs)
    const gust1 = (Math.sin(2*Math.PI*0.06*i/SAMPLE_RATE)+1)/2;
    const gust2 = (Math.sin(2*Math.PI*0.11*i/SAMPLE_RATE)+1)/2;
    const gust = 0.3 + 0.7 * gust1 * 0.6 + 0.4 * gust2;
    samples[i] = brown * 2.0 * gust;
    // Occasional high whistle
    if (gust1 > 0.7) {
      const whistleFreq = 1500 + 500*Math.sin(2*Math.PI*0.03*i/SAMPLE_RATE);
      samples[i] += Math.sin(2*Math.PI*whistleFreq*i/SAMPLE_RATE) * 0.015 * (gust1-0.7)*3;
    }
  }
  return samples;
}

// 6. STREAM - flowing water with bubbles
function generateStream() {
  const samples = new Float64Array(NUM_SAMPLES);
  // Base flow noise
  let b0=0,b1=0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const w = Math.random()*2-1;
    b0 = b0*0.95 + w*0.05;
    b1 = b1*0.85 + w*0.15;
    const flow = (b0*0.6 + b1*0.4) * 1.5;
    const mod = 0.7 + 0.3*Math.sin(2*Math.PI*0.2*i/SAMPLE_RATE);
    samples[i] = flow * mod;
  }
  // Random bubbles
  for (let i = 0; i < NUM_SAMPLES; ) {
    i += Math.floor(SAMPLE_RATE * (0.08 + Math.random()*0.4));
    const freq = 600 + Math.random()*3000;
    const dur = Math.floor(SAMPLE_RATE * (0.02 + Math.random()*0.08));
    const amp = 0.05 + Math.random()*0.08;
    for (let s = 0; s < dur && (i+s) < NUM_SAMPLES; s++) {
      const env = Math.exp(-s/(dur*0.2));
      const f = freq * Math.exp(-s/(dur*0.5));
      samples[i+s] += Math.sin(2*Math.PI*f*s/SAMPLE_RATE) * env * amp;
    }
  }
  return samples;
}

const dir = path.join(__dirname, 'public', 'sounds');
fs.mkdirSync(dir, { recursive: true });

console.log('🎵 Generating ambient sounds...');
writeWav(path.join(dir, 'rain.wav'), generateRain());
writeWav(path.join(dir, 'crickets.wav'), generateCrickets());
writeWav(path.join(dir, 'lullaby.wav'), generateLullaby());
writeWav(path.join(dir, 'ocean.wav'), generateOcean());
writeWav(path.join(dir, 'wind.wav'), generateWind());
writeWav(path.join(dir, 'stream.wav'), generateStream());
console.log('✅ All 6 sounds generated!');
