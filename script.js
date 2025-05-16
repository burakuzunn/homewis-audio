const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* —— barları oluştur —— 0 dB=yeşil, 100 dB=kırmızı */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    if (i < 30) bar.classList.add("green");
    else if (i < 60) bar.classList.add("yellow");
    else if (i < 80) bar.classList.add("orange");
    else bar.classList.add("red");
    container.appendChild(bar);
    bars.push(bar);
}

/* Web-Audio ayarları */
let ctx, analyser;

/* — tek sefer kalibrasyon — */
const CAL_TIME = 1000; // 1 sn
let refDb = null;
let calEnd = 0; // ms cinsinden zaman damgası
let accDb = 0,
    accN = 0; // kalibrasyon biriktirme

/* EMA + peak-hold ayarı */
let emaDb = 0;
let displayDb = 0;
const PEAK_HOLD_MS = 2000; // pik değeri şu süre sabit tut
const DECAY_PER_STEP = 1; // her ölçümde max bu kadar düşsün
let lastUpdate = 0,
    lastPeak = 0;

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function calcRms(fftSize) {
    const buf = new Uint8Array(fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < fftSize; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
    }
    return Math.sqrt(sum / fftSize);
}

function render() {
    const now = performance.now();

    /* —— 3 art arda pencere (ortalama) —— */
    const rms1 = calcRms(analyser.fftSize);
    const rms2 = calcRms(analyser.fftSize);
    const rms3 = calcRms(analyser.fftSize);
    const rms = (rms1 + rms2 + rms3) / 3;

    const rawDb = Math.max(0, 20 * Math.log10(rms) + 100); // pozitif dBFS

    /* —— 1 sn kalibrasyon, sonra refDb sabit —— */
    if (refDb === null) {
        if (calEnd === 0) calEnd = now + CAL_TIME;
        accDb += rawDb;
        accN++;
        if (now >= calEnd) {
            refDb = accDb / accN; // ortalama referans
        }
    }

    const adjDb = refDb ? Math.max(0, rawDb - refDb) : 0;

    /* EMA α=0.1 */
    emaDb = 0.9 * emaDb + 0.1 * adjDb;

    /* —— peak-hold & yavaş düşüş —— */
    if (emaDb > displayDb) {
        displayDb = emaDb;
        lastPeak = now;
    } else if (now - lastPeak > PEAK_HOLD_MS) {
        displayDb = Math.max(displayDb - DECAY_PER_STEP, emaDb);
    }

    /* 0-100 ölçeğe oturt */
    const norm = Math.min(displayDb / 30, 1);
    const dbInt = Math.round(norm * 100);

    /* —— UI —— */
    valEl.innerHTML = `${dbInt} <span>dB</span>`;
    updateStatus(dbInt);

    ptrEl.style.top = `${(1-norm)*100}%`;
    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096; // ≈93 ms pencere – daha stabil

        ctx.createMediaStreamSource(stream).connect(analyser);

        /* 200 ms’de bir render */
        setInterval(render, 200);
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}

window.addEventListener("load", init);