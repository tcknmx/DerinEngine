/* DerinEngine — TrenchBroom .map loader (ORTA-9 / .map 3D adım)
 * Minimal parser: "entity" { ... } bloklarını okur, tag -> builder eşleştirir.
 * Harici kütüphane yok. Örnek: worldspawn, func_detail, light.
 */
var DE = DE || {};

DE.load_map_string = function(data_string, scene) {
    const lines = data_string.split(/\r?\n/);
    let i = 0;
    const entities = [];
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === "{") { i++; continue; }
        if (line.startsWith("//") || line === "" || line === "}") { i++; continue; }
        // "entity_name" satırı -> bir sonraki "{" bloğunu oku
        if (line.startsWith('"') && line.endsWith('"')) {
            const name = line.slice(1, -1);
            i++;
            const props = {};
            while (i < lines.length) {
                const propLine = lines[i].trim();
                i++;
                if (propLine === "}") break;
                // "key" "value"
                const m = propLine.match(/"([^"]+)"\s+"([^"]*)"/);
                if (m) props[m[1]] = m[2];
            }
            entities.push({ name: name, props: props });
            continue;
        }
        i++;
    }
    // Her entity için scene'e yerleştir (builder tanımlıysa)
    entities.forEach(ent => {
        const tag = ent.name; // basit eşleme: entity adı = tag
        const builder = DE._BUILDERS[tag] || (ent.name === "worldspawn" ? (_scene, d) => {
            // Basit zemin: .map'ten gelen "_color" veya varsayılan
            const obj = new DE.GameObject("WorldSpawn", 450, 300, 100, 20, "Ground");
            obj.add_component(new DE.SpriteRenderer([60, 80, 60], "rect", 2));
            obj.add_component(new DE.BoxCollider(true));
            _scene.add_object(obj);
            return obj;
        } : null);
        if (builder) {
            try { builder(scene, { tag: tag, ...ent.props, name: ent.name }); } catch(e) { /* sessiz */ }
        }
    });
    return entities.length + " .map entity yüklendi";
};
