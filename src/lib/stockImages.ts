export interface StockImage {
  id: string;
  name: string;
  url: string;
  category: string;
}

export const STOCK_IMAGES: StockImage[] = [
  {
    id: 'burger',
    name: 'Hamburguesa',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
    category: 'Comida Rápida'
  },
  {
    id: 'pizza',
    name: 'Pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
    category: 'Italiana'
  },
  {
    id: 'tacos',
    name: 'Tacos',
    url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop',
    category: 'Mexicana'
  },
  {
    id: 'hotdog',
    name: 'Perro Caliente',
    url: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&h=400&fit=crop',
    category: 'Comida Rápida'
  },
  {
    id: 'salchipapa',
    name: 'Salchipapa',
    url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&h=400&fit=crop',
    category: 'Comida Rápida'
  },
  {
    id: 'lasagna',
    name: 'Lasaña',
    url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&h=400&fit=crop',
    category: 'Italiana'
  },
  {
    id: 'pasta',
    name: 'Pasta',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop',
    category: 'Italiana'
  },
  {
    id: 'sushi',
    name: 'Sushi',
    url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop',
    category: 'Asiática'
  },
  {
    id: 'salad',
    name: 'Ensalada',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    category: 'Saludable'
  },
  {
    id: 'steak',
    name: 'Carnes',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
    category: 'Carnes'
  },
  {
    id: 'chicken',
    name: 'Pollo',
    url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&h=400&fit=crop',
    category: 'Carnes'
  },
  {
    id: 'dessert',
    name: 'Postres',
    url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=400&fit=crop',
    category: 'Postres'
  },
  {
    id: 'coffee',
    name: 'Café',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop',
    category: 'Bebidas'
  },
  {
    id: 'drink',
    name: 'Bebida / Refresco',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=400&fit=crop',
    category: 'Bebidas'
  },
  {
    id: 'generic',
    name: 'Plato General',
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    category: 'Otros'
  }
];

export function getPlaceholderImage(productName: string, categoryName: string): string {
  const name = productName.toLowerCase();
  const cat = categoryName.toLowerCase();

  const matches = (keywords: string[]) => {
    return keywords.some(keyword => name.includes(keyword) || cat.includes(keyword));
  };

  if (matches(['hamburguesa', 'burger'])) {
    return STOCK_IMAGES.find(img => img.id === 'burger')!.url;
  }
  if (matches(['pizza'])) {
    return STOCK_IMAGES.find(img => img.id === 'pizza')!.url;
  }
  if (matches(['taco', 'quesadilla', 'burrito', 'nacho'])) {
    return STOCK_IMAGES.find(img => img.id === 'tacos')!.url;
  }
  if (matches(['perro', 'hot dog', 'hotdog'])) {
    return STOCK_IMAGES.find(img => img.id === 'hotdog')!.url;
  }
  if (matches(['salchipapa'])) {
    return STOCK_IMAGES.find(img => img.id === 'salchipapa')!.url;
  }
  if (matches(['lasaña', 'lasagna'])) {
    return STOCK_IMAGES.find(img => img.id === 'lasagna')!.url;
  }
  if (matches(['pasta', 'tallarin', 'espagueti', 'spaghetti', 'fetuccini'])) {
    return STOCK_IMAGES.find(img => img.id === 'pasta')!.url;
  }
  if (matches(['sushi', 'maki', 'ramen'])) {
    return STOCK_IMAGES.find(img => img.id === 'sushi')!.url;
  }
  if (matches(['ensalada', 'salad', 'vegetariano', 'healthy'])) {
    return STOCK_IMAGES.find(img => img.id === 'salad')!.url;
  }
  if (matches(['carne', 'steak', 'lomo', 'bife', 'costilla', 'bbq', 'asado'])) {
    return STOCK_IMAGES.find(img => img.id === 'steak')!.url;
  }
  if (matches(['pollo', 'chicken', 'alitas', 'wings'])) {
    return STOCK_IMAGES.find(img => img.id === 'chicken')!.url;
  }
  if (matches(['postre', 'torta', 'helado', 'flan', 'churro', 'dulce', 'crepe', 'waffle'])) {
    return STOCK_IMAGES.find(img => img.id === 'dessert')!.url;
  }
  if (matches(['cafe', 'espresso', 'capuccino', 'mocha', 'latte', 'macchiato'])) {
    return STOCK_IMAGES.find(img => img.id === 'coffee')!.url;
  }
  if (matches(['bebida', 'jugo', 'refresco', 'gaseosa', 'agua', 'limonada', 'cerveza', 'michelada', 'soda', 'coctel', 'vino'])) {
    return STOCK_IMAGES.find(img => img.id === 'drink')!.url;
  }

  return STOCK_IMAGES.find(img => img.id === 'generic')!.url;
}
