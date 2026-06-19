import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    let fileUrl = '';
    let buffer: Buffer | null = null;
    let base64Data = '';
    let mimeType = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      fileUrl = body.fileUrl || '';
      const { mimeType: bodyMimeType } = body;
      if (!fileUrl) {
        return NextResponse.json({ error: 'Falta la URL del archivo (fileUrl)' }, { status: 400 });
      }

      // Descargar el archivo temporal desde Supabase Storage
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'No se pudo descargar el archivo desde el almacenamiento' }, { status: 500 });
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      base64Data = buffer.toString('base64');
      mimeType = bodyMimeType || response.headers.get('content-type') || 'application/octet-stream';
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
      }

      // Convertir el archivo a base64
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      base64Data = buffer.toString('base64');
      mimeType = file.type;
    }

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

    let result;

    // Verificar de manera robusta si es un PDF por:
    // 1. MimeType en los metadatos (incluye 'pdf').
    // 2. Extensión del archivo en la URL (si existe).
    // 3. Firma digital o "magic bytes" en el buffer (los PDF inician con "%PDF" en ASCII).
    const isPDF = 
      mimeType.toLowerCase().includes('pdf') ||
      (fileUrl && fileUrl.toLowerCase().split('?')[0].endsWith('.pdf')) ||
      (buffer && buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === '%PDF');

    if (isPDF) {
      mimeType = 'application/pdf';
      if (!buffer) {
        return NextResponse.json({ error: 'No se pudo obtener el contenido del archivo PDF' }, { status: 400 });
      }
      // Para PDFs, usamos la File API de Gemini para evitar el error de mime type no soportado en inlineData
      const fileManager = new GoogleAIFileManager(apiKey);
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `menu_${Date.now()}.pdf`);
      
      // Escribir a archivo temporal en disco
      fs.writeFileSync(tempFilePath, buffer);

      try {
        // Subir el archivo a Gemini File API
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
          mimeType: 'application/pdf',
          displayName: 'Menu PDF',
        });

        // Llamar a Gemini con el archivo de la File API
        result = await model.generateContent([
          {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: uploadResult.file.mimeType
            }
          },
          prompt
        ]);

        // Limpiar el archivo en Gemini File API después de generar el contenido
        try {
          await fileManager.deleteFile(uploadResult.file.name);
        } catch (deleteError) {
          console.error('Error al eliminar archivo en Gemini File API:', deleteError);
        }
      } finally {
        // Limpiar el archivo local temporal
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (unlinkError) {
          console.error('Error al eliminar archivo local temporal:', unlinkError);
        }
      }
    } else {
      // Para imágenes, seguimos usando inlineData ya que es más rápido y son más livianas
      result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ]);
    }

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

