"""Optimización 1 de El Bodegón (26/10/2026): ortografía, nombres y platos faltantes.

Uso:
  python3 seeds/el-bodegon/optimizacion_1.py            # simulación: solo muestra cambios
  python3 seeds/el-bodegon/optimizacion_1.py --apply    # aplica en Supabase

Respaldo previo en seeds/el-bodegon/respaldo-2026-10-26/.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

RID = "794d56ab-f8fe-42cc-9ee7-13a1315bf93f"
APPLY = "--apply" in sys.argv


def load_env():
    path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    for line in open(path):
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


def q(v):
    return urllib.parse.quote(v, safe="")


# --- Perfil -----------------------------------------------------------------
PROFILE = {
    "name": "El Bodegón",
    "menu_cover_title": "El Bodegón",
    "menu_cover_description": "Comida italiana, expertos en pizzas y pastas",
}

# --- Nombres de productos (actual -> nuevo) ---------------------------------
NAMES = {
    "Pizza pequeña ": "Pizza pequeña",
    "Ensalada Cesar": "Ensalada César",
    "Crema pollo champiñon": "Crema Pollo Champiñón",
    "Hojaldrado Pollo y Champiñon (Panzerotti)": "Hojaldrado Pollo y Champiñón (Panzerotti)",
    "Hojaldrado Pollo y Champiñon (Siciliana)": "Hojaldrado Pollo y Champiñón (Siciliana)",
    "Pollo Champiñon": "Pollo Champiñón",
    "Albondigas": "Albóndigas",
    "Cerveza Nacionales": "Cervezas Nacionales",
    "Cerveza Importadas": "Cervezas Importadas",
    "Raviolis Boloñesa ó Pollo": "Raviolis Boloñesa o Pollo",
    "Copa de Vino - 150ml": "Copa de Vino (150 ml)",
}
for size in ("1 persona", "2-3 personas", "3-4 personas"):
    NAMES[f"Pizza Bodegon Criolla ({size})"] = f"Pizza Bodegón Criolla ({size})"
    NAMES[f"Pizza Pollo y Champiñon ({size})"] = f"Pizza Pollo y Champiñón ({size})"
    NAMES[f"Pizza Pollo y tocineta ({size})"] = f"Pizza Pollo y Tocineta ({size})"

CESAR = "Combinación de tomates cherry, aceitunas, mix de lechugas, queso Paipa, crutones y aderezo César."
MELA = "Manzana melada, pepperoni gourmet, almendra laminada y queso de búfala."

# --- Descripciones (nombre ACTUAL -> nueva descripción) ---------------------
DESCRIPTIONS = {
    "Pizza pequeña ": "Pizza personal (elige un sabor)",
    "Ensalada Cesar": CESAR,
    "Pizza Trucha di Bodegón (1 persona)": "Trucha fresca y ahumada con rúgula, queso de búfala, mantequilla de cebolla, cilantro y reducción de balsámico.",
    "Pizza Mela Mandorla (1 persona)": MELA,
    "Pizza Mela Mandorla (2-3 personas)": MELA,
    "Pizza Mela Mandorla (3-4 personas)": MELA,
}

# --- Sabores de la Pizza pequeña (etiqueta actual -> nueva) -----------------
OPTIONS = {
    "Bodegón Oeste: Al estilo mexicano (frijol, boloñesa, pico de gallo, tacos y queso":
        "Bodegón Oeste: Al estilo mexicano (frijol, boloñesa, pico de gallo, tacos y queso)",
    "Trucha di Bodegón: Trucha fresca y ahumada con rúgula, queso de búfala, mantequilla de cebolla, cilantro y reducción de balsámico.":
        "Trucha di Bodegón: Trucha fresca y ahumada con rúgula, queso de búfala, mantequilla de cebolla, cilantro y reducción de balsámico",
    "Del Mar: Anillos de calamar, filete de trucha y palmitos en salsa de camarones.":
        "Del Mar: Anillos de calamar, filete de trucha y palmitos en salsa de camarones",
    "Bodegón Criolla: Chorizo, madurito, maíz tierno y salsa criolla.":
        "Bodegón Criolla: Chorizo, madurito, maíz tierno y salsa criolla",
    "Pollo y Champiñón (Sin descripción detallada en el menú)": "Pollo y Champiñón",
    "11.  12. Pollo Miel Mostaza (Sin descripción detallada en el menú)": "Pollo Miel Mostaza",
    "Napolitana y Champiñones (Sin descripción detallada en el menú)": "Napolitana y Champiñones",
    "Hawaiana (Sin descripción detallada en el menú)": "Hawaiana",
    "Ciruela y Tocineta (Sin descripción detallada en el menú)": "Ciruela y Tocineta",
}

# --- Platos que faltan (copiados de El Bodegón Sogamoso, mismos precios) ----
NEW_PRODUCTS = [
    {
        "name": "Ensalada César +Pollo (150gr en crudo)",
        "description": "Adición de pollo a la Ensalada César.",
        "price": 32500,
        "category": "Entradas",
        "display_order": 0,
    },
    {
        "name": "Pizza Del Mar (3-4 personas)",
        "description": "Anillos de calamar, filete de trucha y palmitos en salsa de camarones.",
        "price": 96900,
        "category": "Pizzas",
        "display_order": 43,
    },
]


def main():
    print("MODO:", "APLICAR" if APPLY else "SIMULACIÓN (usa --apply para escribir)")
    products = req("GET", f"/products?restaurant_id=eq.{RID}&select=id,name,description")
    by_name = {p["name"]: p for p in products}

    print("\n# Perfil")
    for k, v in PROFILE.items():
        print(f"  {k}: -> {v!r}")
    if APPLY:
        req("PATCH", f"/profiles?id=eq.{RID}", PROFILE)

    print("\n# Productos")
    for old in sorted(set(NAMES) | set(DESCRIPTIONS)):
        p = by_name.get(old)
        if not p:
            print(f"  ! no encontrado: {old!r}")
            continue
        patch = {}
        if old in NAMES:
            patch["name"] = NAMES[old]
        if old in DESCRIPTIONS and DESCRIPTIONS[old] != p["description"]:
            patch["description"] = DESCRIPTIONS[old]
        print(f"  {old!r} -> {patch}")
        if APPLY:
            req("PATCH", f"/products?id=eq.{p['id']}", patch)

    print("\n# Sabores (Pizza pequeña)")
    groups = req("GET", f"/customization_groups?restaurant_id=eq.{RID}&select=id")
    gids = ",".join(g["id"] for g in groups)
    options = req("GET", f"/customization_options?group_id=in.({gids})&select=id,label")
    by_label = {o["label"]: o for o in options}
    for old, new in OPTIONS.items():
        o = by_label.get(old)
        if not o:
            print(f"  ! no encontrado: {old!r}")
            continue
        print(f"  {old!r} -> {new!r}")
        if APPLY:
            req("PATCH", f"/customization_options?id=eq.{o['id']}", {"label": new})

    print("\n# Platos nuevos")
    for np in NEW_PRODUCTS:
        if np["name"] in by_name:
            print(f"  ya existe: {np['name']!r}")
            continue
        print(f"  + {np['name']!r} ${np['price']} en {np['category']}")
        if APPLY:
            req("POST", "/products", {**np, "restaurant_id": RID, "available": True})


if __name__ == "__main__":
    main()
