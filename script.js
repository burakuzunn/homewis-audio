'use strict';

// Parametreler
const SAMPLE_WINDOW = 1024;
const MIN_DB = 0;
const MAX_DB = 80;
const UI_INTERVAL_MS = 150;
const TOTAL_BARS = 40;
const GAIN_OFFSET = 0;

// DOM
const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const barBox = document.getElementById("bar-container");
const minEl = document.getElementById("mindbText");
const avgEl = document.getElementById("avrdbText");
const maxEl = document.getElementById("maxdbText");

// Gradient barlar
for (let i = 0; i < TOTAL_BARS; i++) {
    const bar = document.createElement("div");
    bar.classList.add("bar");
    const r = i / TOTAL_BARS;
    if (r < 0.5) bar.classList.add("green");
    else if (r < 0.75) bar.classList.add("yellow");
    else if (r < 0.9) bar.classList.add("orange");
    else bar.classList.add("red");
    barBox.appendChild(bar);
}
const bars = [...document.querySelectorAll("#bar-container .bar")];

let ctx, analyser;
let minDb = Infinity,
    maxDb = -Infinity,
    sumDb = 0,
    sampleCnt = 0;

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(updateUI, UI_INTERVAL_MS);
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", e);
    }
}

function getRawLevel() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
        peak = Math.max(peak, Math.abs(buf[i]));
    }
    return peak;
}

function updateStatus(level) {
    if (level < 0.1) {
        statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)";
    } else if (level < 0.5) {
        statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)";
    } else {
        statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)";
    }
}

function updateUI() {
    const level = getRawLevel();
    const norm = Math.min(level, 1);
    const displayVal = norm * MAX_DB;

    const active = Math.round(norm * bars.length);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");

    valEl.innerHTML = `${Math.round(displayVal)} <span>dB</span>`;
    updateStatus(norm);

    minDb = Math.min(minDb, displayVal);
    maxDb = Math.max(maxDb, displayVal);
    sumDb += displayVal;
    sampleCnt++;

    if (minEl) minEl.textContent = `${Math.round(minDb)}`;
    if (avgEl) avgEl.textContent = `${Math.round(sumDb / sampleCnt)}`;
    if (maxEl) maxEl.textContent = `${Math.round(maxDb)}`;
}

window.addEventListener("load", init);