"""
DerinEngine - Motor çekirdek testi (Event + Tween)

`python tests\test_engine_core.py` ile koşturulur. Pencere açmaz, sadece:
  - Component Event sistemi (on/once/off/emit),
  - Tween sistemi (Value/Vector2/color + easing + zincir)
gerektiği gibi çalışıyorsa "ALL OK" yazar ve 0 ile çıkar.

Senaryo sonunda kısa bir özet + session dokümanındaki HEDEF kaydına referans vardır.
"""

import os
import sys
from types import SimpleNamespace

# Repo kökünü import yolu(+)na ekle (tests/ içinden çalıştırıldığında)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

from deep_engine.components import Component
from deep_engine.tween import TweenComponent
from deep_engine.math2d import Vector2


def test_events():
    """Component.on/once/off/emit davranışı."""
    comp = Component()
    calls = []

    def on_x(val):
        calls.append(("on", val))

    def once_x(val):
        calls.append(("once", val))

    comp.on("x", on_x)
    comp.once("x", once_x)

    comp.emit("x", 1)
    comp.emit("x", 2)
    comp.emit("x", 3)

    assert calls == [
        ("on", 1), ("once", 1),
        ("on", 2),
        ("on", 3),
    ], f"once listener fazla/az tetiklendi: {calls}"

    # off: tek callback kaldırılır -> sonraki emit sessiz
    comp.off("x", on_x)
    comp.emit("x", 99)
    assert calls == [
        ("on", 1), ("once", 1),
        ("on", 2),
        ("on", 3),
    ], f"off sonrası çağrı gelmemeli: {calls}"

    # off (callback'siz): hepsini temizler
    comp.off("x")
    comp.emit("x", 123)
    assert len(calls) == 4, f"off(event) sonrası sessizlik bekleniyordu: {calls}"

    # emit args + kwargs aktarımı
    got = []

    def on_kw(a, b=0):
        got.append((a, b))

    comp.on("k", on_kw)
    comp.emit("k", 7, b=3)
    assert got == [(7, 3)], f"kwargs iletimi bozuk: {got}"


def test_tween():
    """Value / Vector2 / renk tween + easing + zincir."""
    tc = TweenComponent()
    box = SimpleNamespace(x=0.0, pos=Vector2(0, 0), color=(0, 0, 255))

    # 1) float: 0 -> 100, linear, 1 saniye
    t = tc.to(box, "x", 100.0, 1.0)
    tc.update(0.5)
    assert abs(box.x - 50.0) < 0.001, f"yarı sürede 50 olmalı, {box.x}"
    tc.update(0.5)
    assert abs(box.x - 100.0) < 0.001, f"sonda 100 olmalı, {box.x}"
    assert t.done and tc.running() == 0, "tween bitmiş olmalı"

    # 2) Vector2 (yerinde güncelleme / referans korunur)
    pos_ref = box.pos
    tc.to_vec(box, "pos", Vector2(200, 100), 1.0)
    tc.update(1.0)
    assert abs(pos_ref.x - 200.0) < 0.001 and abs(pos_ref.y - 100.0) < 0.001, f"vektor hedef: {pos_ref}"
    assert box.pos is pos_ref, "Vector2 referansı değişmemeli (yerinde yazım)"

    # 3) renk tuple (clamp 0..255 + int)
    tc.to(box, "color", (0, 999, 0), 1.0)
    tc.update(1.0)
    assert box.color == (0, 255, 0), f"renk clamp yanlış: {box.color}"

    # 4) zincir: önce x'e, bittiğinde y'ye
    box2 = SimpleNamespace(x=0.0, y=0.0)
    first = tc.to(box2, "x", 10.0, 0.2)
    chain = tc.after(first)
    chain.to(box2, "y", 5.0, 0.2)
    tc.update(0.2)          # first bitti -> zincir başlar
    assert abs(box2.x - 10.0) < 0.001, f"ilk tween: {box2.x}"
    tc.update(0.1)          # y yarıda
    assert 1.0 < box2.y < 5.0, f"zincir y yarıda olmalı: {box2.y}"
    tc.update(0.1)
    assert abs(box2.y - 5.0) < 0.001, f"zincir sonu: {box2.y}"

    # 5) delay ile başlatma
    box3 = SimpleNamespace(v=0.0)
    tc.to(box3, "v", 3.0, 1.0, delay=0.5)
    tc.update(0.49)
    assert abs(box3.v) < 0.001, f"delay bitmeden başlamamalı: {box3.v}"
    tc.update(0.02)     # 0.49 + 0.02 > 0.5 -> tween başlar
    assert abs(box3.v) > 0.0, "delay sonrası tween başlamalı"

    # 6) easing string geçerli
    from deep_engine.tween import EASING, ease_out_bounce, ease_out_back
    assert "out_bounce" in EASING and callable(EASING["out_bounce"])
    assert abs(ease_out_bounce(0.5) - 0.75) < 0.03, "bounce t=0.5 ~0.75 olmalı"
    assert ease_out_back(1.0) == 1.0, "back easing sonu 1.0 olmalı"

    # 7) clear() tüm tweens iptal eder
    box4 = SimpleNamespace(q=0.0)
    tc.to(box4, "q", 9.0, 10.0)
    tc.clear()
    curr = tc.running()
    assert curr == 0, f"clear sonrası {curr} tween kalmış"


def test_camera():
    """Kamera: ilk karede kayma yok (snap), snap_camera_to_target, dt tabanli sarsinti."""
    from deep_engine.game_object import GameObject
    from deep_engine.scene import Scene
    from deep_engine.components import Rigidbody2D

    scene = Scene("Test")
    scene.screen_width = 900
    scene.screen_height = 600
    player = GameObject("Player", 2000.0, 500.0, 32, 48, "Player")
    rb = Rigidbody2D()
    player.add_component(rb)
    scene.add_object(player)
    scene.update(0.016)          # oyuncu sahneye girsin

    # 1) ilk kare: kamera (0,0)'dan kaymaz, dogrudan hedefe gider
    scene.set_camera_target(player)
    assert scene.camera_position.x == 0.0 and scene.camera_position.y == 0.0, "test baslangici (0,0)"
    scene.update(1.0 / 60.0)
    expect_x = player.position.x - scene.screen_width / 2 + player.size.x / 2
    assert abs(scene.camera_position.x - expect_x) < 0.001, \
        f"ilk kare kaymamali (snap): {scene.camera_position.x} != {expect_x}"
    expect_y = player.position.y - scene.screen_height / 2 + player.size.y / 2
    assert abs(scene.camera_position.y - expect_y) < 0.001, "ilk kare y snap"

    # 2) sonraki karelerde yumuşak takip (look-ahead: hiz 0 -> kayma yok)
    rb.velocity.x = 0.0
    scene.update(1.0 / 60.0)
    assert abs(scene.camera_position.x - expect_x) < 0.001, "duruyorken kamera kaymamali"

    # 3) look-ahead: saga dogru hizlaninca kamera oyunculardan ileri bakar
    rb.velocity.x = 260.0
    scene.update(1.0 / 60.0)
    assert scene.camera_position.x > expect_x, "look-ahead saga dogru olmali"

    # 4) snap_camera_to_target: kick + shake artigini temizleyip hedefe islar
    scene.camera_kick = Vector2(12.0, -5.0)
    scene.add_shake(0.8)
    scene.update(1.0 / 60.0)
    assert scene.shake_trauma > 0.0, "sarsinti birikmis olmali"
    rb.velocity.x = 0.0
    assert scene.snap_camera_to_target() is True
    point = scene.camera_follow_point()
    assert scene.camera_position.x == point.x and scene.camera_position.y == point.y, "snap hedefte olmali"
    assert scene.camera_kick.x == 0 and scene.camera_kick.y == 0, "snap kick'i sifirlamali"
    assert scene.shake_offset.x == 0 and scene.shake_offset.y == 0, "snap shake ofsetini sifirlamali"

    # 5) hedef yoksa snap guvenli (False doner)
    scene.camera_target = None
    assert scene.snap_camera_to_target() is False, "hedef yokken snap False"

    # 6) sarsinti: gercek zamana gore soner (kare hizindan bagimsiz)
    scene.add_shake(1.0)
    scene.update(1.0 / 60.0)
    trauma_after_one_frame = scene.shake_trauma
    assert 0.0 < trauma_after_one_frame < 1.0, f"trauma sonmeli: {trauma_after_one_frame}"
    for _ in range(120):
        scene.update(1.0 / 60.0)
    assert scene.shake_trauma == 0.0, "2 saniyede trauma bitmeli"
    assert scene.shake_offset.x == 0 and scene.shake_offset.y == 0, "trauma bitince ofset sifir"

    # 7) render_camera = kamera + ofset; offset uygulandiginda farkli olur
    scene.camera_position = Vector2(100.0, 100.0)
    scene.shake_offset = Vector2(3.0, -4.0)
    rc = scene.render_camera
    assert (rc.x, rc.y) == (103.0, 96.0), f"render_camera toplam olmali: {rc.x},{rc.y}"
    # ofset uretilir mi? (rastgele; en az biri farkli olmali)
    scene.add_shake(1.0)
    scene.update(1.0 / 60.0)
    assert scene.shake_offset.x != 0 or scene.shake_offset.y != 0, "sarsintida ofset uretilmeli"


if __name__ == "__main__":
    test_events()
    test_tween()
    test_camera()
    print("ALL OK  (Event + Tween + kamera snap/sarsinti) -> 02_engine.md HEDEF")
    sys.exit(0)