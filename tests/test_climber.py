"""
DerinEngine - Star Climber regresyon testi (game/climber.py)

`python tests\\test_climber.py` ile koşturulur. Pencere açmaz, sadece
headless olarak sahne günceller. Amaç: JS tarafındaki TEST17 ile AYNI
kural setini Python tarafında da kalıcılaştırmak (Python/JS aynası bozulmasın).

Kontrol edilenler:
  1) Ulaşılabilirlik: 0. katman ekranı kaplar, ilk 8 katman oyuncunun
     sütunundadır, ardışık katmanlar >= 70px örtüşür (03.10.2026 regresyonu:
     "0. katman oyuncunun altında değildi" + "kule oyuncudan kaçıyor").
  2) GERÇEK grounded sekiş: motor stable-ground adımı çarpışma bildiriminden
     önce çalıştığı için one_way platformda on_collision tetiklenmez;
     _pump_bounce() is_grounded'dan sürmek zorundadır.
  3) GİRİŞSİZ 30 sn oynanış: hiç tuş basılmadan tırmanış olmalı ve
     ölüm döngüsü (kamera/zemin/respawn hataları) olmamalı.

Hepsi doğruysa "ALL OK" yazar ve 0 ile çıkar.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

import pygame

from deep_engine.components import Rigidbody2D
from game import climber as C

pygame.font.init()   # HUD TextRenderer SysFont kullanıyor (pencere yok, sadece font)

PASS = 0
FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  OK " + name + (("  [%s]" % extra) if extra else ""))
    else:
        FAIL += 1
        print("  FAIL " + name + (("  [%s]" % extra) if extra else ""))


def make_game(seed):
    """Headless sürülebilir oyun sahnesi üretir.

    build_climber_scene() sahneyi zaten start() eder ve hiçbir şey Engine'e
    bağlı değildir — test sahneyi doğrudan scene.update(dt) ile iterer.
    """
    scene = C.build_climber_scene(seed)
    game = scene.find_by_tag("ClimbGame").get_component(C.ClimbGame)
    return scene, game


def step(scene, n=1, dt=1.0 / 60.0):
    for _ in range(n):
        scene.update(dt)


def test_reachability():
    print("1) Ulasilabilirlik:")
    scene, game = make_game(7)
    player = scene.find_by_tag("Player")
    pl, pr = player.position.x, player.position.x + player.size.x

    f0 = game.floors[0]
    check("0. katman ekrani boydan boya kaplar", f0.size.x >= 800, "w=%d" % f0.size.x)
    check("0. katman oyuncunun sutununu kapsar",
          pl >= f0.position.x and pr <= f0.position.x + f0.size.x,
          "oyuncu=%.0f..%.0f katman=%.0f..%.0f" % (pl, pr, f0.position.x, f0.position.x + f0.size.x))

    col_ok, bounds_ok = True, True
    for i in range(1, C.FREE_CLIMB + 1):
        if i not in game.floors:
            continue
        f = game.floors[i]
        if pl < f.position.x or pr > f.position.x + f.size.x:
            col_ok = False
        if f.position.x < 20 or f.position.x + f.size.x > 880:
            bounds_ok = False
    check("ilk 8 katman oyuncunun sutununda (giris tirmanis)", col_ok)
    check("ilk 8 katman ekran icinde", bounds_ok)

    keys = sorted(game.floors.keys())
    overlap_ok, worst = True, 9999.0
    for k in range(1, len(keys)):
        p, c = game.floors[keys[k - 1]], game.floors[keys[k]]
        ov = min(p.position.x + p.size.x, c.position.x + c.size.x) - max(p.position.x, c.position.x)
        worst = min(worst, ov)
        if ov < C.REACH_OVERLAP:
            overlap_ok = False
    check("ardisik katmanlar >=%dpx ortusur" % C.REACH_OVERLAP, overlap_ok,
          "en dar=%.0f" % worst)


def test_grounded_bounce():
    print("2) Gercek grounded sekis:")
    scene, game = make_game(21)
    player = scene.find_by_tag("Player")
    rb = player.get_component(Rigidbody2D)
    f1 = game.floors[1]

    player.position.x = f1.position.x + f1.size.x / 2 - player.size.x / 2
    player.position.y = f1.position.y - player.size.y
    rb.velocity.x = 0.0
    rb.velocity.y = 0.0
    rb.is_grounded = True
    step(scene, 1)
    check("is_grounded -> _pump_bounce sekis yapti", rb.velocity.y < -500,
          "vy=%.0f" % rb.velocity.y)

    f3 = game.floors[3]
    player.position.y = f3.position.y - player.size.y - 200
    rb.velocity.y = 100.0
    rb.is_grounded = False
    game._pump_bounce()
    check("havadayken sekis yok", abs(rb.velocity.y - 100.0) < 1.0, "vy=%.0f" % rb.velocity.y)


def test_no_input_climb():
    print("3) Girissiz 30sn oynanis:")
    climbed, fell = [], []
    for seed in (7, 99, 2024):
        scene, game = make_game(seed)
        step(scene, 1800)          # 30 sn, hic tus basilmiyor
        climbed.append(game.best_floor)
        fell.append(game.falls)
    check("giris tirmanis (3 seed)", all(f >= 8 for f in climbed),
          "katman=" + ",".join(str(f) for f in climbed))
    check("olum dongusu yok", all(f <= 3 for f in fell),
          "dusme=" + ",".join(str(f) for f in fell))


def main():
    print("DerinEngine - Star Climber testi (game/climber.py)")
    print("-" * 40)
    test_reachability()
    test_grounded_bounce()
    test_no_input_climb()
    print("-" * 40)
    print("SONUC: %d gecti, %d kaldi" % (PASS, FAIL))
    if FAIL > 0:
        sys.exit(1)
    print("ALL OK  (ulasilabilirlik + grounded sekis + girissiz tirmanis) -> 03_game.md madde 47")


if __name__ == "__main__":
    main()
