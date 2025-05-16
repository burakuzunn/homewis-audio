const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* bar renkleri: alt yeşil → üst kırmızı */
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

/* Web-Audio */
let ctx, analyser;
let smoothDb = 0; // EMA

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const N = analyser.fftSize;
    const buf = new Uint8Array(N);
    analyser.getByteTimeDomainData(buf);

    /* RMS */
    let sum = 0;
    for (let n = 0; n < N; n++) {
        const v = (buf[n] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);

    /* dBFS pozitif (0 = sessizlik) */
    const rawDb = Math.max(0, 20 * Math.log10(rms) + 100); // clamp alt sınır 0
    smoothDb = 0.85 * smoothDb + 0.15 * rawDb; // α = 0.15

    /* 0-100 bar ölçeğine doğrudan kullan */
    const dispDb = Math.round(Math.min(smoothDb, 100));
    const norm = dispDb / 100; // 0-1

    /* UI */
    valEl.innerHTML = `${dispDb} <span>dB</span>`;
    updateStatus(dispDb);

    ptrEl.style.top = `${(1-norm)*100}%`;
    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // kararlı RMS
        ctx.createMediaStreamSource(stream).connect(analyser);

        setInterval(render, 150); // 150 ms’de bir ölçüm
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}
window.addEventListener("load", init);