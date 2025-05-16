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

function getRms() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    return rms < 0.00001 ? 0.00001 : rms; // 0'dan kaçınmak için min değer ver
}

function getDb() {
    const rms = getRms();
    let db = 20 * Math.log10(rms);
    db = db + MAX_DB + GAIN_OFFSET;
    return Math.min(Math.max(db, MIN_DB), MAX_DB);
}

function updateStatus(db) {
    if (db < 40) {
        statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)";
    } else if (db < 70) {
        statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)";
    } else {
        statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)";
    }
}

function updateUI() {
    const db = getDb();

    const norm = db / MAX_DB;
    const active = Math.round(norm * bars.length);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");

    valEl.innerHTML = `${Math.round(db)} <span>dB</span>`;
    updateStatus(db);

    minDb = Math.min(minDb, db);
    maxDb = Math.max(maxDb, db);
    sumDb += db;
    sampleCnt++;

    if (minEl) minEl.textContent = `${Math.round(minDb)}`;
    if (avgEl) avgEl.textContent = `${Math.round(sumDb / sampleCnt)}`;
    if (maxEl) maxEl.textContent = `${Math.round(maxDb)}`;
}

window.addEventListener("load", init);