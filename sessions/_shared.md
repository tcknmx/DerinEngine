# DerinEngine — Paylaşılan Bilgi (Çapraz-Oturum)

Bu dosya, oturumlar arası "diğer oturumların da haberi olsun" kayıtlarını ve ortak
bilgiyi tutar. Her oturuma başlarken **SON GELİŞMELER** bölümünü oku. Kendi oturumunun
yarım işi buraya YAZILMAZ (o, kendi oturum dosyanda `KALAN` olarak durur).

---

## SON GELİŞMELER (kronolojik, en üstte en yeni)

- **[STRATEJİ→TÜMÜ] CHECKUP ARDINDAN 4 İŞ KAPANDI (29.10.2026) — PAKET COMMIT'LENDİ,
  PHYSICS PROBU TESTLE KİLİTLENDİ, SHIELDBOSS A OYUNDA.** Kullanıcı "önerdiklerini ve
  yarım kalanların hepsini yap" dedi. Yapılanlar:
  (1) **09.10 paketi commit edildi** — `db9726d` (PAKET 2 + Star Climber kaldırma,
  oyun 0.1.20). Working tree o an temizlendi; git HEAD artık güncel.
  (2) **`engine/physics.js` one-way yakınlık probu KİLİTLENDİ** — `test_core.js`'e
  **TEST17** eklendi (hızlı düşüşte tünelleme yok + alttan geçiş serbest).
  Mutasyon kanıtı: eski physics ile 2 FAIL, yenisiyle ALL OK; test_core **50 → 53**.
  (3) **ShieldBoss A (katmanlı kalkan) oyuna geçti** (`game/bosses.js`): 3 blok = 3
  katman; en az biri ayaktayken hasar bloklanır; katman kırılınca 2 sn savunmasızlık
  (ateş yok, hasar geçer); 7 sn sonra katman yenilenir; **üçü birden kırılırsa kalıcı
  savunmasız + boss gezinir**. Motor kancası `shield_intact()` (duck-typing) korundu →
  motora dokunulmadı. **B (döner kalkan)** ve **C (tek büyük kalkan)** tasarımları
  `03_game.md`'de YEDEK olarak yazıldı, kodlanmadı (kullanıcı kararı).
  Regresyon: `test_game.js` **TEST19** (14 kontrol) → oyun testi 149 → **163 OK**.
  (4) **Bayat kayıtlar temizlendi:** `03_game.md` "motor modül modül parite denetimi"
  maddesi kapandı (08.10'da Python silindi), `04_tools.md` ARAÇ KALAN bölümü
  sadeleşti (parite aracı/pygbag/Star Climber/webpanel.py maddeleri "KAPANAN" altına).
  **Doğrulama (tümü yeşil):** 13/13 JS test 0 FAIL (core 53, game 163, smoke 0 HATA) +
  test_tools 36/0 + test_browser 37/0 + `deep-tool.js --lang tr all` 0 WARN/0 BUG/0 ERR.
  *Etkilenen: 02 motor (physics.js + test_core.js), 03 oyun (bosses.js + test_game.js),
  tüm oturumlar (git HEAD `db9726d` + yeni commit'ler).* **Gelir/fiyat modeline
  dokunulmadı (kullanıcıda).**

- **[STRATEJİ] CHECKUP (29.10.2026) — MOTOR YEŞİL, TEK YARIM İŞ `physics.js` PROBU
  (TESTSİZ) + 20 DOSYA COMMIT BEKLİYOR.** Envanter: 20 motor + 8 oyun dosyası
  (`climber.js` yok), `index.html` 28 dosyayı tam yüklüyor, sürüm 1.0.0 / 0.1.20
  üç yerde tutarlı. Test: 13/13 JS 0 FAIL (core 50, game 149, components 27, input 72,
  math2d 38, procedural 34, systems 73, tilemap 38, tween 33, ui 33, audio 33,
  visual 32; smoke 0 HATA + görsel kapılar) + test_tools 36/36 + test_browser 37/37
  + deep-tool `all` 0/0/0. **Açık iş 1 (MOTOR — 02 sahiplenmeli):**
  `engine/physics.js` one-way yakınlık probu commit edilmemiş ve **hiçbir test onu
  kilitlemiyor** (HEAD physics ile de tüm süitler yeşil); gerçek fark probda görüldü:
  `vy=1500, dt=1/30` düşüşte eski kod platformu delip geçiyor, yeni kod durduruyor →
  `test_core.js`'e tünelleme kapısı gerekiyor. **Açık iş 2:** 20 dosya commit
  bekliyor (PAKET 2 + Star Climber kaldırma + physics + belgeler; HEAD `6f44cde`).
  **Açık kararlar:** ShieldBoss A/B/C (03), gelir/fiyat modeli (01). Eski
  `01_strategy.md` MASTER kuyruğu bayat (tüm HTML port maddeleri bitti) → yeni
  kuyruk önerisi o dosyada. *Etkilenen: TÜM oturumlar (kod değişmedi).*
  > **✅ ÇÖZÜLDÜ (29.10.2026):** Açık iş 1 (physics probu) → `test_core.js` TEST17 ile
  > kilitlendi + commit edildi (ade29b5). Açık iş 2 (20 dosya) → commit edildi
  > (db9726d + ade29b5 + 2bc6829 + 845edfb). ShieldBoss A uygulandı (2bc6829).
  > Gelir modeli kullanıcıda (değişmedi).
  > **ÇÖZÜLDÜ (29.10.2026):** yukarıdaki "4 iş kapandı" kaydına bak — commit, test
  > kapısı, ShieldBoss A ve bayat kayıt temizliği tamamlandı.


- **[STRATEJİ oturumu] CHECKUP (10.10.2026) — TÜM TESTLER YEŞİL, ANCAK 09.10 PAKETİ
  COMMIT EDİLMEMİŞ.** 15 dosya koşuldu: 13/13 motor+oyun 0 FAIL (core 50, game 34,
  components 27, input 72, math2d 38, procedural 34, systems 73, tilemap+levelfile 38,
  tween 33, ui 33, audio 33, visual 32; smoke 33 tur + 50/50 görsel kapı + 60Hz fizik
  ölçümü) + test_tools 36/36 + test_browser 37/37. **`git status`: 19 dosya working
  tree'de commit bekliyor** — PAKET 2 (i18n ölü anahtar, parallax flicker fix,
  forced_boss_type/benzersiz boss) + STAR CLIMBER kaldırma (0.1.20: climber.js silindi,
  test_game −596, ui/i18n/index/smoke/browser + session kayıtları) + `engine/physics.js`
  one-way proximity probu. Son commit `6f44cde` (08.10). **Karar bekliyor: hangi oturum
  commit'leyecek (OYUN + ARAC doğal sahipleri); GitHub push'u zaten "gönder" deyince.**
  *Etkilenen: TÜM oturumlar (çalışan kod güncel, ama git HEAD 0.1.19 sonrasını gösteriyor).*

- **[OYUN+MOTOR] Ölü yük temizliği + parallax flicker + benzersiz boss sıralaması —
  TAMAMLANDI, 09.10.2026]** Kullanıcı 4 iş verdi; 3'ü bitti, 4. (boss mekaniği)
  kullanıcı seçimine kaldı. (1) `engine/i18n.js`'ten ölü eski menü anahtarları tr+en
  silindi (`menu_play_l1/l2/l3`, `menu_lang`, `menu_quit`, `menu_procedural`,
  `menu_random`, `menu_random_locked`, `menu_campaign`). (2) **Parallax flicker KÖK
  NEDEN fix'i:** `engine/parallax.js` kamerayı `_pmod(..., 2400)` ile sarmalıyordu;
  2400 sinüs periyodunun tam katı olmadığından hareket ederken yıldızlar + dağlar
  ZIPLIYORDU → faz artık gerçek periyoda hizalı; `_draw_cosmic` gezegeni de
  zıplamasız salınıma çevrildi. (3) **Benzersiz boss sırası:** `procedural.js`'e
  opsiyonel `forced_boss_type` param; `scenes.js start_campaign` 4 final-dışı biyoma
  4 farklı tip (permütasyon) atar → üst üste aynı boss gelmez (astro=cosmic final).
  **Doğrulama:** test_game 149/0, test_visual 32/0 (yeni P1b), test_procedural 34/0
  (yeni P6b), test_smoke 0 HATA + 50/50, test_tools 36/0, test_browser 37/0,
  deep-tool 0/0/0. **KALAN:** fazladan boss (ShieldBoss) mekaniği yeniden tasarımı —
  öneri (A katmanlı / B döner / C tek kalkan) `03_game.md`'de, kullanıcı seçecek.
  > **✅ ÇÖZÜLDÜ (29.10.2026):** A tasarımı uygulandı (`game/bosses.js` + TEST19,
  > test_game 149 → 163 OK); B/C yedek olarak `03_game.md`'de kaldı (kodlanmadı,
  > kullanıcı kararı). Detay: `03_game.md` "ShieldBoss MEKANİĞİ".
  *Etkilenen: 02 motor (parallax.js + procedural.js değişti — geriye dönük uyumlu);
  03 oyun. Detay: `03_game.md` "PAKET 2".*

- **[STAR CLIMBER TAMAMEN KALDIRILDI — TAMAMLANDI, 09.10.2026]** Kullanıcı v4
  sonrası kesin karar verdi: *"kendiliğinden seken zıplama oyunu istemiyorum.
  star climber ile ilgili her şeyi sil. minigame'i kaldır artık istemiyorum."*
  Sonuç — motor/oyun kodu, menü, kısayol, i18n, testler ve güncel belgelerden TÜM
  izler temizlendi: `game/climber.js` silindi; `ui.js` **M_CLIMB** kutucuğu +
  `_start_climber` + **[C]** kısayolu + `"climber"` aksiyonu kaldırıldı; `i18n.js`
  `climber_*` + `menu_climber` (tr+en) silindi; `index.html` script etiketi + info
  satırı; `test_game.js` TEST17 bloğu (725 satır) + TEST13d girdisi (244→149 OK);
  `test_smoke.js` "climber" turu (34→33) + eski `tap("c")`→`tap("p")` düzeltmesi;
  `tools_html/test_browser.js` bölüm 4b + load listesi (52→37); README + AGENTS.
  Oyun sürümü **0.1.19 → 0.1.20** (`state.js` + `version.txt` geçmiş girdisi).
  **Doğrulama:** 13/13 JS test 0 FAIL (smoke 0 HATA + 50/50 görsel kapı), test_tools
  36/0, test_browser 37/0, `deep-tool.js --lang tr all` 0/0/0. Oynanış modları
  (kampanya/rastgele/editör/özel) DEĞİŞMEDİ. *Etkilenen: 03 oyun + tüm oturumlar
  (menüde C kısayolu artık yok, oyun sürümü 0.1.20). Detay: `03_game.md`
  "STAR CLIMBER KALDIRMA".*

- **[STAR CLIMBER v4 — "CLIMBER JUMP" TÜRÜ — TAMAMLANDI, 09.10.2026]** Kullanıcı
  4 turdur (v1/v2/v3/v3b) Star Climber'ı beğenmiyordu: *"her defasında istediğimiz
  climber jump tarzı oyunlar gibi olmuyor."* **KÖK NEDEN:** dört turda da sadece
  PARAMETRE ayarlandı, türün İMZA MEKANİKLERİ yoktu. `game/climber.js` v4 + test
  devri tamamlandı: (1) kombi artık **zıplama yüksekliği**ni büyütür (`jump_mult`;
  eskiden yatay `speed_mult`); (2) **`AUTO_BOUNCE`** — yere inişte otomatik sekiş,
  SPACE sadece havada skill'li ek zıplama; (3) `floor_gap` zıplama erişiminden
  TÜRETİLİR → imkânsız boşluk kalmaz, çift-zıplama skill'i gerçekten işe yarar;
  (4) kamera **rekor katmanı izler** (sabit yükselen 66px/sn duvar kalktı);
  (5) ORTA-SÜTUN yasağı silindi; (6) ekranda BÜYÜK katman numarası + kombi (i18n
  tr/en). Motor-dışı dokunulan: `engine/i18n.js` (yeni `climber_jump`/`climber_combo`).
  test_game.js TEST17/17b/17c v4'e yeniden yazıldı + eksik `}` onarıldı; test_browser
  4b v4 kanonuna uyarlandı. **Doğrulama:** 13/13 JS 0 FAIL (test_game **244 OK**),
  tools 36/0, browser **52/0**, deep-tool **0/0/0**. Ölçüm: tuşsuz bot 24. kat,
  skill botu 47. kat. *Etkilenen: 03 oyun (climber), 2 motor (i18n + oyun görsel/fizik).
  KALAN: arka plan iyileştirmesi yapılmadı. Detay: `03_game.md` "V4 DEVİR TESLİMİ".*
  **MOTOR NOTU (02):** `engine/physics.js` one_way proximity probu (satır 244-255)
  bu çalışmada commit edilmedi; "havada kalma" bug'ının kök düzeltmesi — 02 inceleyip
  sahiplenmeli (motor katmanında `DE_GAME` referansı YOK, denetim temiz).
  > **✅ KAPANDI (29.10.2026):** prob `test_core.js` **TEST17** ile kilitlendi ve commit
  > edildi (yukarıdaki "4 iş kapandı" kaydı + `02_engine.md` "ONE-WAY YAKINLIK PROBU").

- **[KÖK DİZİN ORGANİZASYONU, 08.10.2026]** Kullanıcı direktifi: "tüm
  klasörleri organize et, ana dizindeki kalabalığı minimalize et". Sonuç:
  (1) `tools/` klasörü (boş kalıntı) silindi; (2) ana kökte **3 yedek .bat**
  silindi (`deep-tool-js.bat`, `webpanel-js.bat`, `test-tools-js.bat` — hep
  `git rm`) — artık sadece `deep-tool.bat` + `webpanel.bat` (`%*`'li) var;
  (3) `.gitignore`'dan Python kalıntısı girdiler temizlendi (`__pycache__/`,
  `*.py[cod]`, `build/`, `web-cache/`, `motor.log`). `dist/` (eski py paketi)
   kullanıcı isteğiyle KALDI (gitignore'lu). `.opencode/` ve `custom_levels/`
   dokunulmadı. **Doğrulama:** 13/13 JS 0 FAIL + `deep-tool.js --lang tr all`
   0/0/0 + kök artık 2 bat. *Etkilenen: 04 araç (kısayollar), tüm oturumlar
   (eski `*-js.bat` adları artık yok). Detay: `04_tools.md` "KÖK DİZİN
   ORGANİZASYONU".*

- **[ARAÇLAR PY→JS GEÇİŞİ — TAMAMLANDI, 08.10.2026]** Kullanıcı direktifi:
  araçlar da Python'dan JS'e geçirildi. `tools/deep-tool.py` + `tools/webpanel.py`
  **silindi** (`git rm`) — repo'da Python KALMADI. `webpanel.js` (Node, 8766)
  python bağımlılığından kurtuldu: `/api/launch` oyunu tarayıcıda index.html
  olarak açar, `/api/run` `.js` dosyasını `node` ile çalıştırır, `/api/script`
  `node -e`, `py()`/`W64`/`NODE_BIN` silindi. `deep-tool.js`: Modül 3
  builder/extractor → `deep_engine_html/game/*.js`, Modül 4 i18n → yalnız JS,
  `SCRIPT_RUN` → game/webpanel/tool node hedefleri, `new script` → yalnız .js.
  `deep-tool.bat` + `webpanel.bat` → `node tools_html\*.js`. AGENTS + README
  komutları güncellendi (webpanel 8766). **Doğrulama:** 13/13 JS 0 FAIL,
  test_tools 36/36, test_browser 52/0, `deep-tool.js --lang tr en all`** 14×
  0/0/0; webpanel /api/run + /api/script canlı POST'ta ok=true.
  *Etkilenen: 04 araç + tüm oturumlar (py komutları artık geçersiz). Detay:
  `04_tools.md` "ARAÇLAR PY→JS GEÇİŞİ — TAMAMLANDI".*

- **[Star Climber v3b — player/denge/arka plan — TAMAMLANDI, 08.10.2026]**
  Kullanıcının 3 yeni şikayeti karşılığı: (1) "player yanlardan sıkıştırılmış" →
  boyut 30×40 → **32×32** + yerçekimi **1400** + zıplama **-560** + hız **260**
  → artık ANA OYUN karakterinin birebir parametreleri (`game/climber.js`);
  (2) "hâlâ çok kolay, sadece SPACE" → FREE_CLIMB 3→1, orta-sütun CLEAR
  72→96, overlap şerit 54/min38, platformlar dar (92-146), dikey boşluk
  GAP_GROWTH 2.2 → **SPACE-only bot artık 3. katta takılıyor** (eskiden 7-11),
  şerit-hedefli bot 10; (3) "arka plan hâlâ kötü" → biyoma göre 3 katmanlı
  tepe sırtları (uzak/orta/yakın; kamera-x drift'i; astro'ya söner). Test
  zarfı güncellendi (ilk 2 katman, SPACE 2..10, overlap ≥6, NO-STACK
  ortShift≥14) — 13/13 JS 0 FAIL, tools 36/0, `node tools_html\deep-tool.js
  --lang tr all` **0 WARN/0 BUG/0 ERR**. *Etkilenen: 03 oyun (climber
  dengesi+player+backdrop), 03 test_game.* NOT: `tools/deep-tool.py` repo'da
  YOK (git'ten değil, denetimde silinmiş) — doğrulama JS deep-tool.

- **[Star Climber v3 — ana oyunun alternatif evreni — TAMAMLANDI, 08.10.2026]**
  Kullanıcı: "Star Climber'ı sevmiyorum; vizyon şu — Star Collector Hero'nun
  ALTERNATİF EVRENİ: portallar kapandı, koleksiyonerler Astro'ya kule diktiler,
  oyuncu o kuleye tırmanıyor; oynanış/platform/asset/player ana oyunla BİREBİR."
  Uygulandı (`game/climber.js`, `engine/i18n.js`): **1)** player = ana oyun
  karakteri (mavi gövde + GÖZLER + yön hissi; v1 "gözsüz" isteği geri alındı —
  kullanıcı artık AYNI istiyor) + dash (LSHIFT, 0.16s, hayalet izleri, ana
  oyundan birebir eş) + zıplama squash; **2)** HUD hedef satırı "Hedef: Astro
  Kulesi" + açılış banner'ı "PORTALLAR KAPANDI" (5sn söner); **3)** TEST17
  güncellendi (dash, hayalet iz, görsel çizim, HUD hedefi, banner). Map
  tırmanışça üretilir (v2'den beri). Ayrıca `tools_html/test_tools.js`
  api/script test girdisi düzeltildi: `print(1+1)` → `console.log(1+1)`
  (webpanel komut kutusu node ile çalışır, print yoktu — önceden var olan
  36/36 kırıcısı; v3 ile ilgisiz). Doğrulama: 13/13 JS test **0 FAIL**
  (test_game v3 ile yeşil), tools **36/0**, `deep-tool.py --lang tr 14`
  **0 WARN/0 BUG/0 ERR**. *Etkilenen: 03 oyun (climber player/dash/HUD/evren),
  02 motor (i18n yeni key'ler), 04 araç (test_tools girdisi).*

- **[DENETİM + SADELEŞTİRME — TAMAMLANDI, 08.10.2026]** Kullanıcı görevi (tüm
  dosyalar; gereksiz sil, dağınığı sadeleştir, spagetti düzelt; `dist/` hariç
  onaylandı) bitti. **A — silinenler:** `StarCollectorHero.spec` (git rm),
  kök `__pycache__` (main.cpython-314.pyc), `_e.txt`, `motor.log`. **C — ölü kod:**
  `DE._apply_camera` (render.js), `DE._pr_maybe_ramp` (procedural.js),
  `DE.get_builder` (levelfile.js). **D — spagetti:**
  a) bosses aim/beam 3-kopya → ortak `DE_GAME._beam_aim_phase` (entities.js) +
  `_boss_fire_beam`/`_boss_draw_beam` (bosses.js); SniperEnemy `_aim_state`;
  b) 4 düşmana ortak `_enemy_prelude` helper (entities.js);
  c) scenes.js `_scene_from_data` + `_wire_player_restart` (2 sahne kurulumu +
  3 restart bağlantısı tekliliği);
  d) `PlayerController.update` 325 satır → 9 metoda bölündü (`_update_*`, dash
  in ayri `_update_dash` — kopya-hatasıyla silinen Dash tetikleyici bloğu fark
  edilip geri kondu; tutarlılık kullanıcı onaylı `DE.Input.*` API çağrılarıyla
  sağlandı). **B — belgeler:** README.md py odaklı → JS/HTML tek-kaynak gerçeğine
  yeniden yazıldı (sürüm ayrı sayım motor 1.0.0 / oyun 0.1.19, yeni yapı,
  testing komutları, Turkish); version.txt silinmiş `deep_engine/__init__.py`
  referansı → `core.js DE.__version__` / `state.js DE_GAME.__version__`.
  **Doğrulama:** 13/13 JS test **0 FAIL** (test_game 224 OK/0 FAIL — Star
  Climber v2 kaydıyla birlikte yeşil), browser **52/0**, tools **36/0**,
  `deep-tool.py --lang tr all` **0 WARN/0 BUG/0 ERR**. *Etkilenen: 02 motor
  (render/procedural/levelfile ölü kod), 03 oyun (entities/bosses/scenes),
  04 araç (spec / README / version). NOT: `webpanel.py:33/414` +
  `webpanel.html:205` bayat py import'ları bilinçli kaldı (kozmetik).*

- **[Star Climber v2 oynanabilirlik — TAMAMLANDI, 08.10.2026]** Kullanıcı şikayetleri
  (dikenler kötü / dümdüz zıplama / ölüm döngüsü / grid arka plan) `climber.js`'e
  cevaplandı: dikenler `SPIKE_CHANCE=0`; `FREE_CLIMB` 3 + **oru-sütun yasağı**
  (katman merkezi ekran ortası `CLEAR=72` içine giremez) → "SPACE-only" bot sınırlı
  (7-10), ör kaydı şeridini hedefleyen bot 30-60 kata çıkar; ölüm döngüsü
  yumuşatıldı (`DEATH_MARGIN` 140, `CAM_BOOST_CAP` 1.5, `DOUBLE_GAP_CAP` 52);
  arka plan grid'siz (sinüs tepe + biyom gradyanı). Doğrulama: 13 JS test **0 FAIL**
  (test_game 244 satır, yeni: orta-sütun yasağı + iki yönlendirme botu + diken-yok),
  deep-tool 14 **0 WARN/0 BUG/0 ERR**. *Etkilenen: 03 oyun (climber.js + test_game.js)
  — motor katmanı DEĞİŞMEDİ. Detay: `03_game.md`.*

- **[OYUN] STAR CLIMBER YÜKSELTME (08.10.2026, `03_game.md` "STAR CLIMBER
  YÜKSELTME — TAMAMLANDI").** Evren kuralları kapsamı: (1) yüzey ANA OYUN
  biyomlarından biri (astro hariç — `CLIMB_BIOMES` paleti, `_pick_biome()` seed'a
  deterministik, `DE.PR_BIOME_NAMES` ile birebir), yükseldikçe astro'ya geçiş
  (astro'da OYUN BİTMEZ); (2) her ölümde YENİ HARİTA (`_regen_map()`: yeni seed —
  asla eskisiyle aynı olmaz, yeni yüzey biyomu, katmanlar sıfırdan); (3) rekor
  kalıcı: `DE_GAME.state.climber_high` + yeni `ClimbRecord` HUD'u (i18n
  `climber_record`). Çift zıplama skill'i ölümde REKOR GİBİ kalıcı (sıfırlanmaz).
  **Yeni yerleştirme algoritması:** NO-STACK (merkezler ≥44px kayar) +
  IN-BOUND TREND (merkeze çekme) + zig-zag (3 katman) + "en uzağa it" fallback
  (0.02px iç pay — fp 1e-4 sapması örtüşme>=need garantisini bozmasın) +
  altitude shrink (`_platform_w`). 3 sert kural (ilk kule/örtüşme/FREE_CLIMB)
  korundu. **Doğrulama:** test_game **222/0** (+13 TEST17b); 13/13 test yeşil;
  deep-tool `14` = **0 WARN/BUG/ERR**. *Etkilenen: 02 motor — yalnızca climber.js/
  i18n.js/test_game.js (engine/ core'u değişmedi); 03 oyun — kayıt güncellendi.*

- **[MOTOR + ARAÇ + STRATEJİ] ORTA M10-M11 + PYTHON MOTOR SİLME + PARİTE KAPISI
  KALDIRILDI (08.10.2026).** **M10 sürüm:** `game/state.js` →
  `DE_GAME.__version__="0.1.19"`; menü rozeti `ui.js` ve konsol `version`
  (`console.js`) artık `DerinEngine engine version: 1.0.0, game version: 0.1.19`
  (motor katmanı `typeof DE_GAME` korumalı). **M11 emoji segmentasyonu:**
  `render.js` TextRenderer py `_is_emoji_char` aralıklarıyla segmentlere bölüyor
  (emoji segmenti `Segoe UI Emoji` zinciri + kalın değil, normal `bold Arial`;
  center_x toplam genişlikten, gölge +2,+2); **emoji yoksa eski tek-parça yol
  aynen**. Kapı: `test_visual.js` T1 +15 kontrol → 31/31. **SİLME (kullanıcı
  kararı):** `deep_engine/` (21 py), `game/*.py` (9), `main.py`, `tests/*.py` (3),
  `tools/parity_check.py`, `deep_engine_html/PARITE_RAPORU.md` **silindi** (git
  track'li → geri alınabilir). **deep-tool Modül 14** (parite), Modül 1 `run_smoke`
  (py motor bağımlı), Modül 9 `_reg_seed` (py procedural) kaldırıldı; `_SCRIPT_RUN`
  "game" girdisi, `reg_seed_*`/`mc_smoke_*`/`parity_*` i18n anahtarları, `menu_14`
  silindi; kök göstergesi `deep_engine/`+`game/` → `deep_engine_html/`
  (`deep-tool.py` + `deep-tool.js`); py modül 4 i18n eksik-dosya artık INFO.
  `tools_html/test_tools.js` find testi klasörü → `deep_engine_html`. **Araçlar
  yeşil:** `deep-tool.py --lang tr all` = **0 WARN/BUG/ERR**; tools 36/36;
  browser 51/51; 13/13 JS test 0 FAIL. **AGENTS.md güncellendi** (MOTOR KARARI
  kutusu "JS TEK KAYNAK", py komutları/parite kapısı/proje yeri/sürüm kaynakları
  çıkarıldı). *Etkilenen: TÜM oturumlar — Python referansı YOK; "py'de nasıldı"
  → git geçmişi (`git show e6bf3e8:...`) + eski session kayıtları. KALAN: 02/01/
  04/03 session kayıt güncellemeleri + commit onayı (40+ dosya).*

- **[MOTOR] ORTA M5-M9 kapatıldı + M7 RNG parite kapısı GECTİ (08.10.2026,
  `02_engine.md` "ORTA M5-M9 KAPANDI + M7 PARİTE KAPISI GECTİ").** Parite farkları:
  M5 parallax `DE._pmod`, M6 `_lcg` Math.imul + stereo `Math.min` + müzik gain 1.0,
  M8 gamepad-A statik köprü, M9 `save_level(scene,path,extra_meta)`+`load_level`
  (38/38). **M7:** `procedural.js` `_pr_rng` Mulberry32 → **MT19937 (CPython 3.14
  birebir)** — C kaynaktan: `init_by_array` **iki geçiş + taşıma hilesi +
  mt[0]=0x80000000** (tek-geçiş klasik portu 6 seed'te farklı çıktı — dikkat!),
  `random()`/`getrandbits`/`_randbelow` ret-çekme; 32-bit karma `Math.imul`.
  **Kapı:** py `generate`+`generate_boss_arena` (py'de `_maybe_ramp` no-op —
  BİLİNÇLİ SAPMA #4) vs JS → **6 seviye + 6 arena BİREBİR** (geçici temp\m7gate).
  Aynı sabit seed artık py ile aynı seviyeyi verir. **Dikkat: seed'li eski
  prosedürel seviyeler YENİ çıktı** (Mulberry32 devri kapandı). Test düzeltmeleri:
  `test_game.js` TEST7 sayaç komşu-coin kümesi + spawn-yolu toplamasını kaçıyordu
  (aktif-coin azalmasından sayar); `test_audio.js` stereo `length===3`→`===2`
  (py min). Regresyon: **13/13 JS 0 FAIL, browser 51, tools 36, py ALL OK,
  parity TAM**. *Etkilenen: MOTOR (procedural.js) — kalıcı KALAN yok; silme
  öncesi son ORTA: M10 sürüm + M11 emoji.*

- **[OYUN + MOTOR] Konsol/komut metinleri düz İngilizce + gizli köprü nesnesi
  kusurları (08.10.2026, `03_game.md` "KONSOL METİNLERİ İNGİLİZCE").** Konsol ve
  konsol komutu mesajları artık literal İngilizce (i18n değil → `T` dil değişimi
  etkilemez; Python çıktıları Türkçe kalır — parite davranışta aranır). Doğrulama
  sırasında iki GERÇEK kusur bulundu: (1) `game/scenes.js` `import_scene_tilemap`
  mükerrer Tilemap köprüsü yığıyordu — köprü `active=false` olduğundan
  `find_by_tag` (active filtreli, Python paritesi) bulamıyordu → `find_all_by_tag`
  ile arama; (2) `game/climber.js` `ClimbGame.start` skill pop-up'ını `find_by_tag`
  ile arıyordu ama popup inactive oluşturulduğundan `game.popup` hep null → **oyunda
  çift zıplama pop-up'ı hiç görünmüyordu** → `find_all_by_tag` ile düzeltildi.
  **Yeni kural: gizli/inactive yardımcı nesneleri bulmak için `find_all_by_tag`
  kullanılır** (kök `core.js` `find_all_by_tag` active filtrelemez, bilinçli).
  Testler: game **209 OK / 0 FAIL**, systems **73 OK**, core 50 / input 72 / ui 33 /
  audio 33 yeşil, smoke 0 HATA. *Etkilenen: MOTOR (console.js metinleri) + OYUN
  (climber popup, tilemap import) — devralınacak KALAN yok.*

- **[OYUN + MOTOR] Konsol UX + kampanya rozetleri düzeltildi (08.10.2026,
  `03_game.md` "KONSOL + KAMPANYA ROZETLERİ DÜZELTMELERİ").** Kullanıcı: "konsol
  açılınca yazının üstüne bişi biniyor; konsol panelinde mouse kaydırma olsun;
  kampanya ikonlarının altındaki yazılar iç içe geçiyor." *Konsol çakışması
  (`engine/console.js` — motor dosyası):* ipucu en yeni çıktının üstüne çiziliyordu
  → çıktı alanı yeniden yerleştirildi. *Fare kaydırma — gerçek kök neden
  `engine/input.js`'teydi:* `get_mouse_scroll` **örnek** metodu vardı ama oyun
  kodunun kullandığı **statik köprü hiç tanımlanmamıştı** → tarayıcıda her zaman
  0 dönüyordu; statik passthrough eklendi (JS uzantısı — Python'da yok;
  `ScrollContainer` da böylece tarayıcıda ilk kez gerçekten çalıştı). *Rozetler
  (`game/ui.js` `BiomeProgress.draw`):* font KÜÇÜLTMEK yerine yapıcı çözüm —
  etiketler hep 18px, taşmayı **boşluğun içeriğe göre genişlemesi** çözer
  (`dyn_gap = max(gap, en_geniş_etiket+8)`; satır merkezi korunur, her dilde
  otomatik). Doğrulama: core 50, game 0 FAIL, input 72, ui 33; tarayıcı-yolu
  probe (fake window + wheel eventi) kanıt. *Etkilenen: MOTOR (console.js +
  input.js) ve OYUN — devralınacak KALAN yok.*

- **[OYUN] TÜM ekran metinleri merkez semantiğine alındı — "kayma" sorunu bitti
  (07.10.2026, `03_game.md` "TÜM EKRAN METİNLERİ MERKEZLENDİ").** Kullanıcı: "yaptığın
  her şeyde yazılar kayıyor, bunu bir kez daha tekrarlama; game over'da da kaymış;
  hepsini direkt ortala." **Kök neden (tekrarlanmamalı):** `DE.TextRenderer(text,
  font_size, color, is_ui, shadow, center_x, center_y)` — **4. parametre `is_ui`,
  center_x/center_y 6./7. parametre.** center verilmezse metin position'dan SAĞA/ÜSTE
  akar. **Kural: tam ekran sahnelerde her TextRenderer `center_x=true, center_y=true`
  ve `yeni_y = eski_y + font_size/2`** (görsel konum aynı kalır). Düzelenler:
  game over t1/t2/hint (center hiç yoktu), victory t1–t4 (x=180/240/290/250 → 450
  hepsi merkezli), pause title/hint (center_y false → true), settings title + dil/
  efekt/müzik etiketleri + `%NN` val buton merkezine (292→308, 402→418) + dil butonu
  metni (168→180, click rect ortası), ana menü version satırı (15,575 → 450,582),
  climber HUD 4 satır (center_y false → true, y'ler fs/2 çekildi). **Bilinçli
  hariç:** builders.js sol-üst HUD (ScoreUI/HealthUI/GoalUI/InfoUI/PowerUpLabelUI/
  StreakUI — center=false korunur, köşeye hizalıdır) + oyun içi çizim metinleri.
  **Denetim testi `test_game.js` TEST13d:** 6 ekran sahnesinde (menü/ayarlar/game
  over/victory/pause/climber) her TextRenderer `center_x && center_y` zorunlu; live-bg
  HUD istisna set ile — yeni metin ekleyen bu testi geçemez. Doğrulama: **13/13 JS
  testi 0 FAIL**, Python core+climber ALL OK, parity **0 WARN/0 BUG/0 ERR**, tools/
  browser 0 FAIL. *Etkilenen: OYUN (game/ui.js, game/climber.js) — motor, builders,
  parite dokunulmadı.*

- **[OYUN] Game over ekranı butonlu menüye çevrildi (07.10.2026).**
  Kullanıcı: "game over menüyü de butonlu yapalım." Önceden sadece metin vardı
  (tıklanamıyordu, R/SPACE/M tuşlarıyla). Şimdi `build_game_over_scene` pause
  düzeninde: başlıklar merkez 450'ye hizalı (eski 280/310 kayıklığı düzeltildi),
  iki `DE.Button` — **Yeniden Dene** (350,290,200,46) + **Ana Menü** (350,350,200,46),
  altta kısayol ipucu satırı. `GameOverController` genişletildi: buton odak
  (↑/↓/S/W + ENTER/SPACE), klasik kısayollar (**R/M açık kaldı**), T ile dil
  değişimi (`set_text(..., null, false)` — buton boyutu sabit), buton click'i
  `click` sesi çalar. i18n: `game_over_retry` / `game_over_menu_btn` / `game_over_hint`
  (tr+en); eski `game_over_restart`/`game_over_menu` anahtarları duruyor (kullanım
  kalmadı, sonra temizlenir). Test: test_game'e **5 yeni kontrol** (2 buton, i18n
  metni, 350..550 simetri, on_click → restart fabrikası, dil değişiminde boyut sabit).
  Doğrulama: game 0 FAIL, smoke 0 HATA, core 50, input 72, ui 33, audio 33,
  tools 36, browser 50, parity 0/0/0. *Etkilenen: OYUN (game/ui.js).*

- **[OYUN+MOTOR] Dil değişiminde buton boyutu sabitlendi (07.10.2026).**
  Kullanıcı: "T ile dil değiştirmeyi kapatmayalım ama ana menü/ayarlarda T basınca
  butonlar metnin sığacağı kadar küçülüyor — butonlar sabit dursun." Kök neden:
  `DE.Button.set_text` metni yazarken `game_object.size`'i de metne göre yeniden
  yazıyordu (motor davranışı, Python'la aynı) → `KitLabelSync` her karede set_text
  çağırınca dil değişiminde butonlar (Play 280x54, Settings 280x46, geri, pause
  200x46) küçülüyordu. Çözüm: `set_text(text, ctx, auto_size = true)` — üçüncü
  opsiyonel parametre; `auto_size=false` metni günceller ama boyutu bozmaz (varsayılan
  true → eski davranış + test_ui "set_text boyut" kontrolü değişmedi). Oyun tarafı:
  `KitLabelSync.update` ve `PauseController` T bloğu `set_text(..., null, false)`
  çağırıyor. T tuşu (core.js global + pause içinde) **açık kaldı**. Dil butonları
  zaten TextRenderer (boyutsuz). Yeni test: `test_ui.js` "auto_size=false metin
  günceller / boyut sabit" (31→33). Doğrulama: ui 33, game 0 HATA, smoke 34/34,
  core 50, input 72, systems 73, audio 33, browser 50, tools 36, parity 0/0/0.
  *Etkilenen: MOTOR (engine/ui.js set_text imzası, JS fazladan opsiyonel parametre,
  Python'daki çağrılar 1 argümanla etkilenmez — bilinçli sapma #6 kapsamı, kayıt
  gerekmez çünkü Python'daki davranış `auto_size=true` ile birebir aynı).*

- **[OYUN+MOTOR] Ayar simetrisi + rozet taşması + MOBİL (dokunmatik) kontroller
  (07.10.2026, `03_game.md` "AYAR SİMETRİSİ + ROZET + MOBİL").** Kullanıcı: "ayarlar
  menüsünde butonlar ve bazı yüzdeler kaymış onları simetrik yap; kampanya ilerleme
  ikonları çerçeveye sığmıyor altından taşıyor; itchio'da telefon/tablette oynanabilsin
  mobil kontroller gerek, nasıl yapcaz?" (a) **Ayarlar simetri:** dil butonları merkez
  360/540'a (450'ye göre simetrik) + click rect metinle merkezli; [-]/[+] satırları
  378/450/478'e (merkez 450); Geri butonu 340'a kaydırıldı (x=450 iken merkez 560'dı).
  (b) **Rozet taşması:** `BiomeProgress` 300,556,24,62 → **245,524,22,52** (etiket
  satırı 602 → 568, ekran 600'ün içine girdi); üst bilgi bloğu 442/474/504'e tırmandı.
  (c) **Mobil 2 katman:** 1) **Sanal tuş API** (`engine/input.js`):
  `set_virtual_key_down/up/clear_virtual_keys` + `_virtual_held/down/up` setleri;
  `get_key/get_key_down/get_key_up` sanal setleri de okur (klavye gibi; end_frame'de
  down/up sıfırlanır); statik passthrough'lar eklendi. 2) **TouchControls bileşeni**
  (`game/ui.js`): touch cihazda etkin — sol altta analog joystick (A/D + yukarı itme
  SPACE), sağ altta 3 daire buton (Zıpla-A, Ateş-X, Dash-B, label latin);
  multi-touch pointer→buton map; `touch-action:none` + `preventDefault` (kaydırma/zoom
  yemeden); `_attach_touch(scene)` ile tüm oyun sahnelerine (scenes.js `_register_pause`
  ortak bağlaması + climber) eklenir; masaüstünde `_active=false` → no-op çizim/dinleme yok.
  (d) **index.html:** mobil `@media` ile 900x600 oranı korunarak pencereye sığdır
  (`width:min(100vw, 100dvh*1.5)`) + `touch-action:none`. itchio iframe'i inherit eder.
  **BİLİNÇLİ SAPMA #6 (JS birincil):** sanal tuş + TouchControls Python'da yok (dokunma
  yok); parity bozulmadı. Test: input 62→**72 kontrol (yeni sanal tuş bloğu)**, game 0 FAIL,
  core 50, smoke 34/34, audio 33, ui 31, systems 73, procedural 31, components 27, tween 33,
  math2d 38, tilemap 32, visual 16, browser 50, tools 36, parity **0 WARN/0 BUG**,
  Python core+climber ALL OK. *Etkilenen: OYUN (ui.js TouchControls, scenes.js,
  climber.js, index.html) + MOTOR (engine/input.js sanal tuş).*

- **[OYUN+MOTOR] Ana menü yeniden tasarımı + Ayarlar ekranı + ses seviyeleri
  (07.10.2026, `03_game.md` "MENÜ: PLAY/SETTINGS + SAĞ ALTA İKİ KUTU").** Kullanıcı:
  "sonsuz modu kilitli gösteren tam gri botun hoşuma gitmedi; sağ alta iki kutucuk
  ekle biri climber öbürü sonsuz mod olsun; üst kısımda sadece play, settings
  dursun." + "dili butonlu yapalım, ayrıca ses düzeyi ayarı ekleyelim — efekt ve
  müzik ayrı". Yeni ana menü: **üst-orta başlık + üst-sağda Play (`M_PLAY`) ve
  Settings (`M_SETTINGS`) motor kit butonları; sağ-altta Sonsuz Mod (`M_RND`) ve
  Star Climber (`M_CLIMB`) kutucukları** (Panel + merkez metin; kilitli Sonsuz gri
  "bot" DEĞİL — canlı mor panel + altın kilit ikonu + "Kampanyayı bitirince açılır");
  dil satırı menüden kalktı → Settings'e taşındı. Alt-orta bilgiler (kontroller,
  yüksek skor, kampanya rozetleri) solda, kutucuklarla çakışmaz. **Yeni Ayarlar
  sahnesi** (`build_settings_scene` + `SettingsController`): butonlu dil (TR/EN,
  aktif sarı vurgulu) + **efekt ve müzik ayrı ses seviyesi** ([−] %NN [+], adım 0.1,
  SaveGame'e `sfx_volume`/`music_volume` yazılır; main.js açılışta uygular). ESC/Geri
  ana menüye döner. **Motor uzantısı (`audio.js`):** `SoundFX.set_volume/get_volume`
  + `set_sfx_volume/set_music_volume` (efektler ortak `_sfx_gain`, müzik `_music_vol-
  ume` gain'e). **BİLİNÇLİ SAPMA #5 (JS birincil):** Python'da karşılığı yok, donmuş
  referans korunur; parity bozulmadı (JS'in fazladan API'si zorunlu değil).
  Testler: test_game **(TEST10/TEST17 menü kuralları korundu: M_CLIMB isimli kutu +
  "Climber" metni + klik zonları; 0 FAIL)**,
  core 50/50, audio 33/33, ui 31/31, smoke **34 tur 0 HATA** (mouse/menu-clicks
  turu yeni Play/Settings/iki kutu zonlarını sorunsuz geçti), browser 50, tools 36,
  tilemap 32, parity **0 WARN/0 BUG**, Python core+climber ALL OK.
  *Etkilenen: OYUN (ui.js menü+settings, main.js ses yüklemeleri) + MOTOR
  (engine/audio.js volume).*

- **[OYUN] Star Climber zorluk + görsel yenileme (07.10.2026, `03_game.md` "STAR
  CLIMBER: ZORLUK + GÖRSEL").** Kullanıcı: "play store minigameleri gibi zorlayıcı
  olsun; sadece space basarak yükseliyorum bu zor değil. player ana player olsun
  (gözler olmasın); arka plan mario/minecraft yeşili çevre, yükseldikçe astro."
  Kullanıcı zorluk mekaniği olarak **HAREKETLİ/ENGELLİ PLATFORMLAR** seçti:
  (a) **9. kattan itibaren** katmanlar ya **hareketli** (yatay sinüs sarkaç, %30),
      ya **dar** (56-78px, %22), ya **dikenli** (%16, temas = ölüm); kırılabilir
      oranı düşürüldü (%28→%18). (b) **Kamera hızlanır**: taban 52→66 px/sn +
      max_floor başına %1.2 (tavan ×1.8). (c) Dar katmanda ulaşılabilirlik örtüşme
      isteği dinamik (REACH_OVERLAP 70 → dar katmanda 36). Görsel: player
      **ana oyundaki gibi mavi yuvarlak gövde** (`ClimbPlayerVisual`, göz yok);
      arka plan **yeşil çevre → astro** (0-1 t, `BG_TRANSITION_H=2400px`);
      diken üçgenleri + hareket oku çizilir. Bilinçli sapma (JS birincil): Python'a
      eklenmedi. Doğrulama: test_game **(1 FAIL→düzeltildi, yeni 5 kontrol ekli,
      tümü OK)**, core 50, smoke 50/50, browser 50, tools 36, parity TAM.
      *Etkilenen: OYUN (climber.js zorluk/görsel + test_game.js TEST17).*

- **[OYUN] Üçgen rampalar üretimden kaldırıldı — kullanıcı kararı (07.10.2026,
  `03_game.md` "ÜÇGEN RAMPALAR KALDIRILDI").** Kullanıcı: "bu üçgen platformları
  kaldır demiştim? hala varlar". `procedural.js` üretim döngüsündeki
  `_pr_maybe_ramp` çağrısı kaldırıldı (fonksiyon tanımlı kalır → motor API/parite
  bozulmadı). **BİLİNÇLİ SAPMA #? #4:** Python `procedural.py` `_maybe_ramp` ile hálá
  üretir (donmuş referans), JS üretmez. RampVisual/PolygonCollider fiziği motorun
  parçası olarak DURUYOR (test_core eğim testleri 50/50, rampa editor'un özel
  seviyelerinde hálá kullanılabilir) — sadece prosedürel üretimde çıkmıyor.
  Doğrulama: test_game 194 (0 HATA), core 50/50, smoke 50/50, parity TAM.
  *Etkilenen: OYUN (procedural.js üretim döngüsü).*

- **[OYUN] Boss gövdelerinin köşeleri yumuşatıldı — Python ile parite fix'i (07.10.2026,
  `03_game.md` "BOSS KÖŞELERİ").** Kullanıcı: "bazı bosslar gene düz kare, onlar da
  diğer her şey gibi köşeleri yontulmuş dursun". Kök tespit: **Python `game/bosses.py`
  TÜM boss gövde/detaylarını `border_radius` ile çiziyor** (FlyingBoss gövde 8, gözler 4;
  SniperBoss gövde 8; ShieldBoss gövde 10; göz/ağız 2; kanatlar 2; sağlık barı 3) — **JS
  portu `bosses.js` bunu `_fill_rect` (keskin `fillRect`) ile çizerek port sırasında
  KAYBETMİŞ**. Düzeltme: `bosses.js` `_fill_rect`/`_stroke_rect`'e `radius` parametresi +
  `_round_rect_path` (roundRect/arcTo fallback) eklendi; beş boss sınıfının gövde/göz/ağız/
  kanat/bar çizimleri Python değerleriyle eşleştirildi (BossController gövde 8 + gözler 2 +
  bar 3; FlyingBoss gövde 8 + kanatlar 2 + gözler 4; SniperBoss gövde 8 + göz 2; CosmicBoss
  FlyingBoss'dan miras; ShieldBoss gövde 10 + göz/ağız 2 + bar 3). Bu BİR PARITE FİX'i
  (Python görünümüne dönüş), Python'a dokunulmadı. Doğrulama: test_game 194 (0 HATA),
  core 50/50, smoke 50/50, browser 50/50, tools 36/36, tilemap 32/32, parity **PARITE TAM**.
  *Etkilenen: OYUN (bosses.js boss çizimi).*

- **[MOTOR+OYUN] Zemin görseli: kare grid TAMAMEN KALKTI — eski yumuşak köşeli
  sprite tasarımı GERİ (07.10.2026, `02_engine.md` "Tilemap doku" + `03_game.md`
  "ZEMİN GÖRÜNÜMÜ").** Kullanıcı: "ben eski köşeleri yontulmuş yumuşak tasarımı
  istiyorum, bu kare grid değil; platformlar ince ama kareli görünüyor, görsel
  hatalı". Dün yalnız `textured=false` yapılmıştı (ızgara içi doku) — **yetersizdi,
  ızgara görünümü duruyordu**. Yeni karar: **tilemap sahnede SADECE veri köprüsü
  olarak durur, hiç çizilmez** (`scenes.js` `_attach_ground_tilemap`: `tm_obj.active =
  false`; aynısı `import_scene_tilemap` yeni-nesne dalında da). Eski düz zemin
  sprite'ları **artık gizlenmez** (`border_radius=4` yumuşak köşeler tekrar görünür;
  collider'lar fizik için zaten duruyor). `_tilemap_ground`/`_tilemap_segments`/
  `to_data` → web panel editör köprüsü AYNEN çalışır (yalnız görsel kapalı).
  **BİLİNÇLİ SAPMA:** Python donmuş referansı tilemap çizimi + sprite gizlemesini
  korur (görsel fark bilinçli JS kararı). Dokunulan: `game/scenes.js`,
  `test_game.js` ("katı zemin sprite'ları gizlendi" → "görünür (düz tasarım)"),
  `test_smoke.js` (kapı: "tilemap gorsel kapali + veri yine dolu + zemin sprite'lari
  gorunur"). Doğrulama: test_game **194**/194, core 50/50, smoke **50/50** (görsel
  kapılar), browser 50/50, tools 36/36, tilemap 32/32, parity **PARITE TAM**,
  Python testleri ALL OK. *Etkilenen: MOTOR (tilemap.js render kullanımı), OYUN
  (zemin görünümü), ARAÇ (test_smoke kapısı).*

- **[OYUN] Dash izi + biyom fiziği minimum + pencere taşması TAMAM (07.10.2026,
  `03_game.md` "DASH İZİ + BİYOM FİZİĞİ MİNİMUM + PENCERE TAŞMASI").** (1) Dash
  afterimage yaşlandırması her update'e taşındı → izler artık KALICI OLMUYOR
  (önceden yalnız dash bloğunda yaşlanıp donup kalıyordu). (2) `apply_biome` minimuma
  çekildi: `biome_gravity/jump=1.0`, `biome_wind=0.0` TÜM biyomlarda aynı (çift
  zıplama tutarlı); yalnız ice `grip=0.55` (kaygan) + çöl squash + **dash'te kum
  sıçraması**. (3) `index.html` canvas taşması: `calc()` içi çarpma `*1.5` eski tarayıcılarda
  geçersiz olup width'i iptal ediyordu → kullanıcının asıl isteği açığa çıktı:
  canvas pencereye ölçeklenip BÜYÜTÜLMESİN, **ham çözünürlükte (900×600, 1:1)
  sabit kalsın** → kesin çözüm: `width:900px; height:600px` (büyütme yok, taşma yok).
  4) **MOTOR render parite fix'i (engine/render.js TextRenderer.draw):** Python
  `blit` sol-üst köşe tabanlı iken JS `fillText` baseline tabanlıydı → üstteki
  yazılar (örn. y=18 42px "Star Collector Hero") ekran dışına taşıyordu. Top-left
  semantiği + ascent eklendi. Etkilenen: OYUN görünümü (03 oturumu) — motor
  kaydı için `02_engine.md`'ye de düşüldü. 5) **OYUN UI sapması:** Pause menüsü
  900x600 canvas'ta merkezlendi (önceden Python'dan sol-yaslı 800 panel + x=300/400
  değerleri; tarayıcıda sola kayık görünüyordu). Python `ui.py` donmuş referans
  güncellenmez — JS birincil, bilinçli sapma. **BİLİNÇLİ PYTHON
  SAPMASI:** Python donmuş referans özellikleri güncellenmedi (afterimage bug'ı +
  agresif biyom fiziği orada duruyor; yeni davranış JS birincil). Doğrulama:
  test_game **194**/194 (TEST18 yeni) · core 50/50 · smoke 0 HATA · tools 36/36 ·
  browser 50/50 · parity **PARITE TAM**. *Etkilenen: OYUN (entities/index.html),
  ARAÇ (test sayma).*

- **[OYUN] Star Climber v2 oynanış revizyonu TAMAM (06.10.2026, `03_game.md` 48).**
  Kullanıcı kararları: otomatik sekiş kalktı → **manuel SPACE zıplama** (coyote+buffer);
  kamera **sürekli 52px/sn yükselir** (asla inmez, üst kelepçe 96px); **checkpoint
  kaldırıldı**, her düşüş 0. katmana + rekor/best_floor korunur; **8. katmanda double-jump
  skill pop-up ile açılır**. **JS BİRİNCİL — Python `climber.py` donmuş referans** (parity
  şimdanları `add_level`/`on_platform_bounce`/`_camera_anchor_y` eklendi, `parity_check.py`
  → **PARITE TAM**). Doğrulama: test_game 190/190, test_browser 50/50 (4b DOM yolu yeniden
  yazıldı: girişsiz zıplama YOK + SPACE bot press+release), core/smoke/tools hepsi yeşil.

- **[MOTOR+OYUN] 5 OYUNU BOZAR parite fix'leri TAMAM + smoke stabil (06.10.2026,
  03.10 analizindeki A1-A5 kapandı).** Düzeltilenler: **(A1)** `audio.js` tembel
  `_ensure_initialized()` + `main.js` `SoundFX.initialize()`+`play_music("menu")`
  (Python main.py:78/86 paritesi) — **21 SFX + menü müziği artık çalıyor**; **(A2)**
  `input.js` fare `getBoundingClientRect` ile canvas uzayına çevrildi (tıklama/hover
  kayması durdu); **(A3)** `core.js` ESC işleme `scene.update()` ÖNCESİNE taşındı
  (core.py:113-123) + `game/ui.js` `PauseController.update`'ten ESC kolu KALDIRILDI
  (ui.py:698-718'de yok) → pause açılıp aynı karede kapanıp açılma bug'ı yok;
  **(A4)** `physics.js` zemin probuna AABB kapısı (py:293) + `_resolve_solid_collision`
  eğim dalı (py:334-348) → rampaya havada ışınlanma durdu; **(A5)** `core.js`
  `_ensure_lighting()` + `_render_frame`'de `render_lights` çağrısı + muaf sahne
  listesi → ışıklar canlı. **Smoke flaky'liği:** pause fix'i gerçek pause davranışını
  açığa çıkarınca `campaign/play`'in 40 karelik "a" sürüklenmesi oyuncuyu sol kenar
  boşluğuna düşürüp öldürüyordu (HEAD'de pause kapanmadığı için maskeliydi);
  `test_smoke.js` turu `a 12+d 12` denge adımına çevrildi → **10/10 arka arkaya
  temiz**. Regresyon: smoke 0 HATA · test_core 50/50 · test_game 185/185 ·
  test_input 62/62 · test_audio 33/33 · tools 36/36 · browser 47/47 · parite kapısı
  0 WARN/0 BUG/0 ERR. *Etkilenen: MOTOR (core/physics/input/audio), OYUN
  (main/scenes/ui), ARAÇ (browser testi).* Detay: `02_engine.md` + `03_game.md`.
  **Python'a dokunulmadı (dondurulmuş referans).**
  - Kullanıcı önceliği (ayni görüşmede): **HTML motor standalone öncelik** — Python
    silinmeyecek ama artık JS/HTML hattı asıl; sonra motif raporları fix + game feel.

- **[OYUN] PYTHON ↔ JS OYUN KATMANI PARİTE DENETİMİ BİTTİ (05.10.2026) — 10 betik,
  3 GERÇEK HATA + 1 GERÇEK FARK.** Kullanıcı: "her bir betiğe bak hem Python'da hem
  HTML motorda, her scriptin birebir aynı işleve yaradığını tespit et; sadece oyun
  dosyalarını incele." Kapsam: `game/*.py` ↔ `deep_engine_html/game/*.js` +
  `main.py`↔`main.js` + `__init__.py`↔`DE_GAME`. **Motor dosyalarına dokunulmadı**,
  hiçbir kod değiştirilmedi. Tamamlanan kayıt: `03_game.md` son bölüm.
  - **BİREBİR:** `state`, `entities`, `bosses`, `builders`, `ui`, `climber` (oynanış),
    `commands` (11 komut), `__init__` (işlevsel eksik yok).
  - **GERÇEK HATA 1 (kritik) — tüm SFX sessiz:** `game/main.js`
    `DE.SoundFX.initialize()` çağırmıyor (`main.py:78` çağırıyor) → `_sounds` boş →
    `SoundFX.play(...)` 21 sesin hiçbiri çalmıyor (click/win/jump/shoot/coin/hit).
    Müzik çalıyor (`play_music` kendi buffer'ını kuruyor). Çağrı yeri **oyun
    dosyası**, motor `audio.js` değil.
  - **GERÇEK HATA 2 — açılışta menü müziği yok:** `main.py:86` `play_music("menu")`
    çağırıyor, `main.js` hiç `play_music` çağırmıyor.
  - **GERÇEK HATA 3 — `import_scene_tilemap` "yeni nesne" yolu bozuk:**
    `scenes.js:143-147` `new DE.GameObject({...})` object literal kullanıyor; JS
    constructor konumsal (`core.js:103`) → `tag="Default"` (Python `scenes.py:152-154`
    → `"Tilemap"`), konum `(0,0)`, boyut `32x32`. Köprü `fresh`'ten kurulduğu için
    fizik doğru kalır (**sessiz hata**) ama `find_by_tag("Tilemap")` bulamaz →
    **her import mükerrer nesne ekler**. Mevcut test kapsamıyor (`test_game.js:501`
    yalnız tilemap'i olan sahneyi kontrol ediyor). `_attach_ground_tilemap`
    (`scenes.js:96`) doğru formu kullanıyor → hata tek dala yalıtılmış.
  - **GERÇEK FARK 4:** `next:"campaign_boss"` portalı — JS kayıtlı (`scenes.js:416`)
    → boss arenası; Python kayıtsız (`scenes.py:32-35`) → Zafer. Kampanya/sonsuz
    yolları etkilenmiyor (portal sonradan override ediliyor).
  - **Platform farkı (bilinen, kabul edilmiş):** RNG (`random.Random` ↔ `mulberry32`),
    tilemap deposu (dosya ↔ `localStorage`), pencere başlığı, boot logu yok.
  - *Etkilenen: OYUN (3 hata düzeltilmeyi bekliyor — kullanıcı kararı).*
    Motor denetimindeki "initialize() hiç çağrılmıyor → SFX yok" maddesi böylece
    kesin konuma bağlandı. `entities.js`'teki `CoinVisual` **hata değil** —
    03.10.2026 coin görünmüyor hatası için bilinçli eklenmiş görsel düzeltme.
  **Rapor yeri:** `deep_engine_html/PARITE_RAPORU.md` → **§7** (05.10.2026).
  Aynı dosyada bozuk+çift yapıştırılmış §6 kopyası ayıklandı (21 CR/TAB karakteri,
  128 satır) — içerik §1-6 ile aynıydı, kayıp yok.

- **[MOTOR] DAVRANIŞSAL PARİTE ANALİZİ BİTTİ (03.10.2026) — API paritesi "TAM" ama
  davranış paritesi TAM DEĞİL.** 20 motor dosyası çifti satır satır karşılaştırıldı
  (detay `02_engine.md` son bölüm). **5 OYUNU BOZAR:** (1) `audio.js`
  `initialize()` hiç çağrılmıyor → oyunda SFX yok; (2) `input.js` fare
  `clientX/Y` → tüm tıklama/hover kaymış; (3) `core.js` ESC update sonrası →
  pause aynı karede kapanıp açılıyor; (4) `physics.js` eğim zemin testinde AABB
  kapısı + `_resolve_solid_collision` eğim dalı yok → havada rampanya ışınlanma;
  (5) `lighting.js` `render_lights` hiç çağrılmıyor → ışıklar ölü. **ORTA:** pause
  `transparent` yok, `find_by_tag` active filtresi yok, hasar flaşı/ölüm sarsıntısı
  yok, parallax negatif modulo, RNG/lcg/stereo loop farkları, gamepad-A statik yok,
  sürüm 1.0.0 vs 0.1.19. Testlerin yakalamama nedenleri de raporlandı (testler
  initialize/coordinat instance tuzaklarıyla geçiyor, `parity_check` `_` metotları
  atlıyor). *Etkilenen: MOTOR (düzeltmeler JS'e), OYUN/ARAÇ bilgilendirme.*
  **Python'a dokunulmadı (dondurulmuş referans).**

- **[MOTOR+OYUN] 3 GÖRSEL HATA DÜZELTİLDİ + 40 KALICI GÖRSEL KAPI (03.10.2026,
  kullanıcı bildirimi: "paralaks yok, coin görünmüyor, platformlar keskin ve
  büyük").** Hepsi **gerçek tarayıcı** (Edge headless) ekran görüntüsü +
  piksel ölçümüyle doğrulandı, tahminle değil:
  - **Paralaks hiç çizilmiyordu:** `scenes.js` çağrı yerleri `{theme: "ice"}` **nesnesi**
    geçiriyordu, constructor tek metin alıyor → `layers.length = 0`. Çağrı yerleri
    düzeltildi + constructor iki biçimi de kabul ediyor. Ölçüm: gökyüzü renk
    çeşitliliği 33 → 285, dağ/orman katman renkleri görünür.
  - **Zemin her şeyin üstünde çiziliyordu** (`TilemapGround` son ekleniyordu) →
    zemine batan coin/oyuncuyu kapatıyordu. `z_index = -100` ile arkaya alındı.
  - **Coin görünmüyordu:** `DE_GAME.CoinVisual` (koyu altın kontur + nabızlı
    parlaması) eklendi. Sarı piksel 232 → 942.
  - **Platformlar büyük keskin bloktu:** `Tilemap.textured` (varsayılan açık) →
    yüzey şeridi + kontur, kenar şeritleri, derinlik gradyanı, karo dokusu.
    `textured=false` eski düz çizimi verir → Python parity'si bozulmaz.
  - **Kapı:** `test_smoke.js` artık yalnız hata değil **40 görsel kapı** da
    kontrol ediyor (her biyom: paralaks teması/katman, zemin z_index/doku/karo,
    coin üretimi/görsel bileşen/ekranda). Mutasyonla kanıtlandı (35/40 ve 30/40).
    Smoke: **34 tur, 9382 kare, ~5.1M canvas çağrısı, 0 hata**.
  - *Etkilenen oturumlar: 2 (motor — `engine/parallax.js`, `engine/tilemap.js`),
    3 (oyun — `game/scenes.js`, `game/builders.js`, `game/entities.js`).*

- **[MOTOR+OYUN+ARAÇ] PYTHON MOTORU DONDURULDU — JS BİRİNCİL (03.10.2026,
  kullanıcı kararı: "tüm py motoru tamamen js motora transfer et, artık html
  motordan devam edecez").** Artık yeni motor/oyun yeteneği **yalnız JS'e**
  (`deep_engine_html/engine/`, `deep_engine_html/game/`) yazılır. `deep_engine/` ve
  `game/*.py` donmuş **referans**tır (API kataloğu + regresyon testi).
  *Etkilenen oturumlar: 2 (motor), 3 (oyun), 4 (araç).*
  - **Kapı:** deep-tool **Modül 14 — Python/JS parite**. Python'da olup JS'te
    olmayan her sınıf/metot/fonksiyon `BUG` verir.
    `python tools\deep-tool.py --lang tr 14` (veya `python tools\parity_check.py`).
    Arac iki tarafı da **gerçekten yükleyip çıkarır** (Node introspection), metin
    tahmini yapmaz.
  - **Durum: PARITE TAM** (115 motor + 59 oyun sembolu), 0 WARN/0 BUG/0 ERR.
  - Kapatılan JS boşlukları: `Component` event sistemi (`on/once/off/emit`),
    `GameObject` sahne ağacı (`add_child/remove_child/find_child/world_position`),
    `Engine.run_async()/stop()`, `TextRenderer.start()`, `Particle.draw()`,
    `log.set_file/close_file/file_buffer`, `procedural.generate/pick_biome/
    generate_boss_arena` + `BIOMES/BIOME_NAMES/BOSSES/BOSS_TYPES`,
    `DE_GAME.floor_gap/floor_y/reset_floor_cache`, `DE_GAME.cmd_*`.
  - Testler: JS 12 dosya **584 kontrol** (402 motor + 182 oyun) yesil,
    `test_tools.js` 36/36, `test_browser.js` 44/44, Python iki test ALL OK.
  - **Tuzak:** JS `new DE.Engine(canvas, title, w, h, fps)` — ilk argüman canvas
    (`title` değil); yapıcı `canvas.getContext("2d")` ve `DE.DevConsole` gerektirir,
    headless testte sahte canvas + `console.js` yüklemesi şart.

- **[OYUN] Tarayıcı sürümü oynanamıyordu: "C" çalışmıyor, oyun ekrana sığmıyor,
  platformlar kaba (03.10.2026, kullanıcı playtesti).** Kullanıcı tarayıcıda
  (`index.html`) oynuyor ve menüden hiçbir şeye giremiyordu. Node'da **gerçek DOM
  olay zinciri** kuruldu; asıl kök neden bulundu: `MainMenu._start_climber()`
  `_fade_dir`'ı ayarlamıyordu (0'da kalıyordu) → karartma hiç başlamıyor →
  `update()`'in `_fade_dir == 1` şartı hiç sağlanmıyor → **sahne asla
  değişmiyordu** (C ve fare sessizce ölü). Düzeltme: `_fade=0` + `_fade_dir=1` +
  `_fading_out=True` (Py `ui.py` + JS `ui.js`). Yatay tuşlar zaten çalışıyordu
  (D 1 sn'de x 435→765) — oyuncu yalnız sahneye giremiyordu.
  **Kamera:** tırmanışta 1800 karenin 133'ünde (%7) oyuncu ekran dışındaydı
  (en kötü −46px); sebep sekiş tepesinin (~390px) katman çizgisini (372px) aşması.
  `FLOOR_LINE=0.72` + `PLAYER_TOP_MARGIN=96` ile `want = min(anchor−600*0.72,
  player.y−96)` → **0 dışarıda** (Py ve JS). **ESC** tırmanışta motoru kapatıyordu →
  `scene.on_escape` kancası (Py+JS) menüye döndürüyor. **Platform çizimi:**
  `ClimbPlatform.draw()` (gölge + sol/sağ pah + parlak üst yüzey + çatlaklar +
  kontrol noktası flama) + `ClimbBackdrop` (yan duvar + kat ayraçları) — piksel
  sayımıyla 20 farklı renk doğrulandı. **Canvas:** CSS `aspect-ratio: 900/600` +
  `max-width/max-height: 100vh` (dahili 900x600 çizimi **aynen korunur**, sadece
  görüntü ölçeklenir). **Motor paritesi:** `DE.Engine.set_scene()` sahneye
  `screen_width/height` atamıyordu (Python atıyor) → düzeltildi. Regresyon:
  **JS motor+oyun 561 kontrol / 0 hata** (`test_game.js` 174→**182**/182), Python
  `tests/test_climber.py` 9/9, `test_engine_core.py` ALL OK, tools 36/36,
  **browser 33→44**/44 (yeni **bölüm 4b**: gerçek `keydown` ile C → sahne → D/ok
  hareketi → 20 sn ekran dışı yok → ESC menü), üç araç 14 modülde 0/0/0.
  Ayrıntılı kök nedenler: `03_game.md` AÇIK RAPOR 4–8.
  → Yeni çapraz tuzak **#11** aşağıya eklendi (karartma/`_fade_dir` tuzağı).

- **[MOTOR+OYUN] Kamera/shake refactoru + SpawnIn koruması + STAR CLIMBER
  (03.10.2026, "yap hepsini").** (1) **MOTOR kamera:** `Scene.set_camera_target()` ilk
  karede hedefe **snap** eder (`camera_follow_point()`, `snap_camera_to_target()` —
  kick/shake'i de temizler); `_update_shake(dt)` trauma `1.4*dt` ile söner;
  `render_camera` **yalnız çizimde** kullanılır (mantık `camera_position` okur → zoom/pan
  sarsıntıyla kaymaz). JS eşi birebir + `shake_trauma` takma adı +
  `get_component()` geçersiz-tip guard'ı. (2) **SpawnIn koruması:** telegraf
  (`done=False`) sırasında düşman hasar vermiyor (Py+JS). (3) **STAR CLIMBER:** yeni
  Icy Tower tarzı sonsuz tırmanış oyunu — Python `game/climber.py` + JS
  `deep_engine_html/game/climber.js`, menüde `[C]`, engine'de yeni bağımlılık yok
  (mevcut `BreakablePlatform` + `BoxCollider(one_way=True)` + `ParticleEmitter`).
  Headless oynanış testleri **5 gerçek hata** buldu (hepsi düzeltildi: 0. katman
  oyuncunun altında değildi; sekiş hiç tetiklenmiyordu; kamera zıplama tepesine
  takılıp ölüm döngüsü yapıyordu; zemindeki oyuncu ölüyordu; respawn'da
  `max_floor` sıfırlanmıyordu). Toplam regresyon: **JS motor+oyun 553 kontrol / 0
  hata, `test_game.js` 174/174, `tests/test_climber.py` 9/9 (yeni — Python'da da
  ulaşılabilirlik + gerçek grounded sekiş + girişsiz tırmanış regresyonu),
  `test_engine_core.py` ALL OK, tools 36/36, browser 33/33,
  üç araç 14 modülde 0 WARN/0 BUG/0 ERR.** Tüm oturumlar uygular.
  → Yeni çapraz tuzak **#9** aşağıya eklendi (stable-ground / one_way tuzağı).
  → Yeni tuzak **#10** aşağıya eklendi (headless oynanış testi kuralı).

- **[ARAÇ+OYUN] Kalan backlog kapandı: Modül 6/7 denkliği + Tilemap veri katmanı
  (01.10.2026, "devam et, sıradaki tüm işi bitir").** İki iş birlikte bitti:
  (1) **Araç:** Modül 6'ya kanıtlanabilir sabit-küçük döngü tanımı (`range(4)`,
  `for(let i=0;i<4;i++)`, `for…of [1,2]`, `for…in (-1,1)`, dış veya iç döngüden
  biri `<=32`) → INFO "no O(n^2) risk"; **8 döngü** yeniden sınıflandı, dinamik
  döngü uyarısı duruyor. Modül 7'nin JS eşi **çok satırlı `from X import (...)`
  ve `import x as y`** biçimlerini yanlış "unused" sayıyordu → **13 yanlış pozitif**
  silindi; kalan 2 gerçek uyarı (`const os = require("os")`) de temizlendi.
  `deep-tool.py find` Windows konsolunda `UnicodeEncodeError` ile çöküyordu →
  stdout/stderr UTF-8'e alındı. **İki araç da 14 modülde 0 WARN/0 BUG/0 ERR.**
  (2) **Oyun:** `export_scene_tilemap()` / `import_scene_tilemap()`
  (`game/scenes.py` ↔ `scenes.js`) `Tilemap.to_data()`'yı oyuna bağladı; konsola
  `tilemap_save` / `tilemap_load` geldi (Py: `<user_data>/<isim>.tilemap.json`,
  tarayıcı: ayrı localStorage deposu `derinengine_tilemaps_v1` — oyuncu profilini
  kirletmez; isimler sanitize edilir). TEST14 9→11 komut + 8 check → **test_game
  125/125**. Toplam regresyon: **motor 365/365, test_game 125/125, tools 36/36,
  browser 33/33, `test_engine_core.py` ALL OK, iki araç 14×0/0/0.**
  Kapanan bayat kayıtlar: webpanel gizle/kilit + sürükle-bırak zaten `48163a5`'te;
  Modül 7 oyun tarafı zaten temiz; pygbag iframe adayı **iptal** (standalone HTML);
  `01_strategy.md` M5 kaydındaki "30 check" → **25** düzeltildi (gerçek artış 25).

- **[OYUN-HTML] M5: deneyim iyileştirmeleri 5–8 doğrulandı (28.09.2026,
  `01_strategy.md` [2] M5).** Kod tarafı (after-image, boss enrage aurası +
  zafer slow-mo 0.9/0.28 + zoom_punch, düşüş hız çizgileri, menü kampanya
  rozetleri + `completed_biomes`) **zaten birebir port edilmişti**; iş
  doğrulamaydı: `test_game.js` **TEST15** 25 check → **116/116**. Tuzak: menü UI
  nesneleri `build_main_menu_scene()` sonrası `_objects_to_add`'te bekler —
  `scene.start()` çağrılmadan `scene.game_objects` içinde görünmezler (rozet
  testi bu yüzden önce boşaldı). İkinci tuzak: oyuncu uzun boşluktan düşerse
  `position.y > 900` kurtarması devreye girip `respawn` yapıyor; iniş testi
  zemine yakın bırakılmalı.

- **[OYUN-HTML] M4: konsol komutları + motor `_frame` davranışları port edildi
  (28.09.2026, `01_strategy.md` [2] M4).** `game/commands.py` portu:
  `deep_engine_html/game/commands.js` (yeni, `DE.register_command` ile 9 komut:
  hp, heal, god, coins, speed, jump, tp, respawn, list; `tp` hız sıfırlar;
  index.html'e builders.js sonrası eklendi). motor `deep_engine_html/engine/core.js`
  eksik davranışlar Python `core.py` ile birebir: konsol aç/kapa
  (`BACKQUOTE`/`QUOTEDBL`; açıkken sahne donar, konsol üstte çizilir), `T` dil
  değiştirir + savegame'e "lang" yazar, `F3` debug katmanı (`_draw_debug_overlay`),
  `run()` sahne yoksa throw. Testler: test_game **TEST14** → **91/91**,
  test_browser BÖLÜM 4'e 2 boot konsol check'i → **33/33**, test_systems **S6**
  (motor `_frame` için sahte canvas+Input) → motor **365/365**, tools 24/24.
  Etkilenen: HTML portu bakımını yapan oturum (browser konsolu artık oyun
  komutlarını da çalıştırır). Pygbag `main.py` dalına gerek yok — main.js rAF
  döngüsü zaten doğal karşılık.

- **[OYUN-HTML] M3.1 görsel kontrol + gerçek boot testi — gizli MenuFX bug'ı
  yakalandı (28.09.2026, `01_strategy.md` [2] M3 sonrası; M1 KALAN kapanışı).**
  M1 "tarayıcıda görsel kontrol" görevi **tamamlandı**: `test_game.js`'e **TEST13
  görsel çizim smoke** — her sahne türü (prosedürel+tilemap, boss arenası, menü
  zoom+vinyet, sonsuz, zafer, oyun sonu, pause, FadeOverlay) Proxy stub canvas'a
  çizilir (`makeDrawCtx`), 78/78. `tools_html/test_browser.js`'e **`bootGame()`**:
  index.html sırasıyla engine+oyun dosyaları vm'de yüklenir, DOMContentLoaded ile
  `main.js` gerçekten boot edilir, rAF pump + keydown/up dispatch → yeni **BÖLÜM 4**
  (8 check). Bu boot testi **iki gerçek bug** yakaladı: (1) `builders.js`
  top-level `const _rgb` ↔ `engine/ui.js` top-level `function _rgb` paylaşılan
  global scope'ta `SyntaxError: Identifier '_rgb' has already been declared`
  fırlatıyordu → builders.js `_rgb` → `_rgb_arr` (10 kullanım) çözüldü; (2)
  `build_main_menu_scene`'de `scene._hud_ui` hesaplanırken `...scene._objects_to_add`
  dağıtılması **MenuFX'i** `_hud_ui`'ye sokuyordu → `MenuController.start()`
  `active=false` yapınca menü klavye girişleri hiç çalışmıyordu (P/SPACE menüden
  çıkamıyordu!). Çözüm: Python `ui.py:529` ile birebir — `_hud_ui` yalnızca
  `scene.game_objects`'ten filtrelenir (MenuFX henüz `_objects_to_add`'tedir →
  hariç kalır; HUD objeleri `_build_player`'dan gelip `game_objects`'tedir →
  gizleme korunur). İzole repro ile doğrulandı: 2 pump sonrası menü kamerası
  yakınlaşır, `P` sonrası `camera_manual=false`+`zoom_to(1.0)`+`set_vignette(0.22)`,
  HUD 0/7 gizli, menü 12/12 gizli. **test_browser.js 31/31, test_game 78/78, motor
  353/353, tools 24/24.** Etkilenen: `ui.js`, `builders.js`, `test_game.js`,
  `test_browser.js`; **Py motor ve Py oyun DEĞİŞMEDİ**. M4 sıra: `game/commands.py`
  + pygbag onaylı `main.py` giriş dalı.
- **[OYUN-HTML] M3 UI derinliği (28.09.2026, `01_strategy.md` [2] port planı
  M3).** `ui.js`: menü kamerası CLOSE-UP zoom (`MENU_ZOOM=1.8`,
  `camera_manual`, `_place_menu_camera`) + `set_vignette(0.5)`; kampanya
  başlayınca `camera_manual=false` + `zoom_to(1.0)` + `set_vignette(0.22)`.
  `FadeOverlay` bileşeni + MenuController çapraz geçiş alanları (`_fade`,
  `_fading_out`, `_pending_factory`) eklendi — **dormant, Python'la birebir**
  (Python'da `_pending_factory` hiç set edilmez). `engine/core.js`:
  `Scene.destroy` + `_objects_to_destroy` (Python `scene.py:117/381` eşi,
  FadeOverlay kendini siler). `scenes.js`: `_attach_ground_tilemap` (Python eşi)
  `build_procedural_level`'e bağlandı — zemin rect'leri 32px Tilemap'e rasterize
  (yüzey id1 + alt toprak id2), katı zemin sprite'ları gizlenir (one-way adalar
  kalır, çarpışmalar aynen), `_tilemap_ground`/`_tilemap_segments` köprüsü.
  **Boss giriş duyurusu İPTAL** (Python'da karşılığı yok — parite korunur).
  **`test_game.js` 75/75 ALL OK.** Süitler yeşil: motor 353/353 + browser 23/23
  + tools 24/24. Etkilenen: `core.js`, `ui.js`, `scenes.js`, `test_game.js`;
  **Py motor ve Py oyun DEĞİŞMEDİ**. M4 sıra: `game/commands.py` (konsol
  komutları) + pygbag onaylı `main.py` giriş dalı.
- **[OYUN-HTML] Boss M2 tamamlandı — gerçek boss arenası (28.09.2026,
  `01_strategy.md` [2] port planı M2).** `deep_engine_html/game/bosses.js` YENİ
  (Python `game/bosses.py` birebir portu): `BossController`/`FlyingBoss`/
  `SniperBoss`/`CosmicBoss`/`ShieldBoss` + paylaşılan boss bar/`_draw_enrage_aura`;
  canvas çizimleri (fillRect/arc/line). `builders.js`: `register_builder/extractor
  ("Boss", ...)` + `_build_boss` (Python `_build_boss` eşi: flying/sniper/cosmic
  trigger+rigidbody YOK, shield/archer Rigidbody+katı; `next`→`scene_key`;
  `on_boss_death` → slow-mo 0.28 + shake + `zoom_punch(1.18,0.35)` + patlama +
  portal unlock + `campaign_defeated` etiketi). `scenes.js`: `build_campaign_boss`
  M1 kabuğu → **gerçek arena** (`procedural_generate_boss_arena`; boss UI; ölümde
  aynı girişe dönüş; `_exit`: final→zafer, değilse sonraki biyom). **Motor
  `Scene`'e zoom katmanı eklendi** (Python `scene.py` eşi): `zoom_to`/
  `zoom_punch`/`set_vignette`/`flash` + `camera_zoom_target`/`_zoom_punch_timer`/
  `_vignette`/`hit_flash` + draw'da zoom ölçekleme + vinyet (gradyan feature-guard).
  `index.html`'e `game/bosses.js` (entities'ten sonra, ui'dan önce).
  **`test_game.js` 63/63 ALL OK** (TEST8b: arena kurulumu, boss tipi/hp, kilitli
  portal, ölüm→portal açılır+slow-mo+zoom punch, çıkış sonraki giriş, astro
  cosmic→zafer+endless_unlocked). Tüm süitler yeşil: motor 353/353 + browser 23/23
  + tools 24/24. Etkilenen: HTML oyun (3 dosya + index.html) + `core.js`;
  **Py motor ve Py oyun DEĞİŞMEDİ**. M3 sıra: menü zoom vinyetini kullanmak +
  FadeOverlay + tilemap + boss giriş duyurusu.
- **[OYUN-HTML] Star Collector Hero portu M1 oynanabilir çekirdek (28.09.2026,
  `01_strategy.md` [2] port planı).** `deep_engine_html/game/*.js` portu ilerledi:
  yeni `state` (paylaşımlı `DE_GAME.savegame()` tekil profili — Python tek
  `_save` karşılığı) · `entities` (PlayerController/HUD/GoalPortal/coin/streak/
  dash/ateş; `_spawn_float_score` dünya koordinat düzeltmesi) · `ui`
  (menü/pause/zafer/oyun sonu + MenuController, sonsuz kilidi) ·
  `scenes` (prosedürel seviye, kampanya zinciri Fisher-Yates + astro final,
  **boss M1 kabuğu** belgeli stub, Sonsuz Mod, restart/death wiring) ·
  `builders` (17 builder + extractor; **Boss builder M2'ye kadar yok**) ·
  `main`. **`test_game.js` 51/51 ALL OK**; tüm süitler yeşil: motor 353/353,
  browser 23/23, tools 24/24. Motor ekleri: `core.js` `_frame` ESC/`on_escape`
  (Python `_handle_escape` karşılığı), `input.js` statik `get_mouse_position`.
  Etkilenen: HTML oyun+2 motor dosyası; **Py motor ve Py oyun DEĞİŞMEDİ**.
  M1 KALAN: tarayıcıda görsel kontrol ✅ (M3.1'de TEST13 draw smoke + gerçek boot
  testiyle kapatıldı — üstteki kayıt; iki gizli bug bulundu); ayrıca `Scene.draw`
  kamera zoom uygulamıyor → M3'te menü yakınlaştırma/vinyet/FadeOverlay eklendi
  (M3.0).
- **[HTML MOTOR] G10 — input tam denkliği (28.09.2026, `01_strategy.md`).**
  kullanıcı isteği: "html motoru py motora denk istedim, yarım yamalak değil".
  `input.js` artık `input.py` ile birebir: **(a)** oyun kumandası (Gamepad API,
  `begin_frame()` kare başında tarama, analog eksen + ölü bölge 0.2, D-Pad→hat,
  buton kenar algılama, **Python BUTTON_MAP ile aynı** SPACE/ENTER→A·F→X·LSHIFT→LB·
  ESCAPE→Start), **(b)** `get_key_up`, **(c)** fare 3 buton, **(d)** klavye haritası
  (LSHIFT/RSHIFT·TAB·BACKQUOTE·QUOTEDBL·KPENTER·F1–F12), **(e)** `get_axis`/
  `get_hat`/`get_horizontal_axis`. **`test_input.js` 58/58 ALL OK**; 11 motor süiti
  353/353 + `test_browser.js` 23/23 + `test_tools.js` 24/24. Etkilenen:
  `deep_engine_html/engine/input.js` (yeniden yazıldı) + `core.js` (begin_frame);
  Py motor ve oyun değişmedi. **HTML motor artık bağımsız & py'ye denk** — [2] SCH
  tam portu sırada.
- **[ARAÇ] HTML motor denklik + gerçek tarayıcı davranışı testi (28.09.2026,
  `04_tools.md` madde 17).** kullanıcı raporu "web panelde diğer pencerelere
  tıklanmıyor, demo oyunda zıplanmıyor" → üç gerçek hata bulunup düzeltildi:
  (1) `end_frame()` hiç çağrılmıyordu (one-shot input durumları hiç temizlenmiyor);
  (2) `Scene.update` is_grounded'ı obje update'LERİNDEN ÖNCE sıfırlıyordu (py sırası
  kare-sonu çözüm); (3) `webpanel.html` file:// ile açılınca ham `%TEMPLATES%` →
  SyntaxError → tüm tıklamalar ölü. Çözüm: `core.js` `_frame` kare-sonu `end_frame`,
  is_grounded sırası py'ye eşitlendi; webpanel tipik `panel-data` JSON bloğu +
  güvenli varsayılanlar + `loadMods/loadLevel().catch` fallback. **Yeni
  `tools_html/test_browser.js`** (vm tabanlı, sıfır bağımlılık): demo zıplama/
  is_grounded/input edge + served sekme/modal/HTTP + raw file:// → **23/23 PASS**,
  `test_tools.js` 24/24 (degrade yok). **Etkilenen:** HTML motor `core.js` +
  `webpanel.html/js`; **oyun Py/JS koduna ve Py motoruna dokunulmadı.** ⏳ madde 17
  COMMIT sırada.
- **[ARAÇ] Oyun dışı araçlar JS/HTML'e port edildi — iki motor aynı güçte
  (28.09.2026, `04_tools.md` madde 16).** `tools_html/`: **deep-tool.js** (13 modül +
  find/new/run + `--api` + TR/EN; **hem `*.py` hem `*.js` tarar** — Modül 8 motor
  saflığı hem `deep_engine/` hem `deep_engine_html/engine/` için, Modül 4 i18n
  ikili, Modül 9 seed determinizm js `procedural.js`), **webpanel.js** (Node http,
  port **8766**; `webpanel.html`; route'lar birebir, `/api/scan|find|new|modules`
  aynı süreçte deep-tool.js çağrısı, `/api/script|run|launch` hâlâ python spawn),
  **test_tools.js** (24/24 PASS). Kısayollar: `deep-tool-js.bat`, `webpanel-js.bat`,
  `test-tools-js.bat`. Modül 1 syntax yalnız `.js` (py derlenemez), Modül 7 parity
  (AST-boş-except + unreachable multi-line skip; 314→13 WARN). **Etkilenen:** araç
  (py sürümleri 8765'te aynen durur), oyun/motor Py ve JS tarafı DEĞİŞMEDİ.
  ✅ COMMIT: `ef73b42` (push `88cfdcb..ef73b42`).

- **[HTML MOTOR] G8 (sistemler) + G9 (sürüm) tamam — G1–G9 bitti (28.09.2026,
  `01_strategy.md`).** scenemanager.js (SceneManager register/switch/push/pop +
  overlay), log.js (MotorLogger eşik + handler), i18n.js (TR/EN birebir tablo),
  savegame.js (localStorage), console.js (DevConsole + register_command +
  typed-text), audio.js (SoundFX → WebAudio: 21 preset ses + preset riff +
  algoritmik biyom stereo müziği), procedural.js (generate + generate_boss_arena:
  güvenli açılış bölgesi, zorluk ölçeği, boss tipi). Input'a typed-text eklendi.
  `test_systems.js` 47/47, `test_audio.js` 28/28, `test_procedural.js` 31/31.
  G9: `DE.__version__`/`__engine_name__` core.js. **10 test süiti ALL OK; 21 dosya
  tam tarayıcı yüklemesi OK.** Etkilenen: strateji (artık [1] bitti — [2] SCH portu
  sırada).

- **[HTML MOTOR] G7 UI kit tamam (28.09.2026, `01_strategy.md`).** ui.js: UITheme
  (varsayılan palet + override), Panel, Button (hover/press/focus/disabled + tıklama
  geçişi + ENTER aktivasyon), ScrollContainer (tekerlek + tutamaç sürükleme + on_pick +
  hovered_index + kırpma). Scene.draw artık UI nesnelerini (`_is_ui_object`) kameradan
  bağımsız, en üstte çizer (Python scene.py davranışı). Input.js Python ile eşitlendi:
  `get_mouse_button(b)` (basılı), `get_mouse_button_down(b)` (basılma anı),
  `get_mouse_scroll()`, `is_controller_active()`, `_gamepad_a_down()` + wheel eventi.
  `test_ui.js` 31/31. Tüm 7 test süiti ALL OK; 14 dosya tam tarayıcı yüklemesi OK.
  **Etkilenen:** strateji (G8/G9 kaldı).

- **[HTML MOTOR] G4+G5+G6 tamam (28.09.2026, `01_strategy.md`).** **G4:** tween.js
  (ease_* 9 fn + Tween + TweenComponent + _Chain zinciri) `test_tween.js` 33/33.
  **G5:** parallax.js (6 tema + kayan yıldız) + lighting.js (LightSource pulse +
  LightingEngine carve, mask önbelleği) `test_visual.js` 16/16. **G6:** tilemap.js
  (katman/get-set/place_at_world/solid_at/to_data/from_data/to_segments + culled draw)
  + levelfile.js (register_builder/place_object/save_level/load_level/extractor) +
  Scene'e kamera takibi + parallax_background bağlandı. `test_tilemap_levelfile.js`
  32/32. Tüm gerileme: test_core 12/12, test_math2d 38/38, test_components 27/27.
  13 dosya tam tarayıcı yüklemesi OK. **Etkilenen:** strateji (G7–G9 kaldı).

- **[HTML MOTOR] G2 + G3 tamam (28.09.2026, `01_strategy.md`).** **G2:** math2d.js
  (SAT/polygon/circle/segment) + physics.js'te CircleCollider + PolygonCollider —
  `test_math2d.js` 38/38 OK. **G3:** engine/components.js — Animator, KeyframeAnimator,
  BouncePad, Health (i-frame), Projectile, PowerUp, BreakablePlatform, SpawnIn,
  _AutoRemove; Scene.update artık **Python `_handle_physics_and_collisions` mantığı**:
  spatial grid (CELL=128) + `on_collision` bildirimi + statik solid çözümü (min_overlap/
  vy koşulları — BouncePad hayatta kaldı). `test_components.js` 27/27 ALL OK; gerileme:
  test_core 12/12, test_math2d 38/38. index.html'e particles.js + components.js eklendi.
  **Etkilenen:** strateji (HTML MOTOR planı G4–G9 kaldı) + araç (sıradaki motor işleri).

- **[STRATEJİ+HTML] Yeni plan: py motor eşitliği → SCH portu → tırmanma oyunu
  (28.09.2026, `01_strategy.md`).** Kullanıcı: "ikisini de plana yaz; önce py motorun
  tüm bileşenlerinin tamamını HTML yapalım." MASTER SIRADAKİ'ye **HTML MOTOR (05)**
  eklendi: G2–G9 grupları (çarpışma/SAT, oynanış bileşenleri, Tween, partikül+parallax+
  lighting, tilemap+levelfile, UI kit, SceneManager+consol+log+i18n+audio+savegame+
  procedural). Sonra: **SCH tam portu** (image dosyasız, kod-çizim şekiller birebir) ve
  **sonsuz tırmanma oyunu (Icy Tower mekaniği — kırılan platformlar)**. KARAR LOGU madde 12.
  **Etkilenen:** tüm oturumlar — yeni motor işleri HTML hattında.

- **[HTML MOTOR] DerinEngine HTML çekirdeği kuruldu (28.09.2026, `04_tools.md`).**
  İlk A1–A4 adımı: `deep_engine_html/` — saf tarayıcı JS, %0 kütüphane, Node(demo için
  gerekmez, geliştirmede var). Aynı Python API'si taşındı: `Vector2/Component/GameObject/
  Scene/Engine` (core.js), `SpriteRenderer/TextRenderer` (render.js), `BoxCollider/
  Rigidbody2D/Physics` (physics.js — min-nüfuz çözümü, one-way, max_fall), `Input` (input.js).
  Demo: `index.html` + `demo/main.js` — kutu (+çift zıplama) kutu zıplama sahnesi
  (yerçekimi 1400, jump 620 — Python SCH değerleri). Doğrulama: `node --check` 5 dosya OK,
  `node deep_engine_html\test_core.js` 12/12 `ALL OK` (düşme/zıplama/motor/çift zıplama/
  one-way/max_fall). commit `TBD`.
  **Fizik bug'ı yakalandı:** solve'de kendi collider'ı solids listesine dahil olunca oyuncu
  kendini taşıyordu → `s === rb.collider` atlaması; ayrıca Y-ekseni velocity sıfırlamıyor,
  X-ekseni dikey nüfuzu duvar sanıyordu → min-nüfuz (dxL/dxR/dyT/dyB) çözümü.
  **Etkilenen:** tüm oturumlar — yeni motor işleri HTML hattında planlanacak.

- **[STRATEJİ] Büyük dönüm kararı — DerinEngine HTML motoru başlıyor (28.09.2026,
  `01_strategy.md`).** Kullanıcı: mevcut Python motorunu git'e kaydet (git=`33bfd85`,
  temizdi), sonra **DerinEngine HTML**'i başlat; gelecekte DerinEngine 3'e kadar
  evrilecek. **Python motor (1.0.0) artık bakım hattı** (yeni özellikler o tarafa
  ağırlıklı yazılmayacak); **yeni ana hat = saf tarayıcı JS motor** (Canvas2D/WebGL/
  WebAudio/localStorage; %0 ek kütüphane; Node gerekmez; demolar tek index.html).
  Aynı motor API'si (Engine/Scene/GameObject/Component + fizik + tilemap `.map` +
  UI kiti) taşınacak. Gerekçe özeti: 3D/voxel/`.map` WebGL'de kütüphanesiz mümkün,
  JS JIT + GPU çizimi Python'dan hızlı, kurulum/dağıtım tek klasör.
  **Etkilenen:** tüm oturumlar — yeni işler önce HTML motorunda planlanacak.

- **[OYUN] Menü Sonsuz Mod satırı motor UI kitine taşındı (28.09.2026, `03_game.md`).**
  `build_main_menu_scene`'de M_RND satırı (`_menu_item` metin satırı) artık Kit `Button`
  ('deep_engine/ui.Button') ile kuruluyor: kilitliyken `enabled=False` gri buton +
  LockIcon + kilit uyarısı, açıkken hover/press durumları + tıkla endless. Tıklama yine
  aynı `_click_rect/_click_action` üzerinden MenuController `_dispatch_action` ile yürüyor
  (kit'in kendi on_click yok; davranış değişmedi). Yeni küçük bileşen `KitLabelSync`
  (Button metnini i18n key ile senkron tutar — T ile dil değişince buton metni güncellenir).
  Doğrulama: py_compile OK, task test MENU_BUTTON_OK + MENU_UNLOCKED_OK + KIT_SYNC_OK +
  menü 90 frame headless OK, deep-tool `--lang en all` **0 WARN / 0 BUG / 0 ERR**.
  commit `33bfd85`.

- **[MOTOR+OYUN] 4'lü grup işi tamamlandı (27.09.2026, `02_engine.md` + `03_game.md`).**
  Kullanıcı: "yap hepsini" (tilemap zeminleri + overlay pause + motor-UI kiti + Event/Tween
  test). **(A) Gerçek tilemap zeminler:** `build_procedural_level` artık Ground rect'lerini
  32px grid'e rasterliyor (`_attach_ground_tilemap`): üst yüzey = biome platform rengi,
  alt toprak = platform_alt; solid Ground sprite'ları gizleniyor (`SpriteRenderer.visible`
  — motor özellik, collider kalır), one-way adalar görünmüyor. **(B) Overlay pause:**
  `Scene.transparent` + motor ESC `on_escape` kancası + `SceneManager.push/pop` (tek-overlay).
  ESC oyunda pause açar (`Pause` sahnesi = Panel + UI Kit `Button`), menüde çıkış korunur;
  pause açıkken oyun sahnesi donuk alt katta çizilir, lighting pause'ta çizilmez. **İki ESC
  durumunu** her oyun sahnesi `scene.on_escape` ile yönetir (`menu_idle` ayrımı).
  **(C) Boss ölümü** `zoom_punch(1.18, 0.35)` (kamera çekmesi, slow-mo ile birlikte).
  **(D) Event+Tween test:** yeni `tests/test_engine_core.py` → `python tests\test_engine_core.py`
  = `ALL OK`. doğrulama: deep-tool **0 WARN / 0 BUG / 0 ERR** (tüm modüller). commit `30feff6`.
  Dokümantasyon: oyun KALAN maddesi (boss zoom_punch) tamamlandı; `02_engine.md` HEDEF kayıtları.

- **[MOTOR] Meh/Motor deep-tool DEVİR GÖREVİ tamamlandı (27.09.2026, `02_engine.md`).**
  Kullanıcı: Önceki motor işi commit sonrası MOTOR KALAN'ı bitir. **(1) Sessiz
  except'ler bilinçlendi (20 nokta):** `audio.py` (5), `components.py` (4), `core.py`
  (3), `savegame.py` (2) → `log` importu eklendi; hatalar `log.debug`/`log.warn` ile
  motor.log'a düşüyor (oyun davranışı değişmedi). `log.py` (6) — logger kendi içinde
  log çağıramaz (sonsuz döngü) → `pass` yerine akış ifadeleri (handle None/continue/
  return). Sonuç: `deep_engine/` tarafında Modül 7 "boş except" listesi **tamamen
  sıfırlandı**. **(2) Ölü import `_m`:** zaten yoktu. **(3) Modül 6 O(n²):** tüm satırlar
  incelendi → sabit-küçük/sabit-list/cull = yanlış pozitif, collision zaten uzaysal grid
  (CELL=128) → kod değişmedi; ARAÇ tarayıcı önerisi `04_tools.md` KALAN'a eklendi.
  Doğrulama: py_compile 32 dosya OK, deep-tool --lang tr all **0 WARN/0 BUG/0 ERR**,
  menü 180 frame + ses/log yolları headless OK. **Etkilenen:** oyun/araç oturumları —
  `game/main/webpanel` tarafı boş-except listesi onlara ait (kendi oturumlarında).
  ⏳ **COMMIT+PUŞ bekliyor.**

- **[MOTOR] İki bekleyen motor özelliği tamamlandı (27.09.2026, `02_engine.md`).**
  Kullanıcı: commit+push sonrası kalan KALAN'ları tamamla. **(6) Veri katmanı:**
  `Tilemap.to_data()/from_data()` (JSON-safe roundtrip) + `to_segments()` — dolu
  hücrelerin dış sınır segmentlerini üretir (iç kenarlar cull; boş = tile_set'te
  rengi olmayan ID, `draw()` ile tutarlı). `.map` köprüsünün veri/geometri adımı.
  **(7) Motor-UI kiti:** YENİ `deep_engine/ui.py` — `UITheme` (override edilebilir
  palet), `Panel` (yuvarlak panel), `Button` (hover/press/focus, mouse tık +
  ENTER/gamepad-A, `enabled`/`on_click`), `ScrollContainer` (madde listesi, clip
  + scrollbar: wheel + handle drag, `on_pick`). `Input.get_mouse_button()` (basılı
  tutma) eklendi. Yeni exportlar: `UITheme`, `Panel`, `Button`, `ScrollContainer`.
  Doğrulama: py_compile 32 dosya OK, `deep-tool --lang en all` → **0 WARN, 0 BUG,
  0 ERR**, testler TEST1/TEST2_OK + BUTTON_CLICK/SCROLL_PICK/SCROLL_DRAG/UI_DRAW/
  UI_KIT_OK, oyun menüsü 120 frame headless OK. **Etkilenen:** motor (dotcom) —
  oyun kodu gönüllü değişmedi; kiti oyunda kullanmak ayrı görev (`03_game.md`).
  ⏳ **COMMIT+PUŞ bekliyor** (kullanıcı onayı).

- **[OYUN] Rampa + keyframe + biyom fiziği + kampanya ilerleme haritası tamamlandı
  (27.09.2026, `03_game.md`).** Kullanıcı: son KALAN kolonu "continue" → sırayla:
  **(a)** Prosedürel seviyeye eğimli rampa bölümü: `builders._build_ramp` (`RampVisual`
  üçgen bileşeni + `PolygonCollider`), `procedural._maybe_ramp` (%30, safe-zone dışı,
  slope ±1, tepe coin) → RAMP_GEN_OK (40 seed/53 ramp) + RAMP_BUILD_OK. **(b)** Flyer
  bob'u `KeyframeAnimator`'a taşındı (`_build_flyer`) → FLYER_KF_OK. **(c)** Müzik tema
  bağlama merkezileşti: `scenes._play_theme(biome, is_boss, fallback)` (procedural/boss/
  endless tek yerden). **(d)** Biyoma özel fizik: `PlayerController.apply_biome()` —
  `biome_gravity/jump/grip/wind` çarpanları (ice kaygan, cave ağır, desert rüzgârlı,
  astro düşük-yerçekimli), oyun akışında `data["biome"]` ile bağlandı → BIOME_PHYS_OK.
  **(e)** Kampanya ilerleme haritası (deneyim 8): menüde 5 biyom rozeti
  (`ui.BiomeProgress`), boss yenilince savegame `completed_biomes` listesi kalıcı →
  COMMIT_SAVE_OK + MENU_BOOT_OK. Doğrulama: py_compile 31 dosya OK, `deep-tool
  --lang en all` → **0 WARN, 0 BUG, 0 ERR** (DEVİR temizliği de bitti). **Etkilenen:**
  oyun + i18n (`campaign_progress`, `biome_*` — TR/EN). COMMIT+PUŞ bekliyor
  (önceki motor 2–5 batch'i ile birlikte, webpanel dahil).

- **[MOTOR] Özellik 2–5 + slopes tamamlandı (27.09.2026, `02_engine.md`).** Kullanıcı: "hepsine
  başla, 1-1,5 saat dışarıdayken çal" → 5 yeni motor yeteneği eklendi + doğrulandı:
  **2) Çokgen/daire/segment çarpışma** (`PolygonCollider`/`CircleCollider`, SAT,
  `scene.py` generic çarpışma hattı), **3) Sahne ağacı + SceneManager** (parent/child
  hiyerarşisi, lokal konum + `world_position`, push/pop overlay sahne yığını, `Scene.active`),
  **4) Keyframe animasyon** (`KeyframeAnimator` — tween eğrileriyle sayı/renk/Vector2
  interpolasyonu, path alias `sprite.color`), **5) Tilemap + katman + kamera fx** (YENİ
  `deep_engine/tilemap.py`, ızgara katmanları + ekran kesme (culling), `zoom_punch`),
  **slopes/eğik zemin** (`_polygon_surface_y` rampa yüzeyi; karakter rampa boyunca smooth
  yürür). Yeni exportlar: `CircleCollider`, `PolygonCollider`, `SceneManager`,
  `KeyframeAnimator`, `Tilemap`. Doğrulama: py_compile OK, `deep-tool --lang en all`
  0 BUG/0 ERR, endless 64 obje 180-frame sim OK, headless Engine 30 frame OK, testler
  `COLLIDER_MATH_OK`/`SCENE_TREE_OK`/`KEYFRAME_OK`/`TILEMAP_OK`/`SLOPE_OK` geçti.
  **Etkilenen:** motor katmanı (deep_engine/) — oyun kodu DEĞİŞMEDİ (geriye uyumlu);
  yeni yetenekleri oyunda kullanmak ayrı görev → `03_game.md` KALAN'a eklenecek.

- **[SİSTEM] Gemini + Antigravity tamamen temizlendi (27.09.2026).** Kullanıcı: "gemini+agy ile
  başlamıştık ama artık opencode'dayız; onlardan kalan projeyle ilgili bi şey varsa incele,
  gereksizse sil — sadece opencode kalsın." Tarama sonucu: eski **MiniEngine** (DerinEngine'in
  önceki hayatı) kuruluş tarihçesi `.gemini` içindeydi; `implementation_plan.md` (Editör Crash +
  Motor Kapasitesi) değerli tek belgeydi ama tüm fikirleri DerinEngine'de **zaten mevcut**
  (saflık kuralı, `scene.py` shake, `components.py` Animator/Event/Tween, builders JSON) —
  kayıp bilgi yok. `01_strategy.md` "NOT (veri)" güncellendi. Silinen: `C:\Users\token\.gemini`
  (38,3 MB) + `AppData\Roaming\antigravity` (19,3 MB) + `AppData\Local\antigravity` (4,3 MB).
  Masaüstü `galeri\Gemini_Generated_Image_*` kullanıcının kişisel görselleri — DOKUNULMADI.
  **Etkilenen:** proje kodu/oyun yok; sadece dış ajan kalıntıları temizlendi.

- **[ARAÇ] webpanel editörü gerçek oyun motoru UI oldu (26.09.2026, `04_tools.md` madde 14).**
  Godot/Unity hissi: sol **Sahne hiyerarşisi** (tip noktası + ad + ↑/↓ çizim sırası,
  eski düz liste kaldırıldı), üst **toolbar** (Kaydet Ctrl+S / Farklı Kaydet / Geri al /
  Yinele / Çoğalt / Sil + zoom sığdır + ızgara seçici), sağ **Inspector** (hızlı butonlar),
  alt durum çubuğu (imleç coords + seçili). **Undo/redo** eklendi (60 snapshot; Ctrl+Z,
  Ctrl+Shift+Z/Ctrl+Y, Ctrl+D çoğalt, Delete sil, Esc seçim bırak). **Etkilenen:** sadece
  webpanel (araç) — oyun/motor yok. Doğrulama: py_compile + `node --check` JS_OK + 10 UI
  kimliği sayfada + API 200. 8765 yeni kodla çalışıyor (F5). COMMIT+PUŞ bekliyor.

- **[ARAÇ] webpanel UX paketi (26.09.2026, `04_tools.md` madde 13).** deep-tool'a
  **`--api modules`** eklendi (gerçek TR/EN modül adları) → webpanel çipleri artık
  canlı; tarama çıktısı renkli (W/B/E/i); tarayıcı otomatik açılıyor (çifte tık
  için `webpanel.bat` eklendi); 8765 doluysa yumuşak davran; log sekmesi "canlı
  izle". 17 test + `--lang en all` 0/0/0. **Etkilenen:** araç dışı kod yok; sunucu
  yeni kodla yeniden başlatıldı (sayfa F5 yeterli). ✅ Commit+push: `5fb747f` (+`3e7869c`).

- **[ARAÇ] deep-tool arayüzü web paneline geçti (26.09.2026, `04_tools.md` madde 12).**
  deep-tool'a **`--api` JSON modu** eklendi (`scan`/`find`/`new` → yapılandırılmış çıktı;
  CLI davranışı aynı). Web panelindeki deep-tool sekmesi artık tam arayüz: 13 modül
  çipi + "Tümünü tara", Bul (kelime→dosya:satır), Üret (script/dir, var olanı silmez),
  Başlat (oyun veya .py). Yeni API'ler: `/api/scan`, `/api/find`, `/api/new`, `/api/run`.
  **Etkilenen:** araç dışında kod/oyun YOK. Doğrulama: scan all 13 modül 0/0/0, tüm
  route'lar py test ile OK, `--lang en all` regresyonu temiz. Not: 8765'te eski
  webpanel süreci kalmıştı, kapatıldı — **sunucuyu kapatmak için Ctrl+C**.

- **[ARAÇ] deep-tool alt-araçları hayata geçti (26.09.2026, `04_tools.md`).** Menüdeki
  "[yakında]" `new`/`find`/`run` gerçek oldu: **`new`** script şablonu veya dizin üretir
  (var olana dokunmaz), **`find`** kelime → dosya:satır bulur (salt okunur), **`run`**
  bilinen script'leri başlatır (`game`/`webpanel`/`tool` veya .py yolu). CLI: `deep-tool
  find KW [klasor]`, `deep-tool new script yeni.py`, `deep-tool run game`. **Etkilenen:**
  kod ve oyun davranışı YOK — sadece araç yetenekleri eklendi. Web paneli aynı
  özellikleri alacak (kullanıcı söylediğinde).

- **[ARAÇ] dead-code modülü yanlış sinyalleri temizlendi (26.09.2026).** `[11] Olu kod`
  ilk sürümü "2 referans" olanları da şüpheli listeliyordu; çıktıda 18 giriş oldu ve
  HEPİSİ aslında kullanılıyordu: `tween.ease_*` → `_EASING` kayıt sözlüğü,
  `commands.cmd_*` → `_reg(...)` komut kaydı, `webpanel.Handler` → HTTP sunucusu.
  Kural netleştirildi: **yalnızca 1 referans (sadece tanım satırı) = kesin ölü aday**;
  2+ referans = kayıt/çağrı ile kullanılıyor → listelenmez. Module 11 artık "temiz"
  raporluyor. (Gerçek tek bulgu zaten silinmişti: `save_scene_to_path`.)

- **[ARAÇ] menü düzeltmesi (26.09.2026).** Check menüsü ekranında `[10]` iki kez
  çıkıyor, `[20] TÜMÜNÜ TARA` kayıptı: `_check_menu_loop`'ta sabit `print(t("menu_10"))`
  satırı eski "Scan ALL" için kalmış, modül eklerken güncellenmemişti →
  `menu_20`'ye çevrildi. Doğrulandı: `[10]` tek, `[20]` mevcut.

- **[ARAÇ] deep-tool'a +4 tarama modülü (10-13) eklendi (26.09.2026, `04_tools.md`).**
  Kullanıcı isteğiyle: **[10] Gizli bilgi taraması** (anahtar/token/şifre + `.env`),
  **[11] Ölü kod** (çağrılmayan üst-seviye def/class'lar), **[12] Karmaşıklık özeti**
  (en büyük dosya/yapılar), **[13] Çökme trendi** (motor.log tekrar eden traceback'ler).
  Menü **20 = TÜMÜNÜ TARA** oldu; eski/etkisiz `menu_7 "Scan ALL"` kopyaları silindi.
  İlk gerçek bulgu: `levelfile.save_scene_to_path` (2 satırlık geri-uyumluluk takma adı)
  hiç çağrılmıyordu → kullanıcı onayıyla **silindi** (`save_level` geçerli tek API).
  Doğrulama: `deep-tool --lang en all` → **13/13 modül 0 WARN, 0 BUG, 0 ERR**.
  **Etkilenen:** hiçbir oyun/motor davranışı; sadece araç + ölü motor fonksiyonu.

- **[ARAÇ] deep-tool olgunlaştırıldı: 93 WARN → 0 (26.09.2026, `04_tools.md`).** Kod
  tarafı DOKUNULMADAN sadece kural taraması gerçeğe oturtuldu: (a) `_SILENT_EXCEPT`
  (regex) kaldırıldı — AST "empty except" ile ÇİFTE sayıyordu; (b) "empty except" +
  "file open inside loop" kuralları artık `# noqa` işaretini tanıyor (bilinçli
  fallback'ler INFO); (c) nested-loop tespiti INFO (yanlış pozitif — spatial grid ve
  vinyet gibi yapısal kodlar); (d) `_BUILTINS`'e istisna hiyerarşisi eklendi
  (KeyboardInterrupt yanlış "tanımsız isim"dü); (e) builder/extractor'da Coin/Player/
  Spikes bilinçli-eksik → INFO. Sonuç: **0 WARN, 0 BUG, 0 ERR** her modülde.

- **[TÜM PROJE] Güvenli temizlik çalışması — TAMAMLANDI (26.09.2026).** Kullanıcı:
  "tüm proje dosyaları ve belgeleri kompakt olsun, spagetti varsa çöz." Yapılanlar:
  (a) `parallax.py` kullanılmayan `import math as _m` silindi; (b) 33 bilinçli
  `except...: pass` fallback'ine `# noqa: bilinçli` etiketi kondu (davranış değişmedi,
  ancak "bilinçli mi?" sorusu kodda cevaplı); (c) `audio.py` önbellek-yazma `# noqa`;
  (d) `repo_preview.png` kaldırıldı (private repo'da ölü dosya; lokal tepe durur);
  (e) deep-tool kural iyileştirmeleri (üst kayıt). Çift-döngü WARN'ları incelendi ve
  HEPİNİN yapısal/bilinçli olduğu doğrulandı (spatial grid, vinyet, raycast). Karar:
  entities.py'yi bölmek REDDEDİLDİ (risk/satır-fayda oranı kötü). Doğrulama: tüm proje
  py_compile OK, kampanya giriş sahnesi 90 kare headless hatasız, deep-tool 0 WARN.
  Sonraki oturumlar unuttursun: **fallback except'ler `# noqa` ile işaretli** bırakılır;
  session'ların (150-220 satır) ve AGENTS.md'nin (77) "kompakt" olduğu doğrulandı.

- **[MOTOR + OYUN] Hata Avı: yüzeye gömülme fix + turret yoğunluğu dengesi (26.09.2026 —_
   MOTOR 02 (madde 22) + OYUN (rapor 2/3 kapanışı).** Kullanıcının seçtiği dönem işi.
  Oyuncunun ince tek-yön platforma hızlı düşüşte altına gömülmesi MOTOR'da çözüldü:
  `Rigidbody2D.max_fall_velocity=1800` + tek-yön eşiği kalınlık-bilinçli
  (`<= max(4, h+6)`) + derin nüfuzda merkez kuralı. Turret yoğunluğu motor formülüyle
  seyreldi (`count=randint(1,1+difficulty)`) ve mor düşman girişi kademeli: 1. boss
  öncesi hiç yok, 1. boss sonrası (d2) seyrek (~%40 chunk), 2. boss sonrası (d3+)
  tam ağırlık. Etki: sarsıntı/tünel bug'ı giderildi; ilk seviyeler sakin, mor düşman
  yavaşça tanıtılıyor. Doğrulamalar `02_engine.md` madde 22'de; OYUN tarafı
  değişkenlik gerekmedi. Özellikle MOTOR oturumları bu fizik/üretici koduna
  dokunmadan önce o raporu okusun.

- **[OYUN + MOTOR + ARAÇ] Oyun içi "custom level" akışı TAMAMEN kaldırıldı (25.09.2026).**
  Kullanıcı: "oyun içi C'yi de kaldır, costum level istemiyorum; oyunda sadece P
  (kampanya) + 4 (Sonsuz) + T (dil) olacak; editör falan PANELDE kalacak." Yapılanlar:
  **(a)** `game/ui.py`: menüdeki `[C] Özel Seviye` satırı (MC), `_dispatch_action`
  "custom" dalı ve klavyedeki C kısayolu kaldırıldı; boşalan yere `[T] Dil` satırı
  taşınmıştı (zaten) — menü şimdi P + 4 + T. Kullanılmayan `_start_mode` (fade'li
  geçiş) silindi. **(b)** `game/builders.py` `build_custom_level` + portala spawn
  ışınlama + `ensure_custom_levels_dir` + `_finalize_custom_plain` + `_CUSTOM_GOAL_TEXT`
  silindi; `_finalize_custom_scene` → `_finalize_goal_ui` (prosedürel seviyelerin
  hedef yıldız UI'ı) adına kavuştu. `_build_player` restart-artık menüye düşüyor
  (gerçek senaryolar kendi factory'lerini override eder). **(c)** `game/state.py`:
  `LEVELS_DIR`/`DEFAULT_LEVEL_PATH` + "custom" mod tanımı kaldırıldı; `scenes.py`
  `restart_path=DEFAULT_LEVEL_PATH` geçişleri ve import temizlendi. **(d)**
  `game/commands.py`: `levels` + `load` komutları silindi (14→12 komut); `main.py`
  `ensure_custom_levels_dir` çağrısı kaldırıldı; i18n `menu_custom` (TR+EN, 62→61/61)
  ve `deep_engine/input.py` gamepad "C" map'i temizlendi. **(e)** `tools/webpanel.py`
  **işlevi aynen**; sadece "oyunda konsol: load X" ipuçları çıkarıldı (oyun artık
  yüklemiyor — web panel kendi başına seviye tasarım aracı). README + AGENTS.md
  kontrolleri güncellendi. Doğrulama: py_compile, headless boot (menü P→kampanya,
  T dil), `start_campaign`/`build_endless_level`, 12 konsol komutu, i18n parity,
  deep-tool 0 BUG, webpanel save/list/delete + `node --check` OK. **Oyun içi custom
  seviye oynatma yolu artık YOK** — webpanelde yapılanlar oyunda görünmez; istenirse
  yeni bir giriş (ör. menu seviye seçici) tartışılır.

- **[OYUN + MOTOR + ARAÇ] Oyun içi editör tamamen kaldırıldı; seviyeler klasöre taşındı (25.09.2026).**
  **(a)** `deep_engine/editor.py` (LevelEditor) SİLİNDİ; `core.py`'den editör oluşturma,
  E tuşu toggle ve editör üzerinden giden update/draw/debug dalları temizlendi;
  `__init__.py`'den `LevelEditor` çıkarıldı; `game/ui.py`'den menü öğesi ([3] Editör),
  `_dispatch_action` "editor" kolu ve fade sonundaki `editor.toggle()` kaldırıldı;
  `game/entities.py`'de fareyle ateş için `engine.editor.active` engeli silindi; i18n
  `menu_editor`/`editor_*` anahtarları iki dilden de temizlendi. **(b)** Seviyeler artık
  `custom_levels/` **klasöründe** birer dosya: `custom_levels/default.json` = hep sabit
  "sıfır şablon" (asla ezilmez), diğerleri `<isim>.json`. `game/state.py`'ye `LEVELS_DIR`,
  `builders.ensure_custom_levels_dir()` (klasör + default.json'u şablon kaynağından
  üretir), konsola `levels` + `load <isim>.json` komutları eklendi. **(c)** `tools/webpanel.py`
  sadece bu klasörde çalışıyor: seviye açma listesi + "Farklı Kaydet…" (isim verirsin,
  `default.json` korunur) + seviye silme; "Oyuna Aktar"/publish kaldırıldı, `web_level.json`
  silindi. Oynatma yolu: web'de kaydet → oyunda konsolu aç → `load benim_bolum.json`.
  Doğrulama: py_compile + headless boot + konsol komut testleri + webpanel HTTP round-trip
  (save/load/delete) OK. README + AGENTS.md kontrolleri güncellendi. **Etki:** motor 1.0.0'da
  E tuşu artık yok; paketleme `--add-data custom_level.json` şablon kaynağı olarak duruyor.

- **[OYUN] Boss ışın çökmesi düzeltildi (25.09.2026).** `game/bosses.py` içinde
  `PlayerController` iki yerde kullanılıyordu (SniperBoss/CosmicBoss `_fire_beam`,
  eski satır 467/599) ama hiç import edilmemişti → boss ışın saldırısı başlayınca
  `NameError` ile oyun çöküyordu. `from game.entities import PlayerController`
  eklendi (mutlak import). Doğrulama: her iki `_fire_beam` gerçek sahnede çağrıldı,
  çökme yok. **Oynanış etkisi:** pandun/desert/sniper boss'ları artık sahada da
  ışın atabilir.

- **[MOTOR] Konsol toggle düzeltmesi (25.09.2026).** Konsol " ("BACKQUOTE /
  QUOTEDBL) tuşuyla AÇILIYORDU ama aynı karede `console.update()` tuş basışını
  hâlâ "kapat" sanıp kapatıyordu → konsol göz açıp kapayıncaya kadar açık kalıyordu
  (kullanıcı "komut olmuyor" dedi). Çözüm: `console.update()`'te backquote/quote
  kapatma kaldırıldı — tuş artık SADECE motor çekirdeğinde toggle (core.py);
  konsol içinde kapatma yalnızca ESC ile. Açılış tuşunun yazı satırına girmemesi
  için `Input._typed_chars` toggle'da temizleniyor. Uçtan-uca test (aç→yaz→komut
  →kapat) OK.

- **[ARAÇ + MOTOR + OYUN] Web editörü kendi dosyasında çalışıyor + oyun içi konsol (25.09.2026).**
  **(a)** `tools/webpanel.py`: `custom_level.json` artık **dokunulmayan şablon**,
  editör `web_level.json`'da çalışıyor. Butonlar: "Şablona Sıfırla" (`/api/level/reset`:
  template → web_level kopyala) ve "Oyuna Aktar" (`/api/level/publish`: web_level →
  custom_level). `web_level.json` `.gitignore`'a eklendi. Oyun içi editör (E) YİNE
  `custom_level.json`'ı açar — web'de düzenlenen dosyayı GÖRMEZ (kullanıcı isteği).
  **(b)** " ("BACKQUOTE) tuşu oyun içi komut satırını açar: `deep_engine/console.py`
  (DevConsole + komut kayıt sistemi `register_command`), `input.py`'ye karakter
  toplama (`get_typed_text`) + BACKQUOTE/BACKSPACE/KPENTER tuşları, `core.py`'ye
  toggle+pause+draw (konsol açıkken oyun durur). `game/commands.py`: `help, clear,
  version, hp, heal, god, coins, speed, jump, tp, respawn, list`. Motor saflığı
  korundu (komutlar game tarafında kayıtlı). Doğrulama: py_compile OK, 12 komut
  kaydı doğrulandı, webpanel HTTP round-trip (reset/publish) OK.

- **[ARAÇ oturumu] Tarayıcı web paneli + mini editör (25.09.2026).** `tools/webpanel.py`
  — Python **sadece stdlib**, 0 yeni paket. `http://127.0.0.1:8765` sekme paneli:
  **Editor** (Godot/Unity-kıvamında basit seviye editörü: 14 nesnelik palet,
  sürükle/taşı/yeniden boyutlandır, özellik + meta paneli, kaydet = `custom_level.json`
  round-trip), deep-tool tarama, motor.log, Script, Oyun başlatıcı. **Kararlar:**
  sayfa **gerçek Türkçe UTF-8** karakterlerle (ü/ş/İ/ç, `<meta charset>` +
  `charset=utf-8`; WebClient bayt doğrulaması yapıldı). Önceki "yalnız ASCII" denemesi
  kullanıcıya kötü geldi, iptal edildi. `PAGE` Python raw string (`r"""..."""` — JS
  `\'` kaçışları aynen geçer), `setNum/setVal/setColor` inline handler'larla
  `node --check` + runtime mock testi doğrulandı, zoom/cam çarpımı doğru.
  Endpoint'ler: `/api/script` (cwd=ROOT — `deep_engine/` cwd'den `import deep_engine`
  ÇALIŞMAZ), `/api/scan` (`deep-tool.py --lang tr/en [args]`). **Dosya bozulma
  tuzağı:** bu dosyayı PowerShell `Get-Content -Raw`/`Set-Content` döngüsüyle
  DÜZENLEME (ANSI okur, UTF-8'i bozar → `â€”`); UTF-8 editörle. Git'e henüz
  eklenmedi (kullanıcı kararı bekliyor).

- **[MOTOR + ARAÇ] Yorum/docstring çevirisi tüm depoya tamamlandı (23.09.2026).**
  İzlenen TÜM `.py` dosyaları (motor core/servis/veri, game, tools) + `version.txt`
  + `.gitignore` yorumları akıcı İngilizce'ye çevrildi (commit `dfdc9e5`, 29 dosya,
  30. satırında tek commit). **Kritik koruma: i18n.py TRANSLATIONS TR/EN değerleri ve
  deep-tool.py TR/EN menü sözlük değerleri AYNEN duruyor** (yalnız yorumları değişti) —
  kod çıktıları ve oyun arayüzü (TR/EN) etkilenmedi. GitHub'a gidecek her şey artık
  İngilizce; `sessions/`, `AGENTS.md`, `opencode.json` yerelde Türkçe kalmaya devam.
  Not: depo 7 commit — GitHub push'u "gönder" deyince yapılır.

- **[ARAÇ oturumu] AI izi temizliği + tek kök commit (23.09.2026).** GitHub'da görünen
  tüm `.py` yorum/docstring'lerinden emojiler + ajan görev kodları (A1/B3/C5/D1) +
  "Bug Checkup" üslubu temizlendi; `version.txt` doğal değişiklik günlüğüne çevrildi;
  README AI üslubu (game juice/Mini-Godot/emoji) kaldırıldı. İz kalmadı (3 tur tarama).
  Eski 9 commit bir kök commit'e (`a4fe0a6`) sıkıştırılıp force-push yapıldı —
  GitHub geçmişi tek commit. Canlı oyun/i18n çevirileri (TR/EN menüler, HUD) AYNEN korundu.

- **[ARAÇ oturumu] GitHub'a gönderildi (23.09.2026).** https://github.com/tcknmx/DerinEngine
  (Public). `main` = 7 commit, 33 dosya. `sessions/`, `AGENTS.md`, `opencode.json` yerelde
  kalıyor, depoda yok. Sonraki değişiklikler `git add -A && git commit -m "..."` +
  `git push` ile güncellenir.

- **[OYUN oturumu] Tüm yorum/docstring'ler İngilizce'ye çevrildi (23.09.2026).**
  `game/*.py` + `main.py` (8 dosya, 328 yorum satırı) akıcı İngilizce'ye geçti.
  Kod/i18n string literal'leri değişmedi (UI/editor çevirileri yerinde). MOTOR ve
  ARAÇ kodu bu değişikliğe dahil değil; deep_engine/ ve tools/ kendi düzeninde.
  Doğrulama: `py_compile` OK, Türkçe karakter kalıntısı yok.

- **[ARAÇ oturumu] Yerel git deposu kuruldu (23.09.2026).** Git 2.55.0 kuruldu
  (winget), kimlik `tcknmx` / `tcknmx@users.noreply.github.com` (global), kök dizinde
  `main` dalında 2 commit (`5ddd5c2` ilk kayıt, `99722ff` gitignore). Hariç tutulanlar:
  `__pycache__/`, `dist/`, `build/`, `web-cache/`, `savegame.json`, `motor.log`,
  `.opencode/`, `*.lnk`, `_e.txt`. **GitHub'a push YAPILMADI** — sadece yerel.
  Değişiklikler `git status` ile takip edilip commit'lenebilir; kayıt düzenimizde
  "değişiklik diğer oturumu etkiliyorsa" notu artık commit mesajına yazılır.

- **[STRATEJİ oturumu] GÖREV DÖNGÜSÜ kuralı getirildi (AGENTS.md kural 3):** her
  görevde üç kayıt zorunlu — başlangıçta kendi oturum dosyasına `HEDEF` (neyi çözüyoruz,
  doğrulama ne), yarım kalırsa `KALAN` (nereye kadar gidildiği: adım, dosya, sırada ne),
  tamamlanınca kendi dosyasına kalıcı kayıt + diğer oturumları etkiliyor ise buraya
  "SON GELİŞMELER" notu. **Tüm oturumlar uygular.**

- **[ARAÇ oturumu] deep-tool tarama sonuçları devredildi.** `--lang tr all` → 95 WARN,
  0 BUG/ERR. Sessiz `except` (Modül 1/7), kullanılmayan import (parallax `_m`), Modül 3
  extractorsız tag (Coin/Player/Spikes) ve Modül 6 O(n²) incelemeleri bekliyor.
  Dağıtım: deep_engine/ tarafı → `02_engine.md` "DEVİR GÖREVİ"; game/+main.py tarafı →
  `03_game.md` "DEVİR GÖREVİ". Koda dokunulmadı.

- **[ARAÇ oturumu] webpanel portu doğrulandı (07.10.2026).** Python `tools/webpanel.py`
  PAGE bloğu `tools_html/webpanel.html`'e dışa aktarıldı (HEAD sürümü korundu), route'lar
  (13/13) birebir, `webpanel.js` 8766'da çalışıyor. `test_tools.js` 36/36, `test_browser.js`
  50/50, Modül 14 parite kapısı 0/0/0. JS araç seti Python ile eşit durumda.

- **[OYUN oturumu] Spikes trigger+zıplama, Turret agresifliği, gömülme yönlendirmesi
  (23.09.2026).** `_build_spikes` artık `BoxCollider(is_trigger=True)`; oyuncu dikene
  "basıp duramaz", temasta bounce (vx=-220, vy=-330) + hitstop + shake alır,
  `respawn` kaldırıldı. `TurretEnemy` range 600→460, wake_radius 420→330; turret ateş
  aralığı kampanya difficulty<=1'de min 2.0s (altyapıda 1.75s idi), genel min 1.4s.
  MOTOR etkilenmez (tüm değişiklikler `game/`). **02 oturumuna devir:** yüzeye gömülme
  kök nedeni motor `deep_engine/scene.py` tek-yön çarpışma eşiği `<=4` + 2px ayak
  sensörü + `Rigidbody2D` hız tavanı yokluğu — ayrıntı `03_game.md` → AÇIK RAPORLAR
  #2. Bir sonraki motor çalışmasına kadar oyuncu hızlı düşüşlerde ince tek-yön
  platformlardan geçebilir.

- **[STRATEJİ oturumu] AGENTS.md standart tek dev dosyadan 4 oturum yapısına taşındı.**
  Tüm geçmiş "maddeler", bug checkup'ları ve planlar ilgili oturum dosyalarına dağıtıldı:
  `01_strategy.md` (yol haritası/kararlar), `02_engine.md` (deep_engine/),
  `03_game.md` (game/), `04_tools.md` (deep-tool/paketleme/web). Bu dosya yeni ortak
  bilgi merkezi. KODA DOKUNULMADI — oyun hâlâ aynı çalışıyor.

- (Bir sonraki çapraz-etkili değişiklik buraya eklenir: ör. "MOTOR: scene.py çizim
  sırası değişti — OYUN etkilenebilir", "OYUN: entity ekledi — ARAÇ extractor
  kontrolü gerekebilir".)

---

## DÜNYA DURUMU (kim neyin sahibi)

| Oturum | Sahip olduğu dosyalar | Kimi etkiler |
|---|---|---|
| STRATEJİ | `sessions/01_strategy.md` | Yön/kararlar; koda dokunmaz |
| MOTOR | `deep_engine/*.py` | Tüm oturumlar (motor üstüne kurulu) |
| OYUN | `game/*.py` , `main.py` | Oynanış; motor API'lerine bağımlı |
| ARAÇ | `tools/deep-tool.py`, `deep-tool.bat`, paketleme (dist/build) | Denetim/bakım; kodu düzeltmez |

Motor saflık kuralı: `deep_engine/` İÇİNDE `game`/`main` import YASAK (deep-tool Modül 8
denetler). `game/*.py` ise motora `deep_engine.*` mutlak import ile bağlanır (göreli
import `game/*` içinde ÇALIŞMAZ — paket dışındadırlar).

---

## SÜRÜM & VERİ DURUMU (herkese açık)

- Motor sürümü **1.0.0**, oyun sürümü **0.1.19** (tek sürüm satırı fikri iptal edildi;
  ikisi ayrı sayılır: motor 1.0.0, oyun 0.1.19). Kaynaklar:
  `deep_engine/__init__.py → __version__`, `version.txt`.
- `custom_level.json` içindeki `meta.version` AYRI bir şey: seviye **dosya biçimi**
  sürümü (şu an 1).
- `savegame.json` (normalde) temiz durumda: `{"lang":"tr","high_score":0}` — BOM'suz
  (ilk bayt `{`). Yeni oyuncu deneyimi kararı gereği sıfır kurulum korunur.
  - `endless_unlocked` yoksa Sonsuz Mod kilitlidir (kampanya bitince açılır).
  - `tutorial_done` yoksa girişte eğitim gösterilir.
- `user_data_dir()` frozen-safe + emscripten-safe: savegame/özel seviye her platformda
  doğru yere yazılır.

---

## BİLİNEN TUZAKLAR (oturumdan bağımsız, hepsini ilgilendirir)

1. **`game/*.py`'de göreli import yok**: `from .core import ...` ÇALIŞMAZ. Doğrusu
   `from deep_engine.core import ...` (mutlak).
2. **savegame JSON'u UTF-8 BOM ile yazarsan bozulur**: `SaveGame.load` `utf-8-sig`
   kullanır (BOM'lu da okur) ama dosya BOM'suz `{` ile başlamalı. PowerShell
   `Set-Content -Encoding UTF8` BOM ekler — dikkat.
3. **`build/` paylaşılıyor**: PyInstaller (`build/StarCollectorHero/`) ile pygbag
   (`build/web/`) AYNI klasörü kullanır. Temizlikte `build/web*` dışında bırak ya da
   web çıktısını ayrı yere kopyala.
4. **Yerel web testinde oyun başlamıyorsa**: `http://localhost:8000` kullanma —
   pygbag dev mode'a girip wheel'i localhost'tan arar (404). `http://192.168.1.5:8000/`
   (yerel IP) kullan, CDN'den iner ve çalışır. (Prod/itch.io etkilenmez.)
5. **`Scene.draw` UI sırası**: normal yol = dünya (özellikle zoom'lu) → UI → vinyet en
   son. Zoom'lu çizimde `world_surf` `background_color` ile doldurulmalı (yoksa parallax
   üstü siyah kalır).
6. **Asenkron tarayıcı**: web, `engine.run_async()` (`asyncio.run`), masaüstü
   `engine.run()`. `_frame(dt)` tek karelik ortak gövdelerdir.
7. **indirme/import taramasında sesler**: sentezlenen sesler için dosya-varlık kontrolü
   istemli olarak yapılmaz (deep-tool Modül 5 bunları bilerek atlar).
8. **Editör 9 aracı**: 1–9 = araçlar; Z geri al, C kopyala, V yapıştır; seçili nesnede
   ok tuşları kaydırır, `[`/`]` boyut, R renk, DEL sil.
9. **`one_way` platformlarda `on_collision` TETİKLENMEZ (03.10.2026, kritik).**
   `Scene._handle_physics_and_collisions()` önce çarpışma bildirimleri
   (`on_collision`) gönderir, **sonra** stable-ground adımı oyuncuyu zemine
   yapıştırıp `velocity.y = 0` yapar. Zemin algısı önce çalıştığı için
   `overlap_check` çoğu karede **False** kalır ve `on_collision` hiç çağrılmaz.
   Belirtileri: "oyuncu zeminin üstünde ama hiçbir şey olmuyor", `overlap_check`
   elle `False` döndürür, oyuncu aynı yerde sonsuz döngüye girer.
   **Çözüm:** tek yönlü platforma dayanan oynanışı `is_grounded` durumundan sür
   (`ClimbGame._pump_bounce()` bkz. `03_game.md` madde 47) veya zeminde yatay
   teması elle test et. Python: `game/climber.py`, JS:
    `deep_engine_html/game/climber.js`. Aynı tuzak prosedürel seviyelerdeki
    ince tek yönlü zeminler için de geçerlidir.
10. **YENİ OYUN/MEKANİK = headless oynanış testi zorunlu (03.10.2026).**
   Star Climber'da unit testler 165/165 yeşildi ama oyun **hiç oynanamıyordu**
   (oyuncu hiçbir yere inmiyordu, sekiş tetiklenmiyordu, kamera ölüm döngüsü
   yapıyordu). Yakalayan tek şey: sahneyi saniyede 60 kez `update()` edip
   **tuşa basmadan** oynatmak. Kural: hareket/çarpışma/kamera içeren her yeni
   mekanik için (a) üretim/geometri değişmezlerini doğrulayan **kalıcı** kontrol,
   (b) `is_grounded`/gerçek `scene.update` üzerinden en az bir test, (c) 2–3 seed
   ile kısa headless smoke (düşme sayacı sınırlı kalmalı).
   Python'da `tests/test_climber.py`, JS'de `test_game.js` TEST17 — ikisi de
   aynı kural setini kontrol eder. Geçici probe betikleri **kalıcı teste
   çevrilmeli** (commit'ten silinir, sonra o hataya geri dönüş olur).
11. **YENİ Menü geçişi = karartmayı test et (03.10.2026).** Sahne değiştiren her
    menü aksiyonu (`_pending_factory` kullananlar: P, 4, C, çıkış) önce karartmayı
    **başlatmak** zorundadır: `_fade = 0` **+ `_fade_dir = 1`** +
    `_fading_out = True`. `_fade_dir` `0` iken `update()`'teki
    `if _fade_dir == 1` şartı hiç sağlanmaz, `_fade` 0'da kalır ve sahne **asla**
   değişmez — kullanıcı tuşa basar, hiçbir şey olmaz, tuşlar "bozuk" sanılır.
   Gerçek tuş yolu ancak DOM-benzeri bir testte yakalanır: geçici probe
   `window.addEventListener("keydown")` zinciri kurup `keydown` → `Input` →
   menü → `_start_climber` → `Engine.switch_scene` yolunu sürdü; bu artık
   `tools_html/test_browser.js` **bölüm 4b**'de kalıcı. Kural: `test_browser.js`
   `bootGame()` liste listesinde **her `index.html` `<script>` sırasını birebir
   yansıt** (Climber `test_browser.js`'te 03.10.2026'ya kadar hiç yoktu —
   yüklenmemiş kod test edilemez).

---

## ÇAPRAZ REFERANS (geçmiş maddelerin dağıtımı)

Orijinal tek AGENTS.md'deki "madde N" kayıtları ilgili oturum dosyalarına dağıtıldı.
Bir madde hem motoru hem oyunu etkilediyse ana kayıt baskın tarafta, ilgili tarafa kısa
bir "ilişkili gelişme" satırı düşüldü:

- Ağırlıklı MOTOR: 1,2,4,9,11,16,21(zaman),22(bileşen),23(zoom),26,31,32,33,34,35,36(log),38,43
- Ağırlıklı OYUN: 3,6,7,8,14,15,17,18,19,20,21(karakter),22(boss),23(menü),25,27,29,30,40,41,42
- Ağırlıklı ARAÇ: 36(konsol),37,39 + paketleme + web build + 404 tanısı
- STRATEJİ (karar notları): marka taşıma (10), oturum yapısı, öncelik kararları- **[MOTOR+OYUN] FIZIK MOTORU PYTHON REFERANSIYLA BIREBIR ESITLESTIRILDI (02.10.2026,
  kullanici bildirimi: "fizik motoru py motorda ki kadar iyi degil... py motorda ki tum kodu
  oldugu gibi html'de bastan yaz demistim").** Iki kok neden, ikisi de **olcdukce**
  kanitlandi:
  - **Ana dongu ekran hizina bagliydi** (core.js): dt 1/30 ile kisalan
    degisken adim yerine **sabit 1/60 accumulator** yazildi (Python clock.tick(60) +
    0.05 cap). Artik 144/240 Hz ekranda oyun ayni hizda.
  - **Python'in stabil zemin probu JS'te eksikti** (physics.js): Python
    deep_engine/scene.py carpisma sonrasi **2px ayak probu** ile is_grounded
    sabitler; JS'te bu yoktu. Oyuncu zeminde dururken is_grounded=false kaliyor ve
    **gitmesi gereken yerden gecmeye** basliyordu (dusman: JS 571'e kadar kosuyor,
    Python 268'de duruyor). DE.Physics._detect_ground() + _polygon_surface_y()
    eklendi.
  - **Yanlis yapilan is (tekrar yapma):** ESC kontrolu _render_frame() icine
    konulunca **calismadi** (get_key_down bir "edge" sorgusu, end_frame() onu
    siliyor). 	est_browser.js 43/1 ile yakaladi. Blok _step() icine,
    end_frame() **oncesine** tasindi. Artik 44/44.
  - **Olcum:** ziplama tepesi Python 132.2px / JS 132.2px; grounded True/True;
    60/144/240 Hz tepesi 132.2/132.2/132.2. **Yurume mesafesi dil arasi
    kiyaslanamaz** (JS ve Python farkli RNG kullaniyor -> ayni cagri farkli seviye).
  - **+10 kalici fizik kapi** (	est_smoke.js, toplam 50) ve **mutasyon kaniti**:
    ayak probu silinince 49/50 (grounded=false), EPS kaldirilinca 	est_core.js
    33/35. Kapilar gercekten hatayi yakaliyor.
  - **Kalan coin/enemies suphesi:** olcum gosterdi ki coin toplama dogru
    (skor artar, coin rengiyle cizim 450 -> 0) ve dusmanlar ilk ekranda **Python'da da
    yok** (ilk dusman PY x~1002, JS x~1093). Bunlar ayni davranis, JS hatasi degil.
    Kullanicinin "turuncuyu alinca gidiyor" cumlesi hangi nesneyi belirttigi net
    degil -> 03_game.md KALAN'da bekliyor.