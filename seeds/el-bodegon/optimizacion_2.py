"""Optimización 2 de El Bodegón (26/10/2026): menú igual a la carta original.

Parte A: precios de la carta, platos nuevos, presentación de pastas, orden.
Parte B: pizzas Personal / Mediana / Grande que cobran el sabor de mayor valor.
         Requiere la columna products.pricing_mode (ver SQL en el README de la marca);
         si no existe, la parte B no se ejecuta.

Uso:
  python3 seeds/el-bodegon/optimizacion_2.py            # simulación
  python3 seeds/el-bodegon/optimizacion_2.py --apply    # aplica en Supabase

Respaldo previo en seeds/el-bodegon/respaldo-2026-10-26/.
"""
import json
import os
import sys
import urllib.error
import urllib.request

RID = "794d56ab-f8fe-42cc-9ee7-13a1315bf93f"
APPLY = "--apply" in sys.argv
HERE = os.path.dirname(__file__)


def load_env():
    for line in open(os.path.join(HERE, "..", "..", ".env.local")):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v)


load_env()
BASE = os.environ["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def req(method, path, body=None):
    r = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": KEY,
            "Authorization": "Bearer " + KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read() or "null")


def has_column(table, column):
    try:
        req("GET", f"/{table}?select={column}&limit=1")
        return True
    except urllib.error.HTTPError:
        return False


CATEGORY_ORDER = ["Entradas", "Pastas", "Raviolis", "Pizzas", "Hojaldrados",
                  "Mixtos", "Bebidas", "Cervezas", "Aperitivos", "Postres"]

LET, LE, ET, LEC = "LET", "LE", "ET", "LEC"
PRESENTACIONES = {
    LET: ["Lasaña", "Espagueti", "Tallarín"],
    LE: ["Lasaña", "Espagueti"],
    ET: ["Espagueti", "Tallarín"],
    LEC: ["Lasaña", "Espagueti", "Canelón"],
}

# Menú según la carta, en su orden. Cada plato:
#   (nombres que puede tener hoy en la BD, nombre final, precio, cambios extra)
# Cambios extra: description, category, presentacion (clave de PRESENTACIONES), fruta.
MENU = {
    "Entradas": [
        (["Ensalada César"], "Ensalada César", 22500, {}),
        (["Ensalada César +Pollo (150gr en crudo)"], "Ensalada César +Pollo (150gr en crudo)", 30500, {}),
        (["Ensalada Mexicana"], "Ensalada Mexicana", 24500, {}),
        (["Ensalada Mexicana +Pollo (150gr en crudo)"], "Ensalada Mexicana +Pollo (150gr en crudo)", 32500, {}),
        (["Crema Trucha"], "Crema Trucha", 20900, {}),
        (["Crema Pollo Champiñón"], "Crema Pollo Champiñón", 18900, {}),
        (["Crema Tomate"], "Crema Tomate", 16900, {}),
        ([], "Capunata", 24900, {}),
    ],
    "Pastas": [
        (["Mediterránea"], "Mediterránea", 51500, {"presentacion": LET}),
        (["Marinera"], "Marinera", 48500, {"presentacion": LET}),
        (["Oriental"], "Oriental", 40500, {"presentacion": LE}),
        (["Carbonara"], "Carbonara", 38900, {"presentacion": ET,
            "description": "Suave sabor de tocineta y jamón en salsa carbonara."}),
        (["Pesto y Camarones"], "Pesto y Camarones", 38900, {"presentacion": ET, "description": ""}),
        (["Pollo Champiñón"], "Pollo Champiñón", 38900, {"presentacion": LEC}),
        (["Pollo Boloñesa"], "Pollo Boloñesa", 38900, {"presentacion": LEC}),
        (["Pollo Camarón"], "Pollo Camarón", 44500, {"presentacion": LEC}),
        (["Canelones Pollo y Espinaca"], "Canelones Pollo y Espinaca", 38900, {"category": "Pastas"}),
        (["Canelones Boloñesa y Espinaca"], "Canelones Boloñesa y Espinaca", 44500, {"category": "Pastas"}),
        (["Canelones Camarón"], "Canelones de Camarón", 38900, {"category": "Pastas"}),
        (["Pollo Tocineta"], "Pollo Tocineta", 44500, {"presentacion": ET, "description": ""}),
    ],
    "Raviolis": [
        (["Raviolis Ricota y Espinaca"], "Raviolis Ricota y Espinaca", 40900, {}),
        (["Raviolis Boloñesa o Pollo"], "Raviolis Boloñesa o Pollo", 40900, {}),
    ],
    "Hojaldrados": [
        (["Hojaldrado Camarones (Panzerotti)"], "Hojaldrado Camarones (Panzerotti)", 48500, {}),
        (["Hojaldrado Camarones (Siciliana)"], "Hojaldrado Camarones (Siciliana)", 35900, {}),
        (["Hojaldrado Pollo y Champiñón (Panzerotti)"], "Hojaldrado Pollo y Champiñón (Panzerotti)", 39900, {}),
        (["Hojaldrado Pollo y Champiñón (Siciliana)"], "Hojaldrado Pollo y Champiñón (Siciliana)", 29900, {}),
        (["Hojaldrado Hawaiano (Panzerotti)"], "Hojaldrado Hawaiano (Panzerotti)", 39900, {}),
        (["Hojaldrado Oriental (Panzerotti)"], "Hojaldrado Oriental (Panzerotti)", 40500, {}),
        (["Hojaldrado Napolitano (Panzerotti)"], "Hojaldrado Napolitano (Panzerotti)", 35500, {}),
    ],
    "Mixtos": [
        (["Mixto Napolitano"], "Mixto Napolitano", 48500, {}),
        (["Mixto California"], "Mixto California", 48500, {}),
    ],
    "Bebidas": [
        (["Jugo Natural"], "Jugo Natural", 8900, {}),
        (["Crema de Fruta Natural"], "Crema de Fruta Natural", 10900, {}),
        (["Limonada de Coco"], "Limonada de Coco", 10500, {}),
        (["Limonada con Hierbabuena"], "Limonada con Hierbabuena", 8500, {}),
        (["Mandarinada"], "Mandarinada", 8900, {}),
        (["Limonada Natural"], "Limonada Natural", 7900, {}),
        (["Soda Italiana Bretaña"], "Soda Italiana Bretaña", 12900, {}),
        (["Gaseosa"], "Gaseosa", 6500, {}),
    ],
    "Cervezas": [
        (["Cervezas Nacionales"], "Cervezas Nacionales", 7500, {}),
        (["Cervezas Importadas"], "Cervezas Importadas", 9500, {}),
        (["Cerveza BBC"], "Cerveza BBC", 10000, {}),
        (["Cervezas Artesanales"], "Cervezas Artesanales", 12000, {}),
    ],
    "Aperitivos": [
        (["Mojito"], "Mojito", 18900, {}),
        (["Vino Caliente"], "Vino Caliente", 13000, {}),
        (["Copa de Vino (150 ml)"], "Copa de Vino (150 ml)", 8900, {}),
        (["Aperol Spritz"], "Aperol Spritz", 18900, {}),
    ],
    "Postres": [
        (["Tartaleta de manzana con Helado"], "Tartaleta de manzana o banano con helado", 17500, {"fruta": True}),
        ([], "Copa de Brownie con helado", 13500, {
            "description": "Trozos de brownie calientico con helado, crema de chantilly y melocotones."}),
        (["Pizza de Nutella con Helado"], "Pizza de Nutella con Helado", 17500, {}),
        (["Malteada"], "Malteada", 15500, {}),
    ],
}

# Platos de la BD que no están en la carta: se ocultan (available=false), no se borran.
OCULTAR = ["Albóndigas Napolitanas", "Albóndigas", "Canelones Pollo Camarón", "Torta Almojábana con helado"]

TAMANOS = [
    ("Pizza Personal", "personal", 1, "1 persona. Elige 1 sabor."),
    ("Pizza Mediana", "mediana", 2, "2 personas. Elige hasta 2 sabores: se cobra el de mayor valor."),
    ("Pizza Grande", "grande", 3, "3 personas. Elige hasta 3 sabores: se cobra el de mayor valor."),
]


def log(msg):
    print(msg)


def ensure_group(groups_by_name, name, description, min_sel, max_sel, required, options, order):
    """Crea (o reutiliza) un grupo de personalización con sus opciones. Devuelve su id."""
    if name in groups_by_name:
        return groups_by_name[name]["id"]
    log(f"  + grupo {name!r}: {[o[0] for o in options]}")
    if not APPLY:
        return f"<nuevo:{name}>"
    g = req("POST", "/customization_groups", {
        "restaurant_id": RID, "name": name, "description": description,
        "required": required, "min_selections": min_sel, "max_selections": max_sel,
        "display_order": order,
    })[0]
    req("POST", "/customization_options", [
        {"group_id": g["id"], "label": label, "price": price, "display_order": i}
        for i, (label, price) in enumerate(options)
    ])
    groups_by_name[name] = g
    return g["id"]


def link(product_id, group_id):
    if APPLY:
        req("DELETE", f"/product_customization_groups?product_id=eq.{product_id}")
        req("POST", "/product_customization_groups",
            {"product_id": product_id, "group_id": group_id, "is_copy": False, "display_order": 0})


def parte_a(products, groups_by_name):
    log("\n=== PARTE A: platos según la carta ===")
    by_name = {p["name"]: p for p in products}

    pres_groups = {}
    for key, opts in PRESENTACIONES.items():
        name = "Presentación: " + ", ".join(opts)
        pres_groups[key] = ensure_group(groups_by_name, name, "Elige cómo quieres tu pasta",
                                        1, 1, True, [(o, 0) for o in opts], 10)
    fruta_group = ensure_group(groups_by_name, "Fruta de la tartaleta", "Elige la fruta",
                               1, 1, True, [("Manzana", 0), ("Banano", 0)], 11)

    for category, items in MENU.items():
        for order, (old_names, name, price, extra) in enumerate(items):
            current = next((by_name[n] for n in old_names + [name] if n in by_name), None)
            patch = {"name": name, "price": price, "category": extra.get("category", category),
                     "display_order": order, "available": True, "image_url": None}
            if "description" in extra:
                patch["description"] = extra["description"]
            if current is None:
                log(f"  + {category}: {name} ${price}")
                if APPLY:
                    current = req("POST", "/products", {
                        **patch, "restaurant_id": RID, "description": extra.get("description", "")})[0]
            else:
                changes = {k: v for k, v in patch.items() if current.get(k) != v}
                if changes:
                    log(f"  ~ {current['name']}: {changes}")
                    if APPLY:
                        req("PATCH", f"/products?id=eq.{current['id']}", changes)
            if current and "presentacion" in extra:
                link(current["id"], pres_groups[extra["presentacion"]])
            if current and extra.get("fruta"):
                link(current["id"], fruta_group)

    for name in OCULTAR:
        p = by_name.get(name)
        if p and p["available"]:
            log(f"  - ocultar (no está en la carta): {name}")
            if APPLY:
                req("PATCH", f"/products?id=eq.{p['id']}", {"available": False})

    log(f"  orden de categorías: {CATEGORY_ORDER}")
    if APPLY:
        req("PATCH", f"/profiles?id=eq.{RID}", {"category_order": CATEGORY_ORDER})


def parte_b(products, groups_by_name):
    log("\n=== PARTE B: pizzas por tamaño ===")
    if not has_column("products", "pricing_mode"):
        log("  ! Falta la columna products.pricing_mode. Ejecuta el SQL y vuelve a correr el script.")
        return
    carta = json.load(open(os.path.join(HERE, "carta.json")))
    by_name = {p["name"]: p for p in products}
    nuevos = {t[0] for t in TAMANOS}

    for order, (name, key, max_sab, desc) in enumerate(TAMANOS):
        options = []
        for z in carta["pizzas"]:
            if z[key] is None:
                continue
            label = f"{z['sabor']}: {z['descripcion'].rstrip('.')}" if z["descripcion"] else z["sabor"]
            options.append((label, z[key]))
        gid = ensure_group(groups_by_name, f"Sabores {name.split()[1]}",
                           f"Elige hasta {max_sab} sabor{'es' if max_sab > 1 else ''}" if max_sab > 1 else "Elige 1 sabor",
                           1, max_sab, True, options, order)
        base = min(p for _, p in options)
        payload = {"name": name, "description": desc, "price": base, "category": "Pizzas",
                   "display_order": order, "available": True, "image_url": None,
                   "pricing_mode": "max_selected_option"}
        current = by_name.get(name)
        log(f"  {'~' if current else '+'} {name}: desde ${base}, hasta {max_sab} sabores, {len(options)} sabores")
        if APPLY:
            if current:
                req("PATCH", f"/products?id=eq.{current['id']}", payload)
            else:
                current = req("POST", "/products", {**payload, "restaurant_id": RID})[0]
            link(current["id"], gid)

    viejas = [p for p in products if p["category"] == "Pizzas" and p["name"] not in nuevos]
    log(f"  - borrar {len(viejas)} pizzas sueltas anteriores (quedan en el respaldo)")
    old_group = groups_by_name.get("Sabores")
    if APPLY:
        for p in viejas:
            req("DELETE", f"/product_customization_groups?product_id=eq.{p['id']}")
            req("DELETE", f"/products?id=eq.{p['id']}")
        if old_group:
            req("DELETE", f"/customization_options?group_id=eq.{old_group['id']}")
            req("DELETE", f"/customization_groups?id=eq.{old_group['id']}")
    if old_group:
        log("  - borrar grupo viejo 'Sabores' de la Pizza pequeña")


def main():
    log("MODO: " + ("APLICAR" if APPLY else "SIMULACIÓN (usa --apply para escribir)"))
    products = req("GET", f"/products?restaurant_id=eq.{RID}&select=*")
    groups = req("GET", f"/customization_groups?restaurant_id=eq.{RID}&select=*")
    groups_by_name = {g["name"]: g for g in groups}
    parte_a(products, groups_by_name)
    products = req("GET", f"/products?restaurant_id=eq.{RID}&select=*")
    parte_b(products, groups_by_name)


if __name__ == "__main__":
    main()
