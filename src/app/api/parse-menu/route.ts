import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    // Convertir el archivo a base64
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    // Inicializar el SDK de Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
      Analiza esta imagen o documento PDF de un menú o carta de restaurante.
      Extrae todas las categorías, platos/productos y precios detectados.
      Devuelve la información estrictamente en formato JSON con la siguiente estructura:
      {
        "products": [
          {
            "name": "Nombre del plato (ej: Hamburguesa Especial)",
            "description": "Descripción corta o ingredientes si están indicados en la carta",
            "price": 18000, // número entero, quita símbolos de moneda y puntos/comas de miles
            "category": "Categoría (ej: Hamburguesas, Bebidas, Entradas)"
          }
        ]
      }
      Intenta agrupar y normalizar los nombres de las categorías.
      Si el precio no está claro, pon 0.
      No agregues texto explicativo antes ni después del JSON. Devuelve únicamente el JSON válido.
    `;

    // Llamar a Gemini con la imagen/PDF
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const responseText = response.text();
    if (!responseText) {
      return NextResponse.json({ error: 'No se pudo obtener respuesta de la IA' }, { status: 500 });
    }

    // Parsear el JSON devuelto
    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en parse-menu API:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el menú con IA' }, { status: 500 });
  }
}
