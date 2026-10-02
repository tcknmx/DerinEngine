/* DerinEngine HTML — tilemap (Tilemap component)
 * Python deep_engine/tilemap.py birebir portu. Gerçek karo ızgarası;
 * katmanlı render (görünür bölge culling'i), JSON serileştirme ve
 * to_segments ile .map köprüsü.
 */
var DE = DE || {};

DE.Tilemap = class Tilemap extends DE.Component {
    constructor(tile_size = 32, offset = null) {
        super();
        this.tile_size = tile_size;
        this.offset = offset ? [offset[0], offset[1]] : [0, 0];
        this.tile_set = {};      // tile id -> [r,g,b] veya None=boş
        this.layers = [];        // { grid: 2D dizi, z: sayı } — z sıralı
        // Gorsel zenginlik (duz blok gorsun diye): yuzey isigi, derinlik
        // gradyani ve karonun icine karo bazli doku. Kapali -> Python gibi
        // tamamen duz kare (eski davranis, testler bunu bekliyor olabilir).
        this.textured = true;
    }

    add_layer(grid, z_index = 0) {
        this.layers.push({ grid: grid, z: z_index });
        this.layers.sort((a, b) => a.z - b.z);
        return this;
    }

    set_tile_set(tile_set) {
        this.tile_set = {};
        for (const k in tile_set) this.tile_set[k] = tile_set[k];
        return this;
    }

    get layers_count() { return this.layers.length; }

    get_tile(layer, col, row) {
        if (layer < 0 || layer >= this.layers.length) return null;
        const grid = this.layers[layer].grid;
        if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
            return grid[row][col];
        }
        return null;
    }

    set_tile(layer, col, row, tile_id) {
        if (layer < 0 || layer >= this.layers.length) return;
        const grid = this.layers[layer].grid;
        if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
            grid[row][col] = tile_id;
        }
    }

    place_at_world(wx, wy, tile_id, layer = 0) {
        const col = Math.trunc((wx - this.offset[0]) / this.tile_size);
        const row = Math.trunc((wy - this.offset[1]) / this.tile_size);
        this.set_tile(layer, col, row, tile_id);
    }

    solid_at(col, row, layer = -1) {
        const layers = layer < 0 ? this.layers.map((_, i) => i) : [layer];
        for (const l of layers) {
            if (this.get_tile(l, col, row) !== null && this.get_tile(l, col, row) !== undefined) return true;
        }
        return false;
    }

    to_data() {
        const tile_set = {};
        for (const tid in this.tile_set) {
            const color = this.tile_set[tid];
            if (color === null || color === undefined) tile_set[tid] = null;
            else if (Array.isArray(color) && color.length >= 3) tile_set[tid] = [...color.slice(0, 3)];
        }
        return {
            tile_size: this.tile_size,
            offset: [this.offset[0], this.offset[1]],
            tile_set: tile_set,
            layers: this.layers.map(layer => ({
                z: layer.z,
                grid: layer.grid.map(row => [...row]),
            })),
        };
    }

    static from_data(data) {
        const tm = new DE.Tilemap(data.tile_size || 32);
        tm.offset = [...(data.offset || [0, 0])];
        const tile_set = {};
        for (const key in (data.tile_set || {})) {
            const color = data.tile_set[key];
            tile_set[key] = Array.isArray(color) ? [...color] : null;
        }
        tm.set_tile_set(tile_set);
        for (const layer of (data.layers || [])) {
            tm.add_layer(layer.grid.map(row => [...row]), layer.z || 0);
        }
        return tm;
    }

    to_segments(layer = -1) {
        const ts = this.tile_size;
        const ox = this.offset[0], oy = this.offset[1];
        const spans = layer < 0 ? this.layers.map((_, i) => i) : [layer];
        if (!this.layers.length) return [];
        const rows = this.layers[spans[0]].grid.length;
        const cols = rows ? this.layers[spans[0]].grid[0].length : 0;

        const _filled = (l, c, r) => {
            const tid = this.get_tile(l, c, r);
            return tid !== null && tid !== undefined && this.tile_set[tid] !== null && this.tile_set[tid] !== undefined;
        };
        const solid = [];
        for (let r = 0; r < rows; r++) {
            solid.push([]);
            for (let c = 0; c < cols; c++) {
                solid[r].push(spans.some(l => _filled(l, c, r)));
            }
        }
        const segments = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!solid[r][c]) continue;
                const x0 = ox + c * ts, y0 = oy + r * ts;
                const edges = [
                    [[x0, y0], [x0 + ts, y0]],           // top
                    [[x0 + ts, y0], [x0 + ts, y0 + ts]], // right
                    [[x0, y0 + ts], [x0 + ts, y0 + ts]], // bottom
                    [[x0, y0], [x0, y0 + ts]],           // left
                ];
                const neighbours = [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]];
                for (let i = 0; i < 4; i++) {
                    const nr = neighbours[i][0], nc = neighbours[i][1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && solid[nr][nc]) continue;
                    segments.push(edges[i]);
                }
            }
        }
        return segments;
    }

    draw(ctx, camera_offset) {
        const ts = this.tile_size;
        const ox = this.offset[0], oy = this.offset[1];
        const cam_x = camera_offset.x, cam_y = camera_offset.y;
        const w = ctx.canvas ? ctx.canvas.width : 900;
        const h = ctx.canvas ? ctx.canvas.height : 600;
        const col0 = Math.max(0, Math.trunc((cam_x - ox) / ts));
        const row0 = Math.max(0, Math.trunc((cam_y - oy) / ts));
        const col1 = Math.trunc((cam_x + w - ox) / ts) + 1;
        const row1 = Math.trunc((cam_y + h - oy) / ts) + 1;
        const tex = this.textured;
        for (const layer of this.layers) {
            const grid = layer.grid;
            for (let row = row0; row < Math.min(row1, grid.length); row++) {
                const cells = grid[row];
                for (let col = col0; col < Math.min(col1, cells.length); col++) {
                    const tid = cells[col];
                    if (tid === null || tid === undefined) continue;
                    const color = this.tile_set[tid];
                    if (color === null || color === undefined) continue;
                    const dx = Math.trunc(ox + col * ts - cam_x);
                    const dy = Math.trunc(oy + row * ts - cam_y);
                    if (!tex) {
                        ctx.fillStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
                        ctx.fillRect(dx, dy, ts, ts);
                        continue;
                    }
                    const open_top = row === 0 || grid[row - 1][col] === null || grid[row - 1][col] === undefined;
                    const open_left = col === 0 || cells[col - 1] === null || cells[col - 1] === undefined;
                    const open_right = col >= cells.length - 1 || cells[col + 1] === null || cells[col + 1] === undefined;

                    // Derinlik: yuzeyden uzaklasan karo koyulasir (blok hissi olmaz).
                    const depth = open_top ? 1.0 : Math.max(0.62, 1.0 - (4 - (row % 8)) * 0.06);
                    // Karonun icine kucuk doku (deterministik, her karo ayni desen).
                    const jitter = ((col * 7 + row * 13) % 5) - 2;   // -2..2
                    const r = Math.max(0, Math.min(255, Math.trunc(color[0] * depth + jitter)));
                    const g = Math.max(0, Math.min(255, Math.trunc(color[1] * depth + jitter)));
                    const b = Math.max(0, Math.min(255, Math.trunc(color[2] * depth + jitter)));
                    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                    ctx.fillRect(dx, dy, ts, ts);

                    if (open_top) {
                        // Yuzey seridi: ustte 2px acik, hemen altinda 3px koyu cizgi
                        // -> platform "uzerinde durulabilir" bir zemin gibi okunur.
                        ctx.fillStyle = "rgb(" + Math.min(255, r + 46) + "," + Math.min(255, g + 46) + "," + Math.min(255, b + 40) + ")";
                        ctx.fillRect(dx, dy, ts, 2);
                        ctx.fillStyle = "rgb(" + Math.max(0, r - 38) + "," + Math.max(0, g - 34) + "," + Math.max(0, b - 28) + ")";
                        ctx.fillRect(dx, dy + 2, ts, 3);
                    }
                    if (open_left) {
                        ctx.fillStyle = "rgb(" + Math.max(0, r - 26) + "," + Math.max(0, g - 24) + "," + Math.max(0, b - 20) + ")";
                        ctx.fillRect(dx, dy, 2, ts);
                    }
                    if (open_right) {
                        ctx.fillStyle = "rgb(" + Math.max(0, r - 26) + "," + Math.max(0, g - 24) + "," + Math.max(0, b - 20) + ")";
                        ctx.fillRect(dx + ts - 2, dy, 2, ts);
                    }
                }
            }
        }
    }
}