export interface ProductCustomizationOption {
  id: string;
  label: string;
  description?: string;
  price?: number;
}

export interface ProductCustomizationGroup {
  id: string;
  label: string;
  description?: string;
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
  options: ProductCustomizationOption[];
}

export interface ProductCustomizationConfig {
  title?: string;
  description?: string;
  groups: ProductCustomizationGroup[];
}

export interface ParsedProductDescription {
  cleanDescription: string;
  config: ProductCustomizationConfig | null;
}

const CUSTOMIZATION_MARKER = '__MENU_CUSTOMIZATION__';

export function extractProductCustomization(description?: string | null): ParsedProductDescription {
  if (!description) {
    return { cleanDescription: '', config: null };
  }

  const markerIndex = description.indexOf(CUSTOMIZATION_MARKER);
  if (markerIndex === -1) {
    return { cleanDescription: description, config: null };
  }

  const cleanDescription = description.slice(0, markerIndex).trim();
  const payload = description.slice(markerIndex + CUSTOMIZATION_MARKER.length).trim();

  if (!payload) {
    return { cleanDescription, config: null };
  }

  try {
    const parsed = JSON.parse(payload) as ProductCustomizationConfig;
    return {
      cleanDescription,
      config: parsed && Array.isArray(parsed.groups) ? parsed : null,
    };
  } catch {
    return { cleanDescription, config: null };
  }
}

export function buildProductDescription(description?: string | null, config?: ProductCustomizationConfig | null): string {
  const cleanDescription = (description || '').trim();
  if (!config || !config.groups?.length) {
    return cleanDescription;
  }

  return `${cleanDescription}${cleanDescription ? '\n\n' : ''}${CUSTOMIZATION_MARKER}${JSON.stringify(config)}`;
}

export function parseCustomizationConfig(rawValue: string): ProductCustomizationConfig | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ProductCustomizationConfig;
    return parsed && Array.isArray(parsed.groups) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatCustomizationConfigForEditor(config?: ProductCustomizationConfig | null): string {
  if (!config) {
    return '';
  }

  return JSON.stringify(config, null, 2);
}

export function getDefaultCustomizationExample(): string {
  return JSON.stringify({
    title: 'Elige tus sabores',
    description: 'Selecciona hasta 2 sabores para tu pizza.',
    groups: [
      {
        id: 'flavors',
        label: 'Sabores',
        description: 'Elige 2 sabores para la pizza.',
        minSelections: 2,
        maxSelections: 2,
        required: true,
        options: [
          { id: 'pepperoni', label: 'Pepperoni' },
          { id: 'hawaiana', label: 'Hawaiana' },
          { id: 'vegetariana', label: 'Vegetariana' },
        ],
      },
    ],
  }, null, 2);
}
