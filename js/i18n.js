import en from "./lang/en.js";
import fr from "./lang/fr.js";
import ar from "./lang/ar.js";

const dictionaryMap = {
  en,
  fr,
  ar,
};

const FALLBACK_LANG = "en";
let currentLanguage = FALLBACK_LANG;

function getDictionary(lang) {
  return dictionaryMap[lang] || dictionaryMap[FALLBACK_LANG] || {};
}

function resolveValue(lang, key) {
  const dict = getDictionary(lang);
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];

  const fallback = getDictionary(FALLBACK_LANG);
  if (Object.prototype.hasOwnProperty.call(fallback, key)) return fallback[key];

  return key;
}

export function setLanguage(lang) {
  currentLanguage = dictionaryMap[lang] ? lang : FALLBACK_LANG;
  return currentLanguage;
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, params = {}) {
  const value = resolveValue(currentLanguage, key);
  return String(value).replace(/\{(\w+)\}/g, (_, name) => {
    const replacement = params[name];
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
}

export function applyLanguage(lang = currentLanguage) {
  const selected = setLanguage(lang);
  document.documentElement.lang = selected;
  document.documentElement.dir = selected === "ar" ? "rtl" : "ltr";
  return selected;
}
