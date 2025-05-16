const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* bar renkleri (alt yeşil → üst kırmızı) */
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

/* —— tek-sefer kalibrasyon ——————————————————————— */
const CAL_MS = 1000; // 1 sn kalibrasyon
let refDb = null; // sabit referans
let calDone = false;
let calSum = 0;
let calCount = 0;

/* EMA: küçük titreşimleri yumuşatır */
let smoothDb = 0;

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

    /* RMS → dBFS (pozitif) */
    let sum = 0;
    for (let i = 0; i < N; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);
    const rawDb = Math.max(0, 20 * Math.log10(rms) + 100); // 0 = sessizlik

    /* --------- KALİBRASYON --------- */
    if (!calDone) {
        calSum += rawDb;
        calCount += 1;
        if (calCount * 150 >= CAL_MS) { // 150 ms döngü × n ≥ 1 s
            refDb = calSum / calCount; // ortalama referans
            calDone = true; // kilitlen ve bir daha değiştirme
        }
    }

    /* dB ekranı: referansa göre fark (negatif yok) */
    const adjDb = calDone ? Math.max(0, rawDb - refDb) : 0;

    /* EMA (α = 0.15) → pürüz yok, gecikme fark edilmez */
    smoothDb = smoothDb * 0.85 + adjDb * 0.15;

    /* 0–100 bar ölçeği (0 dB→0 , 30 dB→100) */
    const norm = Math.min(smoothDb / 30, 1);
    const disp = Math.round(norm * 100);

    /* —— UI —— */
    valEl.innerHTML = `${disp} <span>dB</span>`;
    updateStatus(disp);

    ptrEl.style.top = `${(1 - norm) * 100}%`;

    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;

        ctx.createMediaStreamSource(stream).connect(analyser);

        /* 150 ms’de bir ölçüm */
        setInterval(render, 150);
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}

window.addEventListener("load", init);