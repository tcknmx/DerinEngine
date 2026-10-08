/* DerinEngine HTML — levelfile (builder kayıt + JSON seviye kaydetme/yükleme)
 * Python deep_engine/levelfile.py birebir portu. Motor <-> oyun ayrımı:
 * motor builder'ları bilmez; oyun register_builder(tag, fn) ile tanıtır.
 * Tarayıcıda dosya erişimi yok: save_level JSON data döndürür / load_level
 * data (veya JSON string) alır. Node ortamında DE._fs yardırıcısıyla yazılabilir.
 */
var DE = DE || {};

DE._BUILDERS = {};
DE._SCENE_META_DEFAULTS = {
    name: "Unnamed Level",
    background_color: [30, 30, 40],
    parallax_theme: null,
    camera_target: "Player",
};

DE.register_builder = function (tag, builder) {
    DE._BUILDERS[tag] = builder;
};

DE.registered_tags = function () {
    return Object.keys(DE._BUILDERS);
};

DE.place_object = function (scene, data) {
    const tag = data.tag;
    const builder = DE._BUILDERS[tag];
    if (!builder) {
        console.log("[DerinEngine] Uyari: '" + tag + "' icin builder bulunamadi, atlandi.");
        return null;
    }
    return builder(scene, data);
};

DE.register_extractor = function (tag, extractor) {
    if (!DE._EXTRACTORS) DE._EXTRACTORS = {};
    DE._EXTRACTORS[tag] = extractor;
};

function _get_extractors() {
    if (!DE._EXTRACTORS) DE._EXTRACTORS = {};
    return DE._EXTRACTORS;
}

/* ORTA-9: Python levelfile.save_level(scene, path, extra_meta) imzası.
 * - path string ise ve fs varsa (Node / DE._fs) dosyaya JSON yazar (py ile aynı
 *   biçim: indent 2, utf-8), veriyi döndürür.
 * - Eski JS çağrıları save_level(scene, extra_meta) olabilir: 2. argüman
 *   string değilse extra_meta olarak alınır.
 * - Tarayıcıda fs yoksa sadece veri döner (py'nin diske yazma adımı atlanır). */
DE.save_level = function (scene, path = null, extra_meta = null) {
    if (path !== null && path !== undefined && typeof path !== "string") {
        extra_meta = path;
        path = null;
    }
    const extractors = _get_extractors();
    const data = {
        meta: {
            name: scene.name,
            background_color: [...scene.background_color],
            parallax_theme: _theme_of(scene),
            format: "derinengine-level",
            version: 1,
        },
        objects: [],
    };
    if (extra_meta) Object.assign(data.meta, extra_meta);

    for (const obj of scene.game_objects) {
        if (!DE._BUILDERS[obj.tag] && !extractors[obj.tag]) continue;
        const entry = {
            tag: obj.tag,
            name: obj.name,
            x: Math.round(obj.position.x * 100) / 100,
            y: Math.round(obj.position.y * 100) / 100,
            w: Math.round(obj.size.x * 100) / 100,
            h: Math.round(obj.size.y * 100) / 100,
        };
        const spr = obj.get_component(DE.SpriteRenderer);
        if (spr) {
            entry.color = [...spr.color];
            entry.shape = spr.shape;
        }
        const ext = extractors[obj.tag];
        if (ext) {
            const extra = ext(obj) || {};
            Object.assign(entry, extra);
        }
        data.objects.push(entry);
    }
    if (path) {
        const fsmod = DE._fs || (typeof require === "function"
            ? (function () { try { return require("fs"); } catch (e) { return null; } })()
            : null);
        if (fsmod && fsmod.writeFileSync) {
            fsmod.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
        }
    }
    return data;
};

function _theme_of(scene) {
    const pb = scene.parallax_background;
    if (pb && pb.theme) return pb.theme;
    return null;
}

DE.load_level = function (source, extra_builder_data = null, finalize = null) {
    let data = source;
    if (typeof source === "string") {
        try {
            data = JSON.parse(source);
        } catch (e) {
            // Python load_level(path) gibi: dosya yolu verilmişse Node'da oku.
            const fsmod = DE._fs || (typeof require === "function"
                ? (function () { try { return require("fs"); } catch (err) { return null; } })()
                : null);
            if (!fsmod || !fsmod.readFileSync) throw e;
            data = JSON.parse(fsmod.readFileSync(source, "utf8"));
        }
    }
    const meta = data.meta || {};
    const scene = new DE.Scene(
        meta.name || "Unnamed Level",
        meta.background_color ? [...meta.background_color] : [30, 30, 40],
    );

    const theme = meta.parallax_theme;
    if (theme && DE.ParallaxBackground) {
        try {
            scene.parallax_background = new DE.ParallaxBackground(theme);
        } catch (e) {
            console.log("[DerinEngine] Parallax tema uyarisi:", e.message);
        }
    }

    for (const entry of (data.objects || [])) {
        const item = Object.assign({}, entry);
        if (extra_builder_data) {
            for (const k in extra_builder_data) {
                if (!(k in item)) item[k] = extra_builder_data[k];
            }
        }
        DE.place_object(scene, item);
    }

    const cam_target = meta.camera_target || "Player";
    const target = scene.find_by_tag(cam_target);
    if (target && scene.set_camera_target) scene.set_camera_target(target);

    scene.start();
    if (finalize) finalize(scene);
    return scene;
};