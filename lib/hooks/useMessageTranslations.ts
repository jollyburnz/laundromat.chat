import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  text: string;
  language: string | null;
}

interface UseMessageTranslationsProps {
  messages: Message[];
  locale: string; // Route locale is the source of truth
}

interface UseMessageTranslationsReturn {
  translations: Record<string, string>;
  showOriginal: Record<string, boolean>;
  toggleOriginal: (messageId: string) => void;
  fetchTranslationForMessage: (message: Message) => Promise<void>;
  clearCaches: () => void;
  isLoading: boolean;
}

export function useMessageTranslations({
  messages,
  locale,
}: UseMessageTranslationsProps): UseMessageTranslationsReturn {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Track current fetch language and abort controllers
  const currentFetchLanguageRef = useRef<string | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Fetch translation for a single message
  const fetchTranslationForMessage = useCallback(async (message: Message) => {
    const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
    if (!translationsEnabled || !message.language || message.language === locale) {
      return;
    }

    try {
      // Check cache first
      const { data, error } = await supabase
        .from('message_translations')
        .select('translated_text')
        .eq('message_id', message.id)
        .eq('target_language', locale)
        .single();

      if (!error && data) {
        setTranslations(prev => ({ ...prev, [message.id]: data.translated_text }));
        return;
      }

      // Fetch from API if not cached (pass source language for accurate translation)
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          sourceLanguage: message.language,
          targetLanguage: locale,
          messageId: message.id,
        }),
      });

      if (response.ok) {
        const { translatedText } = await response.json();
        setTranslations(prev => ({ ...prev, [message.id]: translatedText }));
      }
    } catch (err) {
      console.error('Error fetching translation:', err);
    }
  }, [locale]);

  // Batch fetch translations for multiple messages
  const fetchTranslations = useCallback(async (msgs: Message[], targetLang: string) => {
    const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
    if (!translationsEnabled) return;

    // Cancel any in-flight fetches for different languages
    abortControllersRef.current.forEach((controller, lang) => {
      if (lang !== targetLang) {
        controller.abort();
        abortControllersRef.current.delete(lang);
      }
    });

    // Create new abort controller for this fetch
    const abortController = new AbortController();
    abortControllersRef.current.set(targetLang, abortController);
    currentFetchLanguageRef.current = targetLang;

    const needsTranslation = msgs.filter(msg => {
      if (!msg.language) return false;
      if (msg.language === targetLang) return false;
      return true;
    });

    if (needsTranslation.length === 0) {
      setTranslations({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Batch fetch cached translations
      const messageIds = needsTranslation.map(msg => msg.id);
      const { data: cachedTranslations } = await supabase
        .from('message_translations')
        .select('message_id, translated_text')
        .in('message_id', messageIds)
        .eq('target_language', targetLang);

      // Create map of cached translations
      const cachedMap = new Map<string, string>();
      if (cachedTranslations) {
        cachedTranslations.forEach(t => {
          cachedMap.set(t.message_id, t.translated_text);
        });
      }

      // Fetch missing translations from API
      const missingTranslations = needsTranslation.filter(
        msg => !cachedMap.has(msg.id)
      );

      const apiPromises = missingTranslations.map(async (msg) => {
        if (abortController.signal.aborted) return null;

        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.text,
              sourceLanguage: msg.language,
              targetLanguage: targetLang,
              messageId: msg.id,
            }),
            signal: abortController.signal,
          });

          if (response.ok) {
            const { translatedText } = await response.json();
            return { messageId: msg.id, translatedText };
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error fetching translation:', err);
          }
        }
        return null;
      });

      const apiResults = await Promise.all(apiPromises);

      // Check if this fetch is still valid
      if (currentFetchLanguageRef.current === targetLang && !abortController.signal.aborted) {
        const newTranslations: Record<string, string> = {};

        // Add cached translations
        cachedMap.forEach((text, messageId) => {
          newTranslations[messageId] = text;
        });

        // Add API translations
        apiResults.forEach((result) => {
          if (result) {
            newTranslations[result.messageId] = result.translatedText;
          }
        });

        setTranslations(newTranslations);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching translations:', err);
      }
    } finally {
      if (currentFetchLanguageRef.current === targetLang) {
        setIsLoading(false);
      }
    }
  }, []);

  // Refetch translations when messages or locale changes
  useEffect(() => {
    if (messages.length > 0 && locale) {
      // Clear old translations when locale changes
      setTranslations({});
      setShowOriginal({});
      fetchTranslations(messages, locale);
    }

    // Capture the current controllers map at effect start
    const currentControllers = abortControllersRef.current;

    return () => {
      // Cleanup: abort any in-flight fetches using the captured map
      currentControllers.forEach(controller => controller.abort());
      currentControllers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, locale]); // fetchTranslations is stable (empty deps), so we don't need it in deps

  const toggleOriginal = useCallback((messageId: string) => {
    setShowOriginal(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  }, []);

  const clearCaches = useCallback(() => {
    console.log('Clearing translation caches due to purge detection');
    setTranslations({});
    setShowOriginal({});
  }, []);

  return {
    translations,
    showOriginal,
    toggleOriginal,
    fetchTranslationForMessage,
    clearCaches,
    isLoading,
  };
}

