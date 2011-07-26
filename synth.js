var Synth = (function() {
    "use strict";
    var RATE = 22050,
        Hz = 2 * Math.PI / RATE,
        freqTable = [16.35,17.32,18.35,19.45,20.6,21.83,23.12,24.5,25.96,27.5,29.14,30.87,32.7,34.65,36.71,38.89,41.2,43.65,46.25,49,51.91,55,58.27,61.74,65.41,69.3,73.42,77.78,82.41,87.31,92.5,98,103.83,110,116.54,123.47,130.81,138.59,146.83,155.56,164.81,174.61,185,196,207.65,220,233.08,246.94,261.63,277.18,293.66,311.13,329.63,349.23,369.99,392,415.3,440,466.16,493.88,523.25,554.37,587.33,622.25,659.26,698.46,739.99,783.99,830.61,880,932.33,987.77,1046.5,1108.73,1174.66,1244.51,1318.51,1396.91,1479.98,1567.98,1661.22,1760,1864.66,1975.53,2093,2217.46,2349.32,2489.02,2637.02,2793.83,2959.96,3135.96,3322.44,3520,3729.31,3951.07,4186.01,4434.92,4698.64,4978.03],
        notes = 'cCdDefFgGaAb',
        chords = {
          'major': [0,4,7,12],
          'minor': [0,3,7,12],
          'maj7': [0,4,7,11]
        };
    function decodeNote(n) {
        var match = n.match(/(\w)(\d+)/);
        return notes.indexOf(match[1]) + match[2] * 12;
    }
    function saw(i) {
        i /= (Math.PI * 2);
        i = i - ~~i;
        if (i < 1) {
            return i;
        } else if (i < 3) {
            return 1 - (i - 1);
        } else {
            return i - 4;
        }
    }
    function fadeOut(samp) {
        var len = samp.length;
        for (var i=0; i < len; i++) {
            samp[i] = samp[i]*((len-i)/len);
        }
        return samp;
    }
    function fadeIn(samp) {
        var len = samp.length;
        for (var i=0; i < len; i++) {
            samp[i] = samp[i]*(i/len);
        }
        return samp;
    }
    function mix() {
        var maxLen = 0, s, i
        for (i=0; i<arguments.length; i++) {
            s = arguments[i];
            maxLen = maxLen < s.length ? s.length : maxLen;
        }
        var samples = new Float32Array(maxLen);
        for (i=0; i<maxLen; i++) {
            samples[i] = 0;
            for (var j=0; j<arguments.length; j++) {
                if (i < arguments[j].length) {
                    samples[i] += arguments[j][i] / arguments.length;
                }
            }
        }
        return samples;
    }
    function vol(samp, v) {
        var samples = new Float32Array(samp.length);
        for (var i=0; i<samp.length; i++) {
            samples[i] = samp[i] * v;
        }
        return samples;
    }
    function envelope(samp, env) {
        var len = samp.length,
            samples = new Float32Array(len),
            segVal, segEnd, segStart, segSpan, segDur, nextSeg;
        segStart = 0;
        segVal = env[0][1];
        if (env[0][0] > 0) {
            segEnd = ~~(env[0][0] * len);
            segSpan = 0;
            nextSeg = 0;
        } else {
            segEnd = ~~(env[1][0] * len);
            segSpan = env[1][1] - env[0][1];
            nextSeg = 1;
        }
        segDur = segEnd;
        for (var i=0; i<len; i++) {
            samples[i] = samp[i] * (segVal + ((i - segStart) / segDur) * segSpan);
            if(!(i%1000)) console.log((segVal + ((i - segStart) / segDur) * segSpan));
            if (i >= segEnd) {
                segVal = env[nextSeg][1];
                segStart = segEnd;
                nextSeg++;
                if (nextSeg > env.length-1) {
                    nextSeg--;
                    segEnd = len+1;
                } else {
                    segEnd = ~~(env[nextSeg][0] * len);
                }
                segDur = segEnd - segStart;
                segSpan = env[nextSeg][1] - segVal;
            }
        }
        return samples;
    }
    function generateNoise(duration) {
        var samples = new Float32Array(~~(RATE * duration)),
            len = samples.length;
        for (var i=0; i < len; i++) {
            samples[i] = (Math.random() * 2 - 1);
        }
        return samples;
    }
    function generateNote(note, duration, func) {
        var pitch = (typeof note == 'string') ? decodeNote(note) : note;
        func = func || Math.sin;

        return generateTone(freqTable[pitch]);
    }
    function generateTone(freq, duration, func) {
        var samples = new Float32Array(~~(duration * RATE));
        func = func || Math.sin;
        for (var i = 0; i < samples.length; i++) {
            samples[i] = func(i * freq * Hz);
        }
        return samples;
    }
    function generateSlide(f1, f2, duration, func) {
        var samples = new Float32Array(~~(duration * RATE)),
            span = f2-f1,
            curFreq;
        func = func || Math.sin;

        for (var i = 0; i < samples.length; i++) {
            curFreq = f1 + (i/samples.length) * span;
            samples[i] = func(i * curFreq * Hz);
        }
        return samples;
    }
    function generateChord(note, chord, duration) {
        var samples = new Float32Array(~~(duration * RATE)),
            len = samples.length,
            samp = 0,
            chord = chords[chord],
            pitch = (typeof note == 'string') ? decodeNote(note) : note;

        for (var i = 0; i < samples.length; i++) {
            samp = 0;
            for (var j=0; j<chord.length; j++) {
                samp += Math.sin(i * freqTable[pitch + chord[j]] * Hz);
            }
            samp /= chord.length;
            samples[i] = samp;
        }
        return samples;
    }
    
    return {
        'generateChord': generateChord,
        'generateTone': generateTone,
        'generateNoise': generateNoise,
        'generateSlide': generateSlide,
        'fadeOut': fadeOut,
        'fadeIn': fadeIn,
        'mix': mix,
        'decodeNote': decodeNote,
        'saw': saw,
        'vol': vol,
        'envelope': envelope
    };
})();