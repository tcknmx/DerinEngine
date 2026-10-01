"""STAR CLIMBER — Icy Tower tarzı sonsuz yukarı tırmanma (oyun katmanı).

Mekanik (Icy Tower'ın imza turları):
  - Katmanlar (floors) yukarı doğru üretilir; her katmanda bir platform vardır,
    oyuncu üstüne düşünce **otomatik seker** (ayrı zıplama tuşu yok).
  - Platformlar tek yönlüdür (alttan yukarı geçilir, üstten basılır).
  - Her sekiş "hız seviyesi"ni artırır → yatay hız büyür (kombi hissi). Seviye
    bir süre sekiş olmazsa yavaşça düşer.
  - Kırılabilir katmanlar bir sekişten sonra çatlar ve KIRILIR → delik oluşur.
  - Kamera yalnızca yukarı gider. Oyuncu ekranın altına düşerse son kontrol
    noktasına ışınlanır; en yüksek katman skordur.

Görseller tamamen kodla çizilir (resim dosyası yok) — Python ve
`deep_engine_html/game/climber.js` birebir aynı oynanışı sunar.
"""

import random

from deep_engine import (
    Engine,
    GameObject,
    Scene,
    Component,
    SpriteRenderer,
    BoxCollider,
    Rigidbody2D,
    TextRenderer,
    ParticleEmitter,
    BreakablePlatform,
    SoundFX,
    Input,
    I18n,
)
import pygame

from . import state

# --- Sabitler (JS eşiyle birebir aynı olmalı) ---
SCREEN_W = 900
SCREEN_H = 600
START_Y = 520.0            # 0. katmanın üst yüzeyi
BASE_GAP = 62.0            # ilk katmanlar arası dikey mesafe
GAP_GROWTH = 0.9           # her katmanda boşluk biraz artar (üstü zorlaşır)
GAP_MAX_ADD = 26.0
AHEAD = 16                 # oyuncunun üstünde kaç katman önceden üretilir
BOUNCE = 880.0             # sekiş gücü
PLAYER_W, PLAYER_H = 30.0, 40.0
BASE_SPEED = 250.0
SPEED_PER_LEVEL = 0.16     # her seviye için %16 hız
MAX_LEVEL = 5
LEVEL_HOLD = 2.6           # seviye kaç saniye korunur
LEVEL_DECAY = 2.0          # sonrasında kaç saniyede bir seviye düşer
CHECKPOINT_EVERY = 10      # her 10 katmanda geniş/kırılmaz kontrol noktası
BREAK_CHANCE = 0.28        # kırılabilir platform olasılığı (3. katmandan sonra)
DEATH_MARGIN = 80.0        # ekranın altından bu kadar fazla düşünce "düştün"

PLATFORM_H = 14.0
PLATFORM_MIN_W = 96.0
PLATFORM_MAX_W = 150.0
CHECKPOINT_W = 220.0
SIDE_MARGIN = 24.0
REACH_OVERLAP = 70.0       # ardışık katmanlar arası en az yatay örtüşme (px)
FREE_CLIMB = 8             # bu kata kadar katmanlar oyuncunun sütununda kalır
                          # -> oyuncu yatay giriş vermeden de tırmanabilir
FLOOR_LINE = 0.72          # ulaşılan katman ekranın %72'sine çizilir
PLAYER_TOP_MARGIN = 96.0  # oyuncunun başı bu satırın üstüne çıkmaz (sekiş tepesi)

COL_SOLID = (110, 190, 255)
COL_CHECKPOINT = (120, 255, 180)
COL_BREAKABLE = (255, 170, 90)
COL_CRACK = (255, 120, 90)
COL_BG = (14, 16, 34)
COL_PLAYER = (255, 235, 140)

# Katman yükseklikleri önbellekli: floor_y(i) monotonik azalan, çağrı ucuz.
_FLOOR_Y = [START_Y]


def floor_gap(index: int) -> float:
    """`index`. katmandan `index+1`. kata mesafe (üste doğru biraz artar)."""
    return min(BASE_GAP + GAP_GROWTH * max(0, index), BASE_GAP + GAP_MAX_ADD)


def floor_y(index: int) -> float:
    """`index`. katmanın üst yüzeyi y'si (yukarı çıkıldıkça azalır)."""
    if index < 0:
        return START_Y
    while len(_FLOOR_Y) <= index:
        _FLOOR_Y.append(_FLOOR_Y[-1] - floor_gap(len(_FLOOR_Y) - 1))
    return _FLOOR_Y[index]


def reset_floor_cache():
    """Testler için katman yüksekliği önbelleğini sıfırlar."""
    _FLOOR_Y.clear()
    _FLOOR_Y.append(START_Y)


def _shade(rgb, k: float):
    """Rengi katsayıyla açar/koyulaştırır (0..255 clamp)."""
    return tuple(max(0, min(255, int(c * k))) for c in rgb[:3])


def _rect(surface, x, y, w, h, rgb):
    """Düz renkli dikdörtgen (çizim yardımcısı). Ekran dışı parça sorun çıkarmaz."""
    if w <= 0 or h <= 0:
        return
    surface.fill(rgb, (int(x), int(y), int(w), int(h)))


def _line(surface, x1, y1, x2, y2, rgb):
    """Tek piksellik çizgi (çatlaklar için)."""
    pygame.draw.line(surface, rgb, (int(x1), int(y1)), (int(x2), int(y2)), 2)


class ClimbPlatform(Component):
    """Tek yönlü, geri seken (ve isteğe bağlı kırılabilir) platform katmanı."""

    def __init__(self, floor_index=0, hits_to_break=0, checkpoint=False,
                 bounce=BOUNCE, game=None):
        super().__init__()
        self.floor_index = floor_index
        self.hits_to_break = hits_to_break   # 0 = hiç kırılmaz
        self.checkpoint = checkpoint
        self.bounce = bounce
        self.game = game
        self.hits = 0
        self._cooldown = 0.0
        self._base_color = None

    def start(self):
        sprite = self.game_object.get_component(SpriteRenderer)
        if sprite is not None:
            self._base_color = tuple(sprite.color)

    def update(self, dt: float):
        if self._cooldown > 0.0:
            self._cooldown -= dt

    def on_collision(self, other):
        """Oyuncu ÜSTTEN düşüyorsa sektir (alttan geçişte sekiş olmaz)."""
        if other.tag != "Player" or not self.game_object.active:
            return
        rb = other.get_component(Rigidbody2D)
        if rb is None or self._cooldown > 0.0:
            return
        if rb.velocity.y < 0:
            return    # yukarı sekiş: katmanın tepesine değil, içinden geçiyor
        feet = other.position.y + other.size.y
        if feet > self.game_object.position.y + 18.0:
            return    # yandan değdi, üstüne düşmedi
        self._cooldown = 0.12
        self._bounce(other, rb)

    def _bounce(self, player, rb):
        rb.velocity.y = -self.bounce
        rb.is_grounded = False
        self.hits += 1
        # Çatlak görseli: her isabet kırılma rengine doğru koyulaşır
        if self._base_color is not None and self.hits_to_break > 0:
            sprite = self.game_object.get_component(SpriteRenderer)
            if sprite is not None:
                k = min(1.0, self.hits / float(self.hits_to_break))
                sprite.color = tuple(
                    int(self._base_color[i] + (COL_CRACK[i] - self._base_color[i]) * k)
                    for i in range(3)
                )
        SoundFX.play("jump")
        pe = player.get_component(ParticleEmitter)
        if pe is not None:
            pe.burst(count=12, color=COL_SOLID, speed_range=(60, 170),
                     size_range=(2, 5), lifespan_range=(0.25, 0.5), gravity=120.0,
                     origin_offset=(PLAYER_W / 2, PLAYER_H))
        if self.game is not None:
            self.game.on_platform_bounce(self, player)
        if self.hits_to_break > 0 and self.hits >= self.hits_to_break:
            self._break()

    def _break(self):
        """Platform kırılır → delik oluşur. Motorun BreakablePlatform işi yapar."""
        bp = self.game_object.get_component(BreakablePlatform)
        if bp is not None:
            bp.smash()          # partikül + ses + sarsıntı (motor eşi)
        else:
            self.game_object.active = False
            SoundFX.play("break")

    # ------------------------------------------------------------------ çizim
    def draw(self, surface, camera_offset):
        """Düz renkli dikdörtgen yerine "kiriş" görünümlü katman çizer.

        Üst yüzey (basılan yer) açık, gövde koyu, altta gölge, yanlarda pah —
        böylece katman "kaba bir kutu" gibi görünmez. Kırılabilir katmanlarda
        çatlaklar isabet sayısına göre belirir, kontrol noktasında yeşil bant
        + flama vardır. SpriteRenderer taban rengi çizer, burada üstüne detay
        eklenir.
        """
        if not self.game_object.active:
            return
        obj = self.game_object
        x = int(obj.position.x - camera_offset.x)
        y = int(obj.position.y - camera_offset.y)
        w = int(obj.size.x)
        h = int(obj.size.y)
        if w <= 0 or h <= 0:
            return
        base = self._base_color or (110, 190, 255)
        top = COL_CHECKPOINT if self.checkpoint else base

        # --- alt gölge (yapıyı zemine oturtur) ---
        _rect(surface, x, y + h - 3, w, 3, _shade(base, 0.35))
        # --- yan pahlar ---
        _rect(surface, x, y, 2, h, _shade(top, 1.18))
        _rect(surface, x + w - 2, y, 2, h, _shade(top, 0.62))
        # --- üst yüzey: basılan yer parlak, ince bir şerit ---
        _rect(surface, x, y, w, 4, _shade(top, 1.30))
        _rect(surface, x, y + 4, w, 2, _shade(top, 0.92))

        if self.checkpoint:
            # kontrol noktası: gövdede yeşil bant + flama direği
            _rect(surface, x, y + 6, w, 3, COL_CHECKPOINT)
            _rect(surface, x + w - 26, y - 16, 2, 16, (200, 220, 230))
            _rect(surface, x + w - 24, y - 16, 22, 10, COL_CHECKPOINT)

        if self.hits_to_break > 0:
            # çatlaklar: isabet sayısına göre sağdan sola
            k = min(1.0, self.hits / float(self.hits_to_break))
            n = 1 + int(round(k * 3))
            for i in range(n):
                cx = x + int(w * (0.25 + 0.5 * (i / 3.0)))
                _line(surface, cx, y + 2, cx - 4, y + h - 3, COL_CRACK)


class ClimbBackdrop(Component):
    """Bina cephesi: yan duvarlar + kat ayraçları (derinlik hissi).

    Sahne arka planı düz renk olduğu için kule "boşlukta yükselen kutular"
    gibi duruyordu. Bu bileşen ekranı bir bina içi gibi çerçeveler: sol/sağ
    duvar şeritleri ve düşük kontrastlı kat çizgileri.
    """

    STOREY = 78.0

    def draw(self, surface, camera_offset):
        w, h = surface.get_size()
        top = -int(camera_offset.y)
        # sol/sağ duvar (SIDE_MARGIN kadar içeride)
        m = int(SIDE_MARGIN)
        _rect(surface, 0, top, m, h, (22, 26, 48))
        _rect(surface, w - m, top, m, h, (22, 26, 48))
        _rect(surface, m - 2, top, 2, h, (46, 56, 92))
        _rect(surface, w - m, top, 2, h, (46, 56, 92))
        # kat ayraçları (yumuşak, derinlik için)
        y0 = int(camera_offset.y) - h
        y1 = int(camera_offset.y) + h * 2
        yy = (y0 // int(self.STOREY)) * int(self.STOREY)
        while yy < y1:
            sy = yy - int(camera_offset.y)
            if -2 <= sy <= h + 2:
                _rect(surface, m, sy, w - 2 * m, 1, (24, 28, 54))
            yy += int(self.STOREY)


class ClimberPlayer(Component):
    """Yatay hareket + hız kombisi (seviye). Zıplama yok: platformlar sektirir."""

    def __init__(self, speed=BASE_SPEED):
        super().__init__()
        self.speed = speed
        self.rb = None
        self.level = 0              # Icy Tower hız seviyesi
        self._level_timer = 0.0
        self.facing = 1

    def start(self):
        self.rb = self.game_object.get_component(Rigidbody2D)

    @property
    def speed_mult(self) -> float:
        return 1.0 + SPEED_PER_LEVEL * self.level

    def update(self, dt: float):
        if self.rb is None:
            self.rb = self.game_object.get_component(Rigidbody2D)
            if self.rb is None:
                return
        move_x = Input.get_horizontal_axis()
        if move_x != 0:
            self.facing = 1 if move_x > 0 else -1
        self.rb.velocity.x = move_x * self.speed * self.speed_mult
        # Kenar kelepçesi: kule dışına çıkma (düşey hareket serbest)
        if self.game_object.position.x < 0.0:
            self.game_object.position.x = 0.0
            self.rb.velocity.x = 0.0
        elif self.game_object.position.x > SCREEN_W - PLAYER_W:
            self.game_object.position.x = SCREEN_W - PLAYER_W
            self.rb.velocity.x = 0.0
        # Hız seviyesi zamanla söner
        if self.level > 0:
            self._level_timer -= dt
            if self._level_timer <= 0.0:
                self.level -= 1
                self._level_timer = LEVEL_DECAY

    def add_level(self):
        """Her sekiş bir seviye ekler (tavan MAX_LEVEL)."""
        if self.level < MAX_LEVEL:
            self.level += 1
        self._level_timer = LEVEL_HOLD

    def reset_level(self):
        self.level = 0
        self._level_timer = 0.0


class ClimbGame(Component):
    """Sonsuz tırmanma döngüsü: katman üretimi, skor, kamera, düşme-kurtarma."""

    def __init__(self, scene=None, seed=None):
        super().__init__()
        self.rng = random.Random(seed)
        self.scene = scene
        self.player = None
        self.ctrl = None
        self.floors = {}              # index -> GameObject (platform)
        self.top_index = 0            # üretilmiş en yüksek katman
        self.max_floor = 0            # ulaşılan en yüksek katman (kamera referansı)
        self.best_floor = 0           # rekor katman (skor; düşünce silinmez)
        self.checkpoint_floor = 0     # son geçilen kontrol noktası
        self.score = 0
        self.falls = 0
        self._cam_y = 0.0
        self.hud = None
        self.speed_hud = None

    # --- kurulum ---
    def start(self):
        if self.scene is None:
            self.scene = getattr(Engine.instance, "active_scene", None)
        if self.scene is None:
            return
        self.player = self.scene.find_by_tag("Player")
        if self.player is None:
            return
        self.ctrl = self.player.get_component(ClimberPlayer)
        self.hud = self.scene.find_by_tag("ClimbHUD")
        self.speed_hud = self.scene.find_by_tag("ClimbSpeed")
        self._cam_y = self.scene.camera_position.y
        self._last_floor_rect = None   # bir önceki katmanın (x, w) kutusu — ulaşılabilirlik için
        for i in range(AHEAD + 1):
            self._build_floor(i)
        self.top_index = AHEAD
        self._update_hud()

    def _player_column_range(self, w: float):
        """Platformun oyuncunun sütununu TAMAMEN kapsadığı x aralığı.

        Koşul: [x, x+w] ⊇ [pl, pr]  ⇔  pr - w <= x <= pl
        Böylece oyuncu yatay girdi vermese bile (sadece sekerek) her katmanın
        üstüne düşebilir; kule oyuncunun sütunundan sürüklenip uzaklaşamaz.
        """
        if self.player is None:
            return None
        pl = self.player.position.x
        pr = pl + self.player.size.x
        lo = max(SIDE_MARGIN, pr - w)
        hi = min(pl, SCREEN_W - SIDE_MARGIN - w)
        return (lo, hi) if lo <= hi else None

    def _place_floor_x(self, index: int, w: float, checkpoint: bool) -> float:
        """Katmanın x konumu — ulaşılabilirlik kurallarıyla birlikte.

        Kural 1: ilk kule katmanı (index 1) doğrudan oyuncunun üstünü kapsar.
        Kural 2: ardışık katmanlar en az REACH_OVERLAP kadar örtüşür (tırmanış
                 zinciri kopmaz).
        Kural 3: FREE_CLIMB boyunca katman, oyuncunun yatay bandıyla da örtüşür
                 (oyuncu yerinde kalırsa bile ilerleyebilir — kule sürüklenmez).
        """
        lo = SIDE_MARGIN
        hi = max(SIDE_MARGIN, SCREEN_W - SIDE_MARGIN - w)
        prev = self._last_floor_rect if index > 1 else None
        if index == 1:
            col = self._player_column_range(w)
            if col is not None:
                lo, hi = col
        elif prev is not None:
            px, pw = prev
            # Örtüşme = min(px+pw, x+w) - max(px, x) >= REACH_OVERLAP
            #  ⇔  x >= px + REACH_OVERLAP - w   ve   x <= px + pw - REACH_OVERLAP
            lo = max(lo, px + REACH_OVERLAP - w)
            hi = min(hi, px + pw - REACH_OVERLAP)
        if index <= FREE_CLIMB and not checkpoint:
            col = self._player_column_range(w)
            if col is not None:
                lo = max(lo, col[0])
                hi = min(hi, col[1])
        if lo <= hi:
            return self.rng.uniform(lo, hi)
        # Kurallar çelişti (kenara sıkışmış katman): ekrana sığdır.
        return max(SIDE_MARGIN, min(hi, SCREEN_W - SIDE_MARGIN - w))

    def _build_floor(self, index: int):
        """Bir katman üretir: x/genişlik değişken, %28 ihtimalle kırılabilir.

        0. katman (başlangıç zemini) oyuncunun altında olduğu garanti geniş bir
        platformdur — oyuncu ilk karede boşluğa düşmemelidir.
        """
        checkpoint = (index > 0 and index % CHECKPOINT_EVERY == 0)
        if index == 0:
            w = SCREEN_W - 2 * SIDE_MARGIN
            x = float(SIDE_MARGIN)
        elif checkpoint:
            w = CHECKPOINT_W
            x = self._place_floor_x(index, w, checkpoint)
        else:
            w = self.rng.uniform(PLATFORM_MIN_W, PLATFORM_MAX_W)
            x = self._place_floor_x(index, w, checkpoint)
        hits_to_break = 0
        if index >= 3 and not checkpoint and self.rng.random() < BREAK_CHANCE:
            hits_to_break = 1
        obj = GameObject(name=f"Floor{index}", x=x, y=floor_y(index), width=w,
                         height=PLATFORM_H, tag="ClimbFloor")
        color = COL_CHECKPOINT if checkpoint else (COL_BREAKABLE if hits_to_break else COL_SOLID)
        obj.add_component(SpriteRenderer(color=color, shape="rect", border_radius=5))
        obj.add_component(BoxCollider(is_trigger=False, one_way=True))
        obj.add_component(ParticleEmitter())
        obj.add_component(ClimbPlatform(floor_index=index, hits_to_break=hits_to_break,
                                        checkpoint=checkpoint,
                                        bounce=BOUNCE - min(120.0, index * 2.0), game=self))
        if hits_to_break > 0:
            # Motorun kırılabilir platform bileşeni de eklenir: kırılma işini o yapar.
            obj.add_component(BreakablePlatform(hits_to_break=hits_to_break))
        self.scene.add_object(obj)
        self.floors[index] = obj
        self._last_floor_rect = (x, w)
        return obj

    # --- oyun akışı ---
    def update(self, dt: float):
        if self.player is None:
            self.start()
            if self.player is None:
                return
        self._pump_bounce()
        self._generate_ahead()
        self._track_camera(dt)
        self._check_fall()

    def _pump_bounce(self):
        """Zeminde duran oyuncuyu sektirir.

        Neden gerekli: motorun "stable ground" adımı çarpışma bildiriminden ÖNCE
        oyuncuyu platformun üstüne yapıştırıp velocity.y=0 yapar. Bu yüzden
        one_way platformlarda overlap_check hiç True olmaz ve on_collision'a
        güvenilemez. Icy Tower'da oyuncu zemine her değdiğinde seker — biz de
        zeminde (is_grounded) her karede, katmanın cooldown'u izin verirse sektiriyoruz.
        """
        if self.ctrl is None:
            return
        rb = self.ctrl.rb
        if rb is None:
            rb = self.player.get_component(Rigidbody2D)
            self.ctrl.rb = rb
            if rb is None:
                return
        if not rb.is_grounded:
            return
        feet = self.player.position.y + self.player.size.y
        px = self.player.position.x
        idx = self.player_floor()
        # Tercih sırası: oyuncunun gerçekten altındaki katman (bulunan ±1 komşular dahil)
        for cand in (idx, idx - 1, idx + 1):
            if cand < 0:
                continue
            comp = self._floor_component(cand)
            if comp is None or not comp.game_object.active:
                continue
            fobj = comp.game_object
            if px + self.player.size.x <= fobj.position.x or px >= fobj.position.x + fobj.size.x:
                continue
            if abs(feet - fobj.position.y) > 6.0:
                continue
            if comp._cooldown > 0.0:
                continue
            comp._bounce(self.player, rb)
            return

    def _floor_component(self, index: int):
        fobj = self.floors.get(index)
        if fobj is None or not fobj.active:
            return None
        return fobj.get_component(ClimbPlatform)

    def _generate_ahead(self):
        current = self.player_floor()
        while self.top_index < current + AHEAD:
            self.top_index += 1
            self._build_floor(self.top_index)

    def player_floor(self) -> int:
        """Oyuncunun bulunduğu/en yakın katman indeksi (aşağıdan yukarı yürüyerek).

        Katman y'leri yukarı doğru azaldığı için: ayakların ÜSTÜNDE kalan en yüksek
        katman aranır (yani üretilmiş en üst katmandan aşağı doğru inilir).
        """
        feet = self.player.position.y + self.player.size.y
        i = min(self.top_index, max(0, len(_FLOOR_Y) - 1))
        while i > 0 and floor_y(i) < feet - 2.0:
            i -= 1
        return i

    def on_platform_bounce(self, platform, player):
        if self.ctrl is not None:
            self.ctrl.add_level()
        idx = platform.floor_index
        if idx > self.max_floor:
            self.max_floor = idx
            if idx > self.best_floor:
                self.best_floor = idx
            if platform.checkpoint:
                self.checkpoint_floor = idx
        # Skor: KAYIT katman başına 10 + hız seviyesi bonusu
        level = self.ctrl.level if self.ctrl is not None else 0
        self.score = self.best_floor * 10 + level * 5
        self._update_hud()

    def _camera_anchor_y(self) -> float:
        """Kameranın göreceği referans katmanın üst yüzeyi.

        Referans = ulaşılan en yüksek katman (checkpoint katmanı da dahil).
        """
        return floor_y(max(self.max_floor, self.checkpoint_floor))

    def _track_camera(self, dt: float):
        """Kamera SADECE yukarı gider ve YALNIZCA yeni katmana inildiğinde yükselir.

        Neden oyuncunun tepesine değil: zıplama tepesi kamerayı yukarı çekerse,
        oyuncu kendi üstünde durduğu katmanın ekran dışına düşer ve her sekişte
        aynı yerde ölür. Icy Tower'da da kamera yalnız yeni katmana inince kayar.

        EK: oyuncu BAŞI ekranın üstüne çıkmasın (PLAYER_TOP_MARGIN). Yoksa
        sekiş tepesi (≈390px) katman çizgisini (372px) aştığı için oyuncu her
        sekişte ekranın dışına taşıyordu.
        """
        want = self._camera_anchor_y() - SCREEN_H * FLOOR_LINE
        if self.player is not None:
            keep = self.player.position.y - PLAYER_TOP_MARGIN
            if keep < want:
                want = keep
        if want < self._cam_y:
            self._cam_y += (want - self._cam_y) * min(dt * 9.0, 1.0)
        self.scene.camera_position.x = 0.0
        self.scene.camera_position.y = self._cam_y

    def _check_fall(self):
        """Ekranın altına düşme = düştün → son kontrol noktasına dön.

        Zeminde duran oyuncu ÖLMEZ: kamera yalnız yukarı gittiği için oyuncu
        sağlam bir katmanın üstündeyken ekran altında kalabilir; bu bir ölüm
        değildir (yoksa oyuncu aynı zeminde sonsuz ölürdü).
        """
        bottom = self.scene.camera_position.y + SCREEN_H + DEATH_MARGIN
        if self.player.position.y <= bottom:
            return
        if self._standing_on_floor():
            return
        self.respawn()

    def _standing_on_floor(self) -> bool:
        """Oyuncu aktif bir katmanın üstünde mi? (zemindeyken ölmez)"""
        if self.ctrl is not None and self.ctrl.rb is not None and self.ctrl.rb.is_grounded:
            return True
        feet = self.player.position.y + self.player.size.y
        px = self.player.position.x
        idx = self.player_floor()
        for cand in (idx, idx - 1, idx + 1):
            if cand < 0:
                continue
            comp = self._floor_component(cand)
            if comp is None:
                continue
            fobj = comp.game_object
            if px + self.player.size.x <= fobj.position.x or px >= fobj.position.x + fobj.size.x:
                continue
            if abs(feet - fobj.position.y) <= 10.0:
                return True
        return False

    def respawn(self):
        """Son kontrol noktasına (yoksa başlangıca) ışınlanır; skor korunur."""
        idx = self.checkpoint_floor if self.checkpoint_floor > 0 else 0
        floor = self.floors.get(idx)
        if floor is None or not floor.active:
            floor = self._build_floor(idx)
        self.player.position.x = min(max(0.0, floor.position.x + floor.size.x / 2 - PLAYER_W / 2),
                                     SCREEN_W - PLAYER_W)
        self.player.position.y = floor.position.y - PLAYER_H
        rb = self.player.get_component(Rigidbody2D)
        if rb is not None:
            rb.velocity.x = 0.0
            rb.velocity.y = 0.0
            rb.is_grounded = False
        if self.ctrl is not None:
            self.ctrl.reset_level()
        # Düşünce yükseklik ilerlemesi sıfırlanır (Icy Tower): kamera 6. katmana
        # çekilip oyuncuyu 0. katmanda anında öldürürdü. Rekor (best_floor) korunur.
        self.max_floor = idx
        self.checkpoint_floor = min(self.checkpoint_floor, idx)
        self._cam_y = floor_y(idx) - SCREEN_H * 0.62
        self.scene.camera_position.y = self._cam_y
        self.scene.add_shake(0.25)
        self.falls += 1
        SoundFX.play("hit")

    def _update_hud(self):
        if self.hud is not None:
            tr = self.hud.get_component(TextRenderer)
            if tr is not None:
                tr.text = I18n.localize("climber_hud", floor=self.best_floor, score=self.score)
        if self.speed_hud is not None and self.ctrl is not None:
            tr = self.speed_hud.get_component(TextRenderer)
            if tr is not None:
                tr.text = I18n.localize("climber_speed", mult=f"{self.ctrl.speed_mult:.2f}")


def _make_player(scene: Scene):
    player = GameObject(name="Player", x=SCREEN_W / 2 - PLAYER_W / 2, y=START_Y - PLAYER_H,
                        width=PLAYER_W, height=PLAYER_H, tag="Player")
    player.add_component(SpriteRenderer(color=COL_PLAYER, shape="rect", border_radius=6))
    player.add_component(BoxCollider(is_trigger=False))
    player.add_component(Rigidbody2D(gravity=980.0, use_gravity=True, max_fall_velocity=1600.0))
    player.add_component(ParticleEmitter())
    player.add_component(ClimberPlayer())
    scene.add_object(player)
    return player


def build_climber_scene(seed=None) -> Scene:
    """STAR CLIMBER sahnesini kurar (menüden ya da konsoldan açılabilir)."""
    scene = Scene(name="Star Climber", background_color=COL_BG)
    # Kamera oyun tarafından sürülür (yalnızca yukarı) → motor takibi kapalı
    scene.camera_manual = True

    def _on_escape() -> bool:
        """ESC -> ana menü (motor ESC'yi sahne alırsa oyun kapanmaz)."""
        from .ui import build_main_menu_scene
        state.game_mode = "menu"
        Engine.switch_scene(build_main_menu_scene())
        return True

    scene.on_escape = _on_escape

    bg = GameObject(name="ClimbBackdrop", x=0, y=0, width=0, height=0, tag="ClimbBackdrop")
    bg.add_component(ClimbBackdrop())
    scene.add_object(bg)
    _make_player(scene)
    hud = GameObject(name="ClimbHUD", x=SCREEN_W / 2, y=22, width=0, height=0, tag="ClimbHUD")
    hud.add_component(TextRenderer(text=I18n.localize("climber_hud", floor=0, score=0),
                                   font_size=26, color=(255, 240, 170), is_ui=True,
                                   shadow=(0, 0, 0), center_x=True))
    scene.add_object(hud)
    speed = GameObject(name="ClimbSpeed", x=SCREEN_W / 2, y=54, width=0, height=0, tag="ClimbSpeed")
    speed.add_component(TextRenderer(text=I18n.localize("climber_speed", mult=1.0),
                                     font_size=18, color=(140, 220, 255), is_ui=True,
                                     shadow=(0, 0, 0), center_x=True))
    scene.add_object(speed)
    hint = GameObject(name="ClimbHint", x=SCREEN_W / 2, y=SCREEN_H - 16, width=0, height=0,
                      tag="ClimbHint")
    hint.add_component(TextRenderer(text=I18n.localize("climber_hint"),
                                    font_size=15, color=(120, 140, 180), is_ui=True,
                                    shadow=(0, 0, 0), center_x=True))
    scene.add_object(hint)
    game = GameObject(name="ClimbGame", x=0, y=0, width=0, height=0, tag="ClimbGame")
    game.add_component(ClimbGame(scene=scene, seed=seed))
    scene.add_object(game)
    scene.start()
    return scene