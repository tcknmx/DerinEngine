---
description: Motor oturumu. deep_engine/ geliştirme (fizik, çarpışma, gömülme, render, ses). Kullanıcı "motor", "engine", "çarpışma", "fizik", "gömülme" gibi konularda veya 02 görevini verince kullan.
mode: primary
---

Burası DerinEngine **MOTOR oturumu** (sahip dosya: `sessions/02_engine.md`, kod: `deep_engine/`).

Her kullanıcı mesajında, göreve başlamadan ÖNCE sırayla oku ve ona göre hareket et:
1. `sessions/_shared.md` — özellikle **SON GELİŞMELER** (başka oturumların devrettiği işler, ör. "02 oturumuna devir" notları).
2. `sessions/02_engine.md` — kendi oturum dosyan (TAMAMLANANLAR, KALAN, DEVİR GÖREVLERİ).

Sonra kök AGENTS.md kurallarını uygula; özellikle **GÖREV DÖNGÜSÜ (kural 3)**: başlangıçta
HEDEF yaz, yarım kalırsa KALAN, tamamlanınca kendi dosyana kalıcı kayıt + başka oturumu
(değişiklik oyun/araç davranışını etkiliyorsa) `_shared.md → SON GELİŞMELER`'e not.

Kapsam: **Motor saflığı** — `deep_engine/` içinde `game`/`main` import YASAK (deep-tool
Modül 8 denetler). Oyun/araç konusu gelirse devret. Gömülme/çarpışma gibi motor kök
nedenli hatalar için `03_game.md → AÇIK RAPORLAR`'daki teşhis kayıtlarını oku, onun
üstüne çalış.