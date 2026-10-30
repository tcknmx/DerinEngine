/* DerinEngine HTML — render (SpriteRenderer, TextRenderer)
 * Canvas 2D üzerine çizer. Kamera zoom/offset desteği: camera_offset çıkarılır,
 * zoom ile çarpılır (Python Scene.draw davranışını taşır).
 */
var DE = DE || {};

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
        // Kamera ofseti Python SpriteRenderer.draw ile aynı şekilde uygulanır
        // (components.py: screen_x = obj.position.x - camera_offset.x).
        const cam = camera_offset || { x: 0, y: 0 };
        const x = o.position.x - cam.x, y = o.position.y - cam.y;
        let w = o.size.x, h = o.size.y;
        // 2.5D köprüsü: z derinliği → perspektif küçülme (0 = ön, +uzak)
        const s = Math.max(0.25, 1 - ((o.z || 0) * 0.015));
        w *= s; h *= s;

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
    /* M11 — Python TextRenderer._is_emoji_char birebir: emoji UÇLARI ayrı fontla
     * çizilir (py Segoe UI Emoji); aralıklar py ile aynı. U+FE0F/U+200D de
     * emoji sayılır (varyasyon birleştirici dizileri py'de emoji segmentinde). */
    static _is_emoji_char(ch) {
        const o = ch.codePointAt(0);
        return (o >= 0x1F000 && o <= 0x1FAFF) || (o >= 0x2600 && o <= 0x27BF)
            || (o >= 0x2300 && o <= 0x23FF) || (o >= 0x2B00 && o <= 0x2BFF)
            || o === 0xFE0F || o === 0x200D;
    }
    static _has_emoji(text) {
        return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u.test(text);
    }
    _segments() {
        // py _render_complex segmentasyonu: bitişik aynı türdeki karakterler tek parça.
        const segs = [];
        let buf = "", cur = null;
        for (const ch of this.text) {
            const e = DE.TextRenderer._is_emoji_char(ch);
            if (cur === null) cur = e;
            if (e !== cur) { segs.push([buf, cur]); buf = ""; cur = e; }
            buf += ch;
        }
        segs.push([buf, cur === null ? false : cur]);
        return segs;
    }
    _emoji_font_css() {
        // py: pygame.font.SysFont("Segoe UI Emoji", fs) — kalın DEĞİL.
        return `${this.font_size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", Arial`;
    }
    draw(ctx, camera_offset) {
        if (!this.game_object.active) return;
        const o = this.game_object;
        let x = o.position.x, y = o.position.y;
        if (!this.is_ui && camera_offset) {
            x -= camera_offset.x;
            y -= camera_offset.y;
        }
        const base_css = this._font_css || `bold ${this.font_size}px Arial`;
        // Emoji OLMAYAN metin: eski tek-parça yolu aynen (ölçüm/merkezleme testleri
        // değişmeden kalır). Emoji VARSA py _render_complex segmentli yolu.
        if (!DE.TextRenderer._has_emoji(this.text)) {
            ctx.font = base_css;
            this._draw_segments(ctx, [[this.text, false]], x, y, base_css);
            return;
        }
        this._draw_segments(ctx, this._segments(), x, y, base_css);
    }
    _draw_segments(ctx, segs, x, y, base_css) {
        const emoji_css = this._emoji_font_css();
        // 1) ölçüm: her segment kendi fontuyla (py: her segment kendi fontuyla size()).
        let total_w = 0, max_asc = 0, max_desc = 0;
        const widths = [];
        for (const [s, isE] of segs) {
            ctx.font = isE ? emoji_css : base_css;
            const m = ctx.measureText(s);
            const w = m ? m.width : 0;
            widths.push(w);
            total_w += w;
            const asc = (m && m.actualBoundingBoxAscent !== undefined)
                ? m.actualBoundingBoxAscent : this.font_size * 0.8;
            const desc = (m && m.actualBoundingBoxDescent !== undefined)
                ? m.actualBoundingBoxDescent : this.font_size * 0.2;
            if (asc > max_asc) max_asc = asc;
            if (desc > max_desc) max_desc = desc;
        }
        // 2) yerleşim — mevcut top-left -> baseline semantiği (Not 07.10 + TEST13d).
        let tx = x, ty = y;
        if (this.center_x) tx = x - total_w / 2;
        if (this.center_y) ty = y - (max_asc + max_desc) / 2;
        ty += max_asc;
        // 3) gölge (py: ikinci _render_complex(shadow) ile tüm segmentler) + metin.
        for (const pass of (this.shadow ? [this.shadow, this.color] : [this.color])) {
            ctx.fillStyle = `rgb(${pass[0]},${pass[1]},${pass[2]})`;
            let cx = (pass === this.color || !this.shadow) ? tx : tx + 2;
            const cy = (pass === this.color || !this.shadow) ? ty : ty + 2;
            for (let i = 0; i < segs.length; i++) {
                ctx.font = segs[i][1] ? emoji_css : base_css;
                ctx.fillText(segs[i][0], cx, cy);
                cx += widths[i];
            }
        }
    }
}