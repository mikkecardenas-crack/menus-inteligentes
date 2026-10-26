# Carga un catálogo (seeds/*.json) en la cuenta de un restaurante ya registrado.
# Uso: python3 seeds/load_catalog.py seeds/<marca>/catalogo.json [--dry-run]
# Lee las credenciales de .env.local. La cuenta debe existir (registro normal en la app).
# Opcional: profile.logo y products[].image (rutas relativas al .json) se suben a Storage;
# products[].available (por defecto true).
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def load_env(path='.env.local'):
    env = {}
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"')
    return env


class ApiError(Exception):
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


env = load_env()
URL = env['NEXT_PUBLIC_SUPABASE_URL']
KEY = env['SUPABASE_SERVICE_ROLE_KEY']


def api(path, method='GET', body=None):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}',
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    )
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        data = json.loads(e.read() or b'{}')
        raise ApiError(data.get('message', str(e)), data.get('code'))


# Igual que el dashboard: sube a restaurant-assets y devuelve la URL pública
def upload(local_path, remote_path):
    with open(local_path, 'rb') as f:
        data = f.read()
    req = urllib.request.Request(
        f'{URL}/storage/v1/object/restaurant-assets/{urllib.parse.quote(remote_path)}',
        method='POST',
        data=data,
        headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': mimetypes.guess_type(local_path)[0] or 'application/octet-stream',
            'x-upsert': 'true',
        },
    )
    try:
        urllib.request.urlopen(req).read()
    except urllib.error.HTTPError as e:
        raise ApiError(f'Storage {remote_path}: {e.read().decode()}')
    return f'{URL}/storage/v1/object/public/restaurant-assets/{urllib.parse.quote(remote_path)}'


# Igual que el dashboard: si la columna opcional no existe (42703), reintenta sin ella
def insert_with_fallback(table, rows, optional_col):
    try:
        return api(table, 'POST', rows)
    except ApiError as e:
        if e.code != '42703' and optional_col not in str(e):
            raise
        return api(table, 'POST', [{k: v for k, v in r.items() if k != optional_col} for r in rows])


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit('Uso: python3 seeds/load_catalog.py <catalogo.json> [--dry-run]')
    dry_run = '--dry-run' in args
    catalog = json.load(open(args[0], encoding='utf-8'))
    base_dir = os.path.dirname(os.path.abspath(args[0]))
    missing = [rel for rel in [catalog['profile'].get('logo')] + [x.get('image') for x in catalog['products']]
               if rel and not os.path.isfile(os.path.join(base_dir, rel))]
    if missing:
        sys.exit(f'Faltan imágenes: {missing}')

    slug = catalog['profile']['slug']
    found = api(f"profiles?select=id,name,slug&slug=eq.{urllib.parse.quote(slug)}")
    if not found:
        sys.exit(f'No existe un restaurante con slug "{slug}". Primero registra la cuenta en la app.')
    profile = found[0]
    if api(f"products?select=id&restaurant_id=eq.{profile['id']}&limit=1"):
        sys.exit(f'"{slug}" ya tiene productos. No se carga nada para evitar duplicados.')

    print(f"Restaurante: {profile['name']} ({slug})")
    print(f"Grupos: {len(catalog['customization_groups'])} · Productos: {len(catalog['products'])}")
    if dry_run:
        print('--dry-run: no se escribió nada.')
        return

    p = catalog['profile']
    update = {'name': p['name'], 'whatsapp': p['whatsapp'], 'category_order': p['category_order']}
    if p.get('primary_color'):
        update['primary_color'] = p['primary_color']
    if p.get('logo'):
        ext = os.path.splitext(p['logo'])[1]
        update['logo_url'] = upload(os.path.join(base_dir, p['logo']), f"logos/{profile['id']}/logo-{int(time.time() * 1000)}{ext}")
    api(f"profiles?id=eq.{profile['id']}", 'PATCH', update)

    group_ids = {}
    for i, g in enumerate(catalog['customization_groups']):
        row = insert_with_fallback('customization_groups', [{
            'restaurant_id': profile['id'],
            'name': g['name'],
            'description': g['description'],
            'required': g['required'],
            'min_selections': g['min_selections'],
            'max_selections': g['max_selections'],
            'display_order': i,
            'pricing_role': g['pricing_role'],
        }], 'pricing_role')[0]
        group_ids[g['key']] = row['id']
        api('customization_options', 'POST', [
            {'group_id': row['id'], 'label': o['label'], 'price': o['price'], 'display_order': j}
            for j, o in enumerate(g['options'])
        ])

    image_urls = [
        upload(os.path.join(base_dir, x['image']), f"products/{profile['id']}/{i:02d}-{os.path.basename(x['image'])}")
        if x.get('image') else None
        for i, x in enumerate(catalog['products'])
    ]

    products = insert_with_fallback('products', [{
        'restaurant_id': profile['id'],
        'name': x['name'],
        'description': x['description'] or None,
        'price': x['price'],
        'category': x['category'],
        'image_url': image_urls[i],
        'available': x.get('available', True),
        'display_order': i,
        'pricing_mode': x['pricing_mode'],
    } for i, x in enumerate(catalog['products'])], 'pricing_mode')

    links = [
        {'product_id': products[i]['id'], 'group_id': group_ids[key], 'is_copy': False, 'display_order': j}
        for i, x in enumerate(catalog['products'])
        for j, key in enumerate(x['groups'])
    ]
    if links:
        api('product_customization_groups', 'POST', links)

    print(f'Listo: {len(products)} productos, {len(group_ids)} grupos, {len(links)} vínculos.')


if __name__ == '__main__':
    main()
