/* DerinEngine HTML — demo: PlayerController (kutu) + yer + platform
 * Oyun hissi Python motor değerlerini birebir taşır:
 *   gravity 1400, jump_force 620, move_speed 320, max_fall 1800.
 */
var DE = DE || {};

DE.PlayerController = class PlayerController extends DE.Component {
    constructor() {
        super();
        this.move_speed = 320;
        this.jump_force = 620;
        this._double_jumps = 1;       // bir ek zıplama hakkı
    }
    update(dt) {
        const rb = this.game_object.get_component(DE.Rigidbody2D);
        if (!rb) return;
        // Yatay hareket
        let dir = 0;
        if (DE.Input.instance.get_key("A") || DE.Input.instance.get_key("LEFT")) dir -= 1;
        if (DE.Input.instance.get_key("D") || DE.Input.instance.get_key("RIGHT")) dir += 1;
        rb.velocity.x = dir * this.move_speed;
        // Zıplama
        const jump = DE.Input.instance.get_key_down("SPACE")
                  || DE.Input.instance.get_key_down("W")
                  || DE.Input.instance.get_key_down("UP");
        if (jump) {
            if (rb.is_grounded) {
                rb.velocity.y = -this.jump_force;
                this._double_jumps = 1;
            } else if (this._double_jumps > 0) {
                rb.velocity.y = -this.jump_force;
                this._double_jumps -= 1;
            }
        }
        // Yere düşünce çift zıplama hakkı tazele
        if (rb.is_grounded) this._double_jumps = 1;
    }
}

function build_demo() {
    const scene = new DE.Scene("Box Jump", [16, 20, 34]);

    // Oyuncu: mavi kutu (sol, ilk platformun üstünde)
    const player = new DE.GameObject("Player", 120, 340, 40, 40, "Player");
    player.add_component(new DE.SpriteRenderer([90, 160, 255], "rect", 6));
    player.add_component(new DE.BoxCollider(false, false));
    player.add_component(new DE.Rigidbody2D(1400, true, 1800));
    player.add_component(new DE.PlayerController());
    scene.add_object(player);

    // Zemin: yeşil şerit (tüm genişlik)
    const ground = new DE.GameObject("Ground", 0, 560, 900, 40, "Ground");
    ground.add_component(new DE.SpriteRenderer([80, 190, 120], "rect", 4));
    ground.add_component(new DE.BoxCollider(false, false));
    scene.add_object(ground);

    // Platformlar: one-way (alttan geçilir, üstten durulur)
    const platforms = [
        [260, 420, 190, 22],
        [540, 320, 190, 22],
        [360, 210, 160, 22],
    ];
    for (const [x, y, w, h] of platforms) {
        const p = new DE.GameObject("Platform", x, y, w, h, "Platform");
        p.add_component(new DE.SpriteRenderer([180, 140, 90], "rect", 4));
        p.add_component(new DE.BoxCollider(false, true));   // one_way
        scene.add_object(p);
    }

    // Başlık (HUD — kameradan etkilenmez)
    const title = new DE.GameObject("Title", 450, 22, 0, 0, "UI");
    title.add_component(new DE.TextRenderer(
        "DerinEngine HTML · SPACE zıpla · çift zıplama dene", 16, [200, 215, 235], true, [0, 0, 0], true));
    scene.add_object(title);

    return scene;
}

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    const engine = new DE.Engine(canvas, "DerinEngine HTML", 900, 600, 60);
    DE.Input.instance = new DE.Input();
    engine.set_scene(build_demo());
    engine.run();
});