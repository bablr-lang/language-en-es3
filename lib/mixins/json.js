import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o, defineAttribute } from '@bablr/helpers/grammar';
import { buildString } from '@bablr/helpers/builders';

export const escapables = new Map(
  Object.entries({
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    0: '\0',
    '\\': '\\',
    '/': '/',
  }),
);

export const mixin = (Base) =>
  class ES3JSONGrammar extends Base {
    constructor() {
      super();
      this.emptyables = new Set([...(this.emptyables || []), 'StringContent']);
    }

    *JSONExpression() {
      if (yield eatMatch(m`<Boolean /true|false/ />`)) {
      } else if (yield eatMatch(m`<Null 'null' />`)) {
      } else if (yield eatMatch(m`<Array '[' />`)) {
      } else if (yield eatMatch(m`<Object '{' />`)) {
      } else if (yield eatMatch(m`<String /['"]/ />`)) {
      } else if (yield eatMatch(m`<Number /\d/ />`)) {
      } else if (yield eatMatch(m`<Infinity 'Infinity' />`)) {
      } else {
        yield eat(m`<NotANumber 'NaN' />`);
      }
    }

    *Boolean() {
      yield eat(m`sigilToken: <*Keyword /true|false/ />`);
    }

    *Null() {
      yield eat(m`sigilToken: <*Keyword 'null' />`);
    }

    *Array() {
      yield eat(m`open: <*Punctuator '[' { balanced: ']' } />`);
      yield eat(
        m`elements[]+$: <__List />`,
        o({
          element: m`<_Expression />`,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
          allowTrailingSeparator: false,
        }),
      );
      yield eat(m`close: <*Punctuator ']' { balancer: true } />`);
    }

    *Object() {
      yield eat(m`open: <*Punctuator '{' { balanced: '}' } />`);
      yield eat(
        m`properties[]$: <__List />`,
        o({
          element: m`<Property />`,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
          allowTrailingSeparator: false,
        }),
      );
      yield eat(m`close: <*Punctuator '}' { balancer: true } />`);
    }

    *Property() {
      if (yield match(re`/['"]/`)) {
        yield eat(m`key$: <String />`);
      } else {
        yield eat(m`key$: <Identifier />`, o({ scoped: false }));
      }
      yield eat(m`mapOperator: <*Punctuator ':' />`);
      yield eat(m`value+$: <_Expression />`, o({ power: 32 }));
    }

    *String({ ctx }) {
      let q = yield match(re`/['"]/`);

      if (!q) yield fail();

      const q_ = ctx.sourceTextFor(q);

      yield q_ === "'"
        ? eat(m`open: <*Punctuator "'" { balanced: "'", balancedSpan: 'String:Single' } />`)
        : eat(m`open: <*Punctuator '"' { balanced: '"', balancedSpan: 'String:Double' } />`);

      yield eat(m`content: <*StringContent />`);

      yield q_ === "'"
        ? eat(m`close: <*Punctuator "'" { balancer: true } />`)
        : eat(m`close: <*Punctuator '"' { balancer: true } />`);
    }

    *StringContent({ state: { span } }) {
      let esc, lit;
      do {
        esc = (yield match('\\')) && (yield eat(m`@: <EscapeSequence />`));
        lit =
          span === 'String:Single'
            ? yield eatMatch(re`/[^\r\n\\']+/`)
            : yield eatMatch(re`/[^\r\n\\"]+/`);
      } while (esc || lit);
    }

    *EscapeSequence({ state: { span }, ctx }) {
      if (!span.startsWith('String')) {
        yield fail();
      }

      yield eat(m`escape: <*Punctuator '\\' { openSpan: 'Escape' } />`);

      let _match;
      let cooked;

      if (
        (_match =
          span === 'String:Single' ? yield match(re`/[\\/nrt0']/`) : yield match(re`/[\\/nrt0"]/`))
      ) {
        const match_ = ctx.sourceTextFor(_match);
        yield eat(m`code: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
        cooked = escapables.get(match_) || match_;
      } else {
        let code = yield eat(m`code: <EscapeCode { closeSpan: 'Escape' } />`);

        cooked = String.fromCodePoint(parseInt(ctx.sourceTextFor(code.get('value')), 16));
      }

      yield defineAttribute('cooked', cooked);
    }

    *EscapeCode() {
      if (yield match('x')) {
        yield eatMatch(m`typeToken: <*Keyword 'x' />`);
        yield eat(m`digits[]: <Digits /\d{2}/ />`);
        yield eat(m`close: null`);
      } else if (yield match('u')) {
        yield eatMatch(m`typeToken: <*Keyword 'u' />`);
        yield eat(m`digits[]: <Digits /\d{4}/ />`);
        yield eat(m`close: null`);
      } else {
        yield fail();
      }
    }

    *Infinity() {
      yield eat(m`sigilToken: <*Keyword 'Infinity' />`);
    }

    *NotANumber() {
      yield eat(m`sigilToken: <*Keyword 'NaN' />`);
    }

    *UnsignedInteger({ props: { noDoubleZero = false }, ctx }) {
      let firstDigit = ctx.sourceTextFor(yield eat(re`/\d/`));

      if (!noDoubleZero || firstDigit.value !== '0') {
        yield eatMatch(re`/\d+/`);
      }
    }

    *Number() {
      yield eat(m`wholePart$: <*UnsignedInteger />`, o({ noDoubleZero: true }));

      let fs = yield eatMatch(
        m`fractionalSeparatorToken: <*Punctuator '.' />`,
        null,
        o({ bind: true }),
      );

      if (fs) {
        yield eat(m`fractionalPart$: <*UnsignedInteger />`);
      } else {
        yield eat(m`fractionalPart$: null`);
      }

      let es = yield eatMatch(
        m`exponentSeparatorToken: <*Punctuator /[eE]/ />`,
        null,
        o({ bind: true }),
      );

      if (es) {
        yield eat(m`exponentPart$: <Integer />`, { matchSign: /[+-]/ });
      } else {
        yield eat(m`exponentPart$: null`);
      }
    }
  };
