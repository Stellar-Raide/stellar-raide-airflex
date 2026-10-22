/**
 * A Jest stand-in for `next-intl` that renders real messages from
 * `locales/<locale>/common.json`.
 *
 * next-intl 4 ships ESM only, so tests replace it rather than import it (most
 * suites stub `useTranslations` to return the key). Suites that assert on the
 * text people actually see use this instead:
 *
 *   jest.mock("next-intl", () => jest.requireActual("../../i18n/testing").nextIntlMock);
 *
 * It covers the subset of ICU message syntax the catalogs use — `{name}`
 * arguments, `{count, plural, =1 {…} one {…} other {…}}` with `#`, and rich
 * text tags for `t.rich` — and throws on a missing key, so a key absent from
 * a catalog fails the test instead of rendering as the key.
 *
 * `NextIntlClientProvider` works as in the app: re-rendering it with another
 * `locale` / `messages` updates every component below it in place, which is
 * how a language switch reaches the page without a reload.
 */
import { createContext, Fragment, useContext, type ReactNode } from "react";
import en from "../locales/en/common.json";
import yo from "../locales/yo/common.json";
import ig from "../locales/ig/common.json";
import ha from "../locales/ha/common.json";

type Messages = Record<string, unknown>;
type Values = Record<string, unknown>;

export const catalogs: Record<string, Messages> = { en, yo, ig, ha };

interface IntlState {
  locale: string;
  messages: Messages;
}

const IntlContext = createContext<IntlState>({ locale: "en", messages: en });

function NextIntlClientProvider({
  locale = "en",
  messages,
  children,
}: {
  locale?: string;
  messages?: Messages;
  children: ReactNode;
}) {
  return (
    <IntlContext.Provider value={{ locale, messages: messages ?? catalogs[locale] ?? en }}>
      {children}
    </IntlContext.Provider>
  );
}

function lookup(messages: Messages, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Messages)[part] : undefined), messages);
}

/** Index of the `}` matching the `{` at `open`. */
function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  throw new Error(`Unbalanced braces in message: ${text}`);
}

function selectPlural(options: string, count: number, locale: string): string {
  const branches = new Map<string, string>();
  let i = 0;
  while (i < options.length) {
    const open = options.indexOf("{", i);
    if (open === -1) break;
    const close = matchingBrace(options, open);
    branches.set(options.slice(i, open).trim(), options.slice(open + 1, close));
    i = close + 1;
  }
  const category = new Intl.PluralRules(locale).select(count);
  const branch = branches.get(`=${count}`) ?? branches.get(category) ?? branches.get("other");
  if (branch === undefined) throw new Error(`No plural branch for ${count} in: ${options}`);
  return branch.replace(/#/g, new Intl.NumberFormat(locale).format(count));
}

export function formatMessage(message: string, values: Values, locale: string): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    const open = message.indexOf("{", i);
    if (open === -1) {
      out += message.slice(i);
      break;
    }
    out += message.slice(i, open);
    const close = matchingBrace(message, open);
    const body = message.slice(open + 1, close);
    const plural = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(body);
    if (plural) {
      const count = Number(values[plural[1]!]);
      out += formatMessage(selectPlural(plural[2]!, count, locale), values, locale);
    } else {
      const name = body.trim();
      if (!(name in values)) throw new Error(`Missing value for {${name}} in: ${message}`);
      out += String(values[name]);
    }
    i = close + 1;
  }
  return out;
}

function useTranslations(namespace?: string) {
  const { locale, messages } = useContext(IntlContext);
  const resolve = (key: string) => (namespace ? `${namespace}.${key}` : key);

  const translate = (key: string, values: Values = {}): string => {
    const message = lookup(messages, resolve(key));
    if (typeof message !== "string") {
      throw new Error(`Missing message "${resolve(key)}" for locale "${locale}"`);
    }
    return formatMessage(message, values, locale);
  };

  const rich = (key: string, values: Values = {}): ReactNode => {
    const text = translate(key, values);
    const parts: ReactNode[] = [];
    const tag = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let last = 0;
    for (let m = tag.exec(text); m; m = tag.exec(text)) {
      parts.push(text.slice(last, m.index));
      const render = values[m[1]!] as ((chunks: ReactNode) => ReactNode) | undefined;
      parts.push(<Fragment key={m.index}>{render ? render(m[2]) : m[2]}</Fragment>);
      last = m.index + m[0].length;
    }
    parts.push(text.slice(last));
    return <>{parts}</>;
  };

  const has = (key: string) => typeof lookup(messages, resolve(key)) === "string";

  return Object.assign(translate, { rich, has });
}

function useFormatter() {
  const { locale } = useContext(IntlContext);
  return {
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    dateTime: (value: Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { timeZone: "Africa/Lagos", ...options }).format(value),
  };
}

function useLocale() {
  return useContext(IntlContext).locale;
}

export const nextIntlMock = {
  __esModule: true,
  NextIntlClientProvider,
  useTranslations,
  useFormatter,
  useLocale,
};
