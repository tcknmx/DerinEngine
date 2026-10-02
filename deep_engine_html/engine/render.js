/* DerinEngine HTML — render (SpriteRenderer, TextRenderer)
 * Canvas 2D üzerine çizer. Kamera zoom/offset desteği: camera_offset çıkarılır,
 * zoom ile çarpılır (Python Scene.draw davranışını taşır).
 */
var DE = DE || {};

DE._apply_camera = function (ctx, camera_offset, zoom) {
    ctx.save();
    ctx.translate(-(camera_offset ? camera_offset.x : 0) * (zoom || 1),
                  -(camera_offset ? camera_offset.y : 0) * (zoom || 1));
    ctx.scale(zoom || 1, zoom || 1);
}

DE.SpriteRenderer = class SpriteRenderer extends DE.Component {
    constructor(color = [255, 255, 255], shape = "rect", border_radius = 0) {
        super();
        this.color = color;
        this.shape = shape;          // "rect" | "circle" | "triangle" | "spikes"
        this.border_radius = border_radius;
        this.visible = true;
        this._child = null;          // ek görsel: {img, w, h} ise color yerine resim
    }
    draw(ctx, camera_offset) {
        if (!this.visible || !this.game_object.active) return;
        const o = this.game_object;
        const x = o.position.x, y = o.position.y;
        const w = o.size.x, h = o.size.y;

        // Görsel (Image) modu — sprite olarak çizer (Python'daki "image" desteği)
        if (this._child) {
            const img = this._child.img;
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x, y, w, h);
                return;
            }
        }

        const col = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.fillStyle = col;
        if (this.shape === "circle") {
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === "triangle") {
            ctx.beginPath();
            ctx.moveTo(x + w, y);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
            ctx.fill();
        } else if (this.shape === "spikes") {
            // Python'daki birebir davranış: 3 sivri üçgen + parlak uç çizgisi + taban blok
            const n = 3, seg = w / n;
            ctx.fillRect(x, y + h - 3, w, 3);
            const tip_color = this.color.map(c => Math.min(255, c + 70));
            ctx.fillStyle = col;
            for (let i = 0; i < n; i++) {
                const x0 = x + i * seg;
                const tip_x = x0 + seg / 2;
                ctx.beginPath();
                ctx.moveTo(x0, y + h);
                ctx.lineTo(tip_x, y - 2);
                ctx.lineTo(x0 + seg, y + h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = `rgb(${tip_color[0]},${tip_color[1]},${tip_color[2]})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tip_x, y);
                ctx.lineTo(tip_x, y + 3);
                ctx.stroke();
            }
        } else {
            const r = this.border_radius;
            if (r > 0) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, r);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, w, h);
            }
        }
    }
}

DE.TextRenderer = class TextRenderer extends DE.Component {
    constructor(text = "", font_size = 24, color = [255, 255, 255], is_ui = false,
                shadow = null, center_x = false, center_y = false) {
        super();
        this.text = String(text);
        this.font_size = font_size;
        this.color = color;
        this.is_ui = is_ui;          // is_ui=True -> kameradan etkilenmez
        this.shadow = shadow;
        this.center_x = center_x;
        this.center_y = center_y;
        this._font_css = "";       // start() hazirlar (Python'da _font)
    }
    start() {
        // Python TextRenderer.start: font nesnesini burada hazırlar.
        // JS'te canvas.font dizesi yeterlidir ama yasam dongusu pariteliği
        // icin start() yine de font dizesini bir kez hesaplar.
        this._font_css = `bold ${this.font_size}px Arial`;
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const o = this.game_object;
        let x = o.position.x, y = o.position.y;
        if (!this.is_ui && camera_offset) {
            x -= camera_offset.x;
            y -= camera_offset.y;
        }
        ctx.font = this._font_css || `bold ${this.font_size}px Arial`;
        const metrics = ctx.measureText(this.text);
        let tx = x, ty = y;
        if (this.center_x) tx = x - metrics.width / 2;
        if (this.center_y) ty = y + this.font_size / 2;
        if (this.shadow) {
            ctx.fillStyle = `rgb(${this.shadow[0]},${this.shadow[1]},${this.shadow[2]})`;
            ctx.fillText(this.text, tx + 2, ty + 2);
        }
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.fillText(this.text, tx, ty);
    }
}