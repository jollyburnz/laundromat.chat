import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Translate text using Azure Translator API
 * Free tier: 2 million characters per month
 */
async function translateWithAzure(text: string, targetLanguage: string): Promise<string> {
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const subscriptionKey = process.env.AZURE_TRANSLATOR_KEY!;
  const region = process.env.AZURE_TRANSLATOR_REGION || 'global';
  
  // Map our language codes to Azure Translator codes
  const azureLangMap: Record<string, string> = {
    'zh': 'zh-Hant',  // Traditional Chinese
    'es': 'es',       // Spanish
    'en': 'en'        // English
  };
  
  const azureTargetLang = azureLangMap[targetLanguage] || targetLanguage;
  
  const response = await fetch(
    `${endpoint}/translate?api-version=3.0&to=${azureTargetLang}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Translator API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data[0].translations[0].text;
}

export async function POST(request: NextRequest) {
  try {
    // Check if translations are enabled
    const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
    
    if (!translationsEnabled) {
      return NextResponse.json(
        { error: 'Translations are disabled' },
        { status: 403 }
      );
    }

    const { text, targetLanguage, messageId } = await request.json();

    if (!text || !targetLanguage || !messageId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if translation already exists
    const { data: existingTranslation } = await supabase
      .from('message_translations')
      .select('translated_text')
      .eq('message_id', messageId)
      .eq('target_language', targetLanguage)
      .single();

    if (existingTranslation) {
      return NextResponse.json({
        translatedText: existingTranslation.translated_text,
      });
    }

    // Translate using Azure Translator
    const translatedText = await translateWithAzure(text, targetLanguage);

    // Store translation in database
    await supabase
      .from('message_translations')
      .insert({
        message_id: messageId,
        target_language: targetLanguage,
        translated_text: translatedText,
      });

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    );
  }
}

