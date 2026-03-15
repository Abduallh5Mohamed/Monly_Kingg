'use client';

import { useEffect } from 'react';

export function ForceEnglishDocument() {
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    const previousDir = document.documentElement.dir;

    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';

    return () => {
      if (previousLang) {
        document.documentElement.lang = previousLang;
      }
      if (previousDir) {
        document.documentElement.dir = previousDir;
      }
    };
  }, []);

  return null;
}