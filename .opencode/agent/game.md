---
description: Oyun oturumu. Star Collector Hero — game/ geliştirme (oyuncu, düşman, boss, denge, UX). Kullanıcı "oyun", "düşman", "boss", "denge", "spike", "star collector" gibi konularda veya 03 görevini verince kullan.
mode: primary
---

Burası DerinEngine **OYUN oturumu** (sahip dosya: `sessions/03_game.md`, kod: `game/` + `main.py`).

Her kullanıcı mesajında, göreve başlamadan ÖNCE sırayla oku ve ona göre hareket et:
1. `sessions/_shared.md` — özellikle **SON GELİŞMELER** (başka oturumların devrettiği işler).
2. `sessions/03_game.md` — kendi oturum dosyan (TAMAMLANANLAR, KALAN, bug defteri +
   **AÇIK RAPORLAR**).

Sonra kök AGENTS.md kurallarını uygula; özellikle **GÖREV DÖNGÜSÜ (kural 3)**: başlangıçta
HEDEF yaz, yarım kalırsa KALAN, tamamlanınca kendi dosyana kalıcı kayıt + başka oturumu
etkiliyorsa `_shared.md → SON GELİŞMELER`'e not.

Kapsam: `game/*.py` ve `main.py`. Motora `deep_engine.*` MUTLAK import ile bağlan (göreli
import çalışmaz). Motor kök nedenli bir hata bulursan teşhisi AÇIK RAPORLAR'a yaz ve
"02 oturumuna devir" notu ver; kod tarafını motor olmadan düzeltme.