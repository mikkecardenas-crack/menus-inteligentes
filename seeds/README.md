# Catálogos por marca

Cada marca tiene su carpeta con `catalogo.json` (y sus imágenes, si las hay).

| Marca | Slug | Estado |
| --- | --- | --- |
| Ricolandia | `ricolandia` | Catálogo listo (47 productos, 46 fotos, logo). Falta registrar la cuenta y cargarlo. |
| Filette Burger | `filette-burger` | Cargado. |
| Palacio del Sabor | `el-palacio-del-sabor` | Cargado; solo respaldo aquí. |

Cargar una marca (la cuenta debe existir y no tener productos):

```bash
python3 seeds/load_catalog.py seeds/<marca>/catalogo.json --dry-run
python3 seeds/load_catalog.py seeds/<marca>/catalogo.json
```
