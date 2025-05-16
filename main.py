import customtkinter as ctk
import sounddevice as sd
import numpy as np
import threading

# Temayı ayarla
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

# Ana pencere
app = ctk.CTk()
app.geometry("700x500")
app.title("Süpürge Gürültü Testi")

RUNNING = False
SAMPLERATE = 44100
DURATION = 0.2

def measure_volume():
    global RUNNING
    while RUNNING:
        data = sd.rec(int(SAMPLERATE * DURATION), samplerate=SAMPLERATE, channels=1)
        sd.wait()
        rms = np.sqrt(np.mean(data**2))
        db = 20 * np.log10(rms + 1e-6) + 100
        db = max(0, min(int(db), 100))
        update_ui(db)

def update_ui(db):
    db_label.configure(text=f"{db} dB")
    if db < 30:
        status_label.configure(text="Çok sessiz", text_color="green")
    elif db < 60:
        status_label.configure(text="Orta", text_color="orange")
    else:
        status_label.configure(text="Gürültülü", text_color="red")

    # Bar çizimi
    bar_canvas.delete("all")
    for i in range(0, db, 2):
        color = "#00ff99" if i < 40 else "#ffcc00" if i < 80 else "#ff4444"
        bar_canvas.create_rectangle(10 + i*2, 10, 15 + i*2, 30, fill=color, width=0)

def start_test():
    global RUNNING
    RUNNING = True
    threading.Thread(target=measure_volume, daemon=True).start()

def stop_test():
    global RUNNING
    RUNNING = False

# LOGO ve başlık
ctk.CTkLabel(app, text="arçelik", font=ctk.CTkFont(size=24, weight="bold")).pack(pady=(20, 0))
ctk.CTkLabel(app, text="Süpürge Gürültü Testi", font=ctk.CTkFont(size=16)).pack(pady=(0, 10))

# Pasif buton
ctk.CTkButton(app, text="🔊 Gerçek Zamanlı Ses Ölçer", state="disabled", fg_color="#444", text_color="#aaa", hover=False).pack(pady=10)

# Gösterge paneli
panel = ctk.CTkFrame(app, fg_color="transparent")
panel.pack(pady=10)

# Sol kutu
left = ctk.CTkFrame(panel, width=200, height=130, corner_radius=10)
left.pack(side="left", padx=20)
left.pack_propagate(False)

db_label = ctk.CTkLabel(left, text="0 dB", font=ctk.CTkFont(size=32, weight="bold"))
db_label.pack()
status_label = ctk.CTkLabel(left, text="Hazır", font=ctk.CTkFont(size=14))
status_label.pack(pady=5)

# Sağ kutu (Canvas bar)
right = ctk.CTkFrame(panel, width=350, height=130, corner_radius=10)
right.pack(side="left", padx=10)
right.pack_propagate(False)

import tkinter as tk
bar_canvas = tk.Canvas(right, width=330, height=40, bg="#1e1e1e", highlightthickness=0)
bar_canvas.pack(pady=40)

# Başlat butonu
ctk.CTkButton(app, text="▶ Testi Başlat", command=start_test, fg_color="#e53935", hover_color="#c62828", corner_radius=20, height=40).pack(pady=20)

app.mainloop()
