const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* bar renkleri */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.classList.add(
        i < 30 ? "green" :
        i < 60 ? "yellow" :
        i < 80 ? "orange" : "red"
    );
    container.appendChild(bar);
    bars.push(bar);
}

let ctx, analyser;

/* 1 sn referans */
const CAL_TIME = 1000;
let refDb = null,
    calEnd = 0,
    sum = 0,
    n = 0;

/* sabit RMS pencere */
function getDb() {
    const N = 4096,
        data = new Float32Array(N);
    analyser.getFloatTimeDomainData(data);
    let s = 0;
    for (const v of data) s += v * v;
    const rms = Math.sqrt(s / N);
    return Math.max(0, 20 * Math.log10(rms) + 80); /* 0-80 dB skala */
}

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const now = performance.now(),
        db = getDb();

    /* referans yakala */
    if (refDb === null) {
        if (calEnd === 0) calEnd = now + CAL_TIME;
        sum += db;
        n++;
        if (now >= calEnd) refDb = sum / n;
    }

    const adj = Math.max(0, db - (refDb || 0));
    const norm = Math.min(adj / 30, 1); /* 0-100 bar */

    valEl.innerHTML = `${Math.round(norm*100)} <span>dB</span>`;
    updateStatus(norm * 100);

    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(render, 150);
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error(e);
    }
}
window.addEventListener("load", init);