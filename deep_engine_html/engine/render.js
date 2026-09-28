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
        this.shape = shape;          // "rect" | "circle" | "triangle"
        this.border_radius = border_radius;
        this.visible = true;
    }
    draw(ctx, camera_offset) {
        if (!this.visible || !this.game_object.active) return;
        const o = this.game_object;
        const x = o.position.x, y = o.position.y;
        const w = o.size.x, h = o.size.y;
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
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const o = this.game_object;
        let x = o.position.x, y = o.position.y;
        if (!this.is_ui && camera_offset) {
            x -= camera_offset.x;
            y -= camera_offset.y;
        }
        ctx.font = `bold ${this.font_size}px Arial`;
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