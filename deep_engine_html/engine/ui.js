/* DerinEngine HTML — UI kit (UITheme, Panel, Button, ScrollContainer)
 * Python deep_engine/ui.py birebir portu. Tüm widget'lar Component, is_ui=true.
 * Fare: hover/press/click; klavye: focused + ENTER aktivasyonu.
 * Input this şüphesi: Input.get_mouse_position/get_mouse_button/get_mouse_button_down/
 * get_key_down/is_controller_active üzerinden.
 */
var DE = DE || {};

DE.UITheme = class UITheme {
    static get defaults() {
        return {
            font_name: null,
            font_size: 22,
            panel_bg: [28, 32, 44],
            panel_border: [90, 100, 130],
            panel_border_radius: 8,
            button_bg: [50, 70, 110],
            button_hover: [70, 95, 150],
            button_press: [30, 46, 80],
            button_focus: [220, 220, 235],
            button_text: [235, 240, 250],
            button_disabled: [70, 74, 86],
            scroll_bg: [22, 26, 36],
            scroll_border: [70, 80, 110],
            scroll_handle: [120, 135, 175],
            scroll_item: [200, 210, 230],
            scroll_item_hover: [255, 235, 150],
            text_color: [230, 235, 245],
            item_padding: 10,
            item_height: 30,
        };
    }
    constructor(overrides = {}) {
        this.values = Object.assign({}, DE.UITheme.defaults, overrides);
    }
    get(k) { return this.values[k]; }
}

function _rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
function _rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
function _round_rect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

DE.Panel = class Panel extends DE.Component {
    constructor(theme = null, color = null, border = null, radius = null, alpha = 255) {
        super();
        this.theme = theme || new DE.UITheme();
        this.color = color || this.theme.get("panel_bg");
        this.border = border !== null && border !== undefined ? border : this.theme.get("panel_border");
        this.radius = radius !== null && radius !== undefined ? radius : this.theme.get("panel_border_radius");
        this.alpha = alpha;
    }
    get is_ui() { return true; }
    draw(ctx, camera_offset) {
        if (!this.game_object || !this.game_object.active) return;
        const x = Math.trunc(this.game_object.position.x);
        const y = Math.trunc(this.game_object.position.y);
        const w = Math.trunc(Math.max(1, this.game_object.size.x));
        const h = Math.trunc(Math.max(1, this.game_object.size.y));
        _round_rect(ctx, x, y, w, h, this.radius);
        if (this.alpha < 255) {
            ctx.fillStyle = _rgba(this.color, this.alpha / 255);
        } else {
            ctx.fillStyle = _rgb(this.color);
        }
        ctx.fill();
        if (this.border !== null && this.border !== undefined && this.alpha >= 255) {
            _round_rect(ctx, x, y, w, h, this.radius);
            ctx.strokeStyle = _rgb(this.border);
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.border !== null && this.border !== undefined) {
            _round_rect(ctx, x, y, w, h, this.radius);
            ctx.strokeStyle = _rgba(this.border, this.alpha / 255);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

DE.Button = class Button extends DE.Component {
    constructor(text = "", on_click = null, theme = null, font_size = null, color = null) {
        super();
        this.text = text;
        this.on_click = on_click;
        this.theme = theme || new DE.UITheme();
        this.font_size = font_size || this.theme.get("font_size");
        this.color = color || this.theme.get("button_bg");
        this.enabled = true;
        this.focused = false;
        this.hovered = false;
        this.pressed = false;
        this._was_pressed = false;
    }
    get is_ui() { return true; }
    _rect() {
        const x = Math.trunc(this.game_object.position.x);
        const y = Math.trunc(this.game_object.position.y);
        const w = Math.trunc(Math.max(this.game_object.size.x, 8));
        const h = Math.trunc(Math.max(this.game_object.size.y, 8));
        return { x: x, y: y, w: w, h: h, right: x + w, bottom: y + h };
    }
    _measure_text(ctx) {
        ctx.font = this.font_size + "px monospace";
        return ctx.measureText(this.text) || { width: 10, actualBoundingBoxAscent: this.font_size, actualBoundingBoxDescent: 2 };
    }
    set_text(text, ctx) {
        this.text = text;
        if (this.game_object) {
            const m = ctx ? this._measure_text(ctx) : { width: this.text.length * (this.font_size * 0.6), actualBoundingBoxAscent: this.font_size, actualBoundingBoxDescent: 2 };
            const ascent = m.actualBoundingBoxAscent || this.font_size * 0.8;
            const descent = m.actualBoundingBoxDescent || this.font_size * 0.2;
            this.game_object.size.x = m.width + 2 * this.theme.get("item_padding");
            this.game_object.size.y = (ascent + descent) + 2 * this.theme.get("item_padding");
        }
    }
    contains_point(pos) {
        const r = this._rect();
        return pos[0] >= r.x && pos[0] < r.right && pos[1] >= r.y && pos[1] < r.bottom;
    }
    contains_point_x(mx, my) {
        const r = this._rect();
        return mx >= r.x && mx < r.right && my >= r.y && my < r.bottom;
    }
    update(dt) {
        if (!this.game_object || !this.game_object.active) return;
        const rect = this._rect();
        let mx = 0, my = 0;
        if (DE.Input && DE.Input.get_mouse_position) {
            const m = DE.Input.get_mouse_position();
            mx = m.x; my = m.y;
        }
        const inside = mx >= rect.x && mx < rect.right && my >= rect.y && my < rect.bottom;
        this.hovered = inside && this.enabled;

        let click_fired = false;
        if (this.enabled && this.focused && DE.Input) {
            if (DE.Input.get_key_down("ENTER") ||
                (DE.Input.is_controller_active && DE.Input.is_controller_active() &&
                 DE.Input._gamepad_a_down && DE.Input._gamepad_a_down())) {
                click_fired = true;
            }
        }

        let held = false;
        if (DE.Input && DE.Input.get_mouse_button) held = inside && !!DE.Input.get_mouse_button(0);
        if (held && this.enabled) {
            this.pressed = true;
            this._was_pressed = true;
        } else {
            const was = this._was_pressed;
            this.pressed = false;
            this._was_pressed = false;
            if (was && this.enabled && this.contains_point([mx, my])) click_fired = true;
        }

        if (click_fired && this.on_click) this.on_click();
    }
    draw(ctx, camera_offset) {
        if (!this.game_object || !this.game_object.active) return;
        const rect = this._rect();
        let bg, text_col;
        if (!this.enabled) {
            bg = this.theme.get("button_disabled");
            text_col = this.theme.get("button_disabled");
        } else if (this.pressed && this.enabled) {
            bg = this.theme.get("button_press");
            text_col = this.theme.get("button_text");
        } else if (this.hovered) {
            bg = this.theme.get("button_hover");
            text_col = this.theme.get("button_text");
        } else if (this.focused) {
            bg = this.color;
            text_col = this.theme.get("button_focus");
        } else {
            bg = this.color;
            text_col = this.theme.get("button_text");
        }
        _round_rect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
        ctx.fillStyle = _rgb(bg);
        ctx.fill();
        if (this.focused || this.hovered) {
            _round_rect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
            ctx.strokeStyle = _rgb(this.theme.get("button_focus"));
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.fillStyle = _rgb(text_col);
        ctx.font = this.font_size + "px monospace";
        const m = ctx.measureText(this.text) || { width: 10 };
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, rect.x + (rect.w - m.width) / 2, rect.y + rect.h / 2);
        ctx.textBaseline = "alphabetic";
    }
}

DE.ScrollContainer = class ScrollContainer extends DE.Component {
    constructor(items = null, theme = null, on_pick = null, item_height = null, font_size = null) {
        super();
        this.items = items ? [...items] : [];
        this.on_pick = on_pick;
        this.theme = theme || new DE.UITheme();
        this.item_height = item_height || this.theme.get("item_height");
        this.font_size = font_size || (this.theme.get("font_size") - 2);
        this.scroll = 0.0;
        this.hovered_index = -1;
        this._dragging = false;
        this._drag_start_mouse = null;
    }
    get is_ui() { return true; }
    _rect() {
        const x = Math.trunc(this.game_object.position.x);
        const y = Math.trunc(this.game_object.position.y);
        const w = Math.trunc(Math.max(this.game_object.size.x, 8));
        const h = Math.trunc(Math.max(this.game_object.size.y, 8));
        return { x: x, y: y, w: w, h: h, right: x + w, bottom: y + h };
    }
    content_height() { return this.items.length * this.item_height; }
    row_rect(index) {
        const rect = this._rect();
        return { x: rect.x, y: rect.y + index * this.item_height, w: rect.w - 14, h: this.item_height,
                 right: rect.x + (rect.w - 14), bottom: rect.y + (index + 1) * this.item_height };
    }
    visible_range() {
        const rect = this._rect();
        const view_h = rect.h;
        const top = Math.trunc(this.scroll * Math.max(0, this.items.length * this.item_height - view_h));
        const first = Math.trunc(top / this.item_height);
        const count = Math.trunc(view_h / this.item_height) + 2;
        return [first, count];
    }
    _handle_rect() {
        const rect = this._rect();
        const content = Math.max(1, this.content_height());
        const view = rect.h;
        if (content <= view) {
            return { x: rect.right - 10, y: rect.y, w: 8, h: rect.h };
        }
        const ratio = view / content;
        const handle_h = Math.max(24, Math.trunc(ratio * view));
        const max_travel = Math.max(1, view - handle_h);
        const hy = rect.y + Math.trunc(this.scroll * max_travel);
        return { x: rect.right - 10, y: hy, w: 8, h: handle_h };
    }
    _in_rect(mx, my) {
        const rect = this._rect();
        return mx >= rect.x && mx < rect.right && my >= rect.y && my < rect.bottom;
    }
    _in_handle(mx, my) {
        const hh = this._handle_rect();
        return mx >= hh.x && mx < hh.x + hh.w && my >= hh.y && my < hh.y + hh.h;
    }
    update(dt) {
        if (!this.game_object || !this.game_object.active) return;
        const rect = this._rect();
        let mx = 0, my = 0;
        if (DE.Input && DE.Input.get_mouse_position) {
            const m = DE.Input.get_mouse_position();
            mx = m.x; my = m.y;
        }
        const inside = this._in_rect(mx, my);

        // Fare tekerleği (Python: pygame.mouse.get_rel()'in dy'si)
        if (inside && DE.Input && DE.Input.get_mouse_scroll) {
            const dy = DE.Input.get_mouse_scroll();
            if (dy !== 0) {
                this.scroll = Math.max(0.0, Math.min(1.0, this.scroll + dy * 0.001 * this.item_height));
            }
        }

        // Scrollbar sürükleme
        let left_down = false;
        if (DE.Input && DE.Input.get_mouse_button) left_down = !!DE.Input.get_mouse_button(0);
        if (left_down) {
            if (!this._dragging && inside && this._in_handle(mx, my)) {
                this._dragging = true;
                const rect2 = this._rect();
                const hh = this._handle_rect();
                const span = Math.max(1, rect2.h - hh.h);
                this.scroll = Math.max(0.0, Math.min(1.0, (my - rect2.y - hh.h / 2) / span));
                this._drag_start_mouse = my;
            } else if (this._dragging) {
                const rect2 = this._rect();
                const hh = this._handle_rect();
                const span = Math.max(1, rect2.h - hh.h);
                this.scroll = Math.max(0.0, Math.min(1.0, (my - rect2.y - hh.h / 2) / span));
            }
        } else {
            this._dragging = false;
        }

        // Hovered satır + seçim
        const [first, count] = this.visible_range();
        this.hovered_index = -1;
        let button_down = false;
        if (DE.Input && DE.Input.get_mouse_button_down) button_down = !!DE.Input.get_mouse_button_down(0);
        for (let i = first; i < Math.min(first + count, this.items.length); i++) {
            const r = this.row_rect(i);
            if (mx >= r.x && mx < r.right && my >= r.y && my < r.bottom) {
                this.hovered_index = i;
                if (button_down && this.on_pick) this.on_pick(i);
                break;
            }
        }
    }
    draw(ctx, camera_offset) {
        if (!this.game_object || !this.game_object.active) return;
        const rect = this._rect();
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
        ctx.clip();
        ctx.font = this.font_size + "px monospace";
        const [first, count] = this.visible_range();
        for (let i = first; i < Math.min(first + count, this.items.length); i++) {
            const r = this.row_rect(i);
            if (r.y >= rect.y + rect.h) break;
            ctx.fillStyle = _rgb(i === this.hovered_index ? this.theme.get("scroll_item_hover") : this.theme.get("scroll_item"));
            ctx.textBaseline = "middle";
            ctx.fillText(this.items[i], r.x + this.theme.get("item_padding"),
                         r.y + this.item_height / 2);
        }
        ctx.textBaseline = "alphabetic";
        ctx.restore();

        // Çerçeve + scrollbar
        _round_rect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
        ctx.fillStyle = _rgb(this.theme.get("scroll_bg"));
        ctx.fill();
        _round_rect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
        ctx.strokeStyle = _rgb(this.theme.get("scroll_border"));
        ctx.lineWidth = 1;
        ctx.stroke();
        if (this.content_height() > rect.h) {
            const hh = this._handle_rect();
            _round_rect(ctx, hh.x, hh.y, hh.w, hh.h, 4);
            ctx.fillStyle = _rgb(this.theme.get("scroll_handle"));
            ctx.fill();
        }
    }
}