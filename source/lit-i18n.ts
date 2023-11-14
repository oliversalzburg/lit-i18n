import { i18n } from "i18next";
import { html, noChange, render, svg } from "lit-html";
import { AsyncDirective, directive } from "lit-html/async-directive.js";
import { PartInfo } from "lit-html/directive.js";

export { html, svg, render };

declare let i18next: i18n;

/**
 * Used to keep track of Parts that need to be updated should the language change.
 */
export const registry = new Map<
  // eslint-disable-next-line no-use-before-define
  TranslateBase,
  { keys: string | Array<string>; options: Record<string, unknown> }
>();

let initialized = false;

/** Iterates all registered translate directives re-evaluating the translations */
const updateAll = () => {
  // eslint-disable-next-line no-use-before-define
  registry.forEach((details, part: TranslateBase) => {
    if (part.isConnected) {
      // eslint-disable-next-line no-use-before-define
      const translation = translateAndInit(details.keys, details.options);
      part.setValue(translation);
    }
  });
};

/**
 * Lazily sets up i18next. Incase this library is loaded before i18next has been loaded.
 * This defers i18next setup until the first translation is requested.
 */
function translateAndInit(
  keys: string | Array<string>,
  opts?: Record<string, unknown>,
): string | undefined {
  const i18n: i18n = i18next;

  if (!initialized) {
    /** Handle language changes */
    i18n.on("languageChanged", updateAll);
    i18n.store.on("added", updateAll);
    initialized = true;
  }

  return i18n.t(keys, opts);
}

/** */
abstract class TranslateBase extends AsyncDirective {
  value: string;
  part: PartInfo;

  constructor(part: PartInfo) {
    super(part);

    this.value = "";
    this.part = part;
  }

  /**
   * @param keys - translation key
   * @param options - i18next translation options
   * @returns translated string
   */
  translate(
    keys: string | Array<string>,
    options?: Record<string, unknown> | (() => Record<string, unknown>),
  ): string | symbol {
    const opts: Record<string, unknown> | undefined =
      typeof options === "function" ? options() : options;
    registry.set(this, { keys, options: opts ?? {} });

    const translation = translateAndInit(keys, opts);

    if (!this.isConnected || translation === undefined || this.value === translation) {
      return noChange;
    }

    return translation;
  }

  //update(_part: Part, props: Array<[]>): void {
  //  super.update(_part, props);
  //  // eslint-disable-next-line no-use-before-define
  //  if (!isConnected(_part)) {
  //    this.disconnected();
  //  }
  //}

  /** clean up the registry */
  disconnected() {
    registry.delete(this);
  }
}

/** */
class Translate extends TranslateBase {
  /**
   * @param keys - translation key
   * @param options - i18next translation options
   * @returns translated string
   */
  render(
    keys: string | Array<string>,
    options?: Record<string, unknown> | (() => Record<string, unknown>),
  ): string | symbol {
    return this.translate(keys, options);
  }
}

/** */
class TranslateWhen extends TranslateBase {
  /**
   * @param promise to wait for
   * @param keys - translation key
   * @param options - i18next translation options
   * @returns translated string
   */
  render(
    promise: Promise<unknown>,
    keys: string | Array<string>,
    options?: Record<string, unknown> | (() => Record<string, unknown>),
  ) {
    promise
      .then(() => {
        this.setValue(this.translate(keys, options));
      })
      .catch(console.error);
    return noChange;
  }
}

/**
 * The translate directive
 * @example
 * import { translate as t, i18next, html, render } from '@oliversalzburg/lit-i18n/lib/lit-i18n.js';
 * i18next.init({...i18next config...});
 * class MyElement extends HTMLElement {
 *     connectedCallback() {
 *         this.person = { name: 'Fred', age: 23, male: true };
 *         render(this.renderTemplate, this);
 *     }
 *     get renderTemplate() {
 *         return html`
 *             <span class="basic">${t('introduceself', { name: this.person.name })}</span>
 *             <div class="title" title="${t('divtitle')}">Div with translated title</div>
 *             <div class="title-interpolation" title="${t('whatishow', { what: 'i18next', how: 'great' })}"></div>
 *             <span class="person">${t('datamodel', { person: this.person })}</span>
 *             <input class="placeholder" type="text" placeholder="${t('entername')}" />
 *         `;
 *     }
 * }
 */
export const translate = directive(Translate);

/**
 * Can be used like translate but it also takes a Promise. This can be used if you can't guarantee if the i18next resource bundle is loaded.
 * @example
 * import { translateWhen } from '@oliversalzburg/lit-i18n/lib/lit-i18n.js';
 * const initializeI18next = i18next.use(someBackend).init(....);
 * const translateDirective = (keys, options) => translateWhen(initializeI18next, keys, options);
 * // Now you can use translateDirective in your lit-html templates.
 * html`<div>${translateDirective('some.key')}</div>`
 */
export const translateWhen = directive(TranslateWhen);
