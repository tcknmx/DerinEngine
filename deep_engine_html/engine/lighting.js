/* DerinEngine HTML — lighting (LightSource, LightingEngine)
 * Python deep_engine/lighting.py birebir portu. Canvas'ta kompozit ile
 * "carve": karanlık katmana ışık maskesi 'destination-out'/kaynar alfa ile
 * oyulur. Işık maskeleri key'le önbelleklenir (yüksek FPS).
 */
var DE = DE || {};

DE.LightSource = class LightSource extends DE.Component {
    constructor(radius = 120, color = [100, 200, 255], intensity = 1.0,
                pulsing = false, pulse_speed = 3.0, pulse_amount = 15.0, offset = [16, 16]) {
        super();
        this.base_radius = radius;
        this.current_radius = radius;
        this.color = color;
        this.intensity = intensity;
        this.pulsing = pulsing;
        this.pulse_speed = pulse_speed;
        this.pulse_amount = pulse_amount;
        this.offset = offset;
        this.time = 0.0;
    }
    update(dt) {
        if (this.pulsing) {
            this.time += dt;
            this.current_radius = this.base_radius + Math.sin(this.time * this.pulse_speed) * this.pulse_amount;
        }
    }
}

DE.LightingEngine = class LightingEngine {
    static _light_masks = {};

    constructor(ambient_darkness = 130) {
        this.ambient_darkness = ambient_darkness;  // 0: aydınlık, 255: kör karanlık
        this._darkness_canvas = null;
    }

    static _get_radial_light_mask(radius, color, intensity = 1.0) {
        radius = Math.max(10, Math.trunc(radius));
        const key = radius + "|" + color.join(",") + "|" + Math.trunc(intensity * 10);
        if (DE.LightingEngine._light_masks[key]) return DE.LightingEngine._light_masks[key];

        const size = radius * 2;
        const cv = document.createElement("canvas");
        cv.width = size; cv.height = size;
        const g = cv.getContext("2d");

        // Merkezden dışa yumuşak ışık gradyanı
        for (let r = radius; r > 0; r -= 3) {
            let alpha = Math.trunc(255 * (1.0 - Math.pow(r / radius, 1.3)) * intensity);
            alpha = Math.max(0, Math.min(255, alpha));
            g.fillStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + (alpha / 255) + ")";
            g.beginPath();
            g.arc(radius, radius, r, 0, 6.283185307);
            g.fill();
        }
        DE.LightingEngine._light_masks[key] = cv;
        return cv;
    }

    render_lights(ctx, w, h, scene, camera_offset) {
        if (this.ambient_darkness <= 0) return;

        if (!this._darkness_canvas || this._darkness_canvas.width !== w || this._darkness_canvas.height !== h) {
            this._darkness_canvas = document.createElement("canvas");
            this._darkness_canvas.width = w;
            this._darkness_canvas.height = h;
        }
        const dctx = this._darkness_canvas.getContext("2d");

        // 1. Ortam karanlığı ile doldur
        dctx.clearRect(0, 0, w, h);
        dctx.fillStyle = "rgba(10,12,18," + (this.ambient_darkness / 255) + ")";
        dctx.fillRect(0, 0, w, h);

        // 2. Tüm ışık kaynaklarını topla ve karanlıktan "oy" (destination-out carve)
        dctx.globalCompositeOperation = "destination-out";
        for (const obj of scene.game_objects) {
            if (!obj.active) continue;
            const light = obj.get_component(DE.LightSource);
            if (!light) continue;
            const mask = DE.LightingEngine._get_radial_light_mask(light.current_radius, light.color, light.intensity);
            const lx = Math.trunc(obj.position.x + light.offset[0] - light.current_radius - camera_offset.x);
            const ly = Math.trunc(obj.position.y + light.offset[1] - light.current_radius - camera_offset.y);
            if (-light.current_radius * 2 < lx && lx < w + 100 && -light.current_radius * 2 < ly && ly < h + 100) {
                dctx.drawImage(mask, lx, ly);
            }
        }
        dctx.globalCompositeOperation = "source-over";

        // 3. Karanlık katmanı ana ekrana işle
        ctx.drawImage(this._darkness_canvas, 0, 0);
    }
}