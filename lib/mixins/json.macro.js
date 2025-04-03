import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o } from '@bablr/helpers/grammar';
import { Node, CoveredBy, AllowEmpty } from '@bablr/helpers/decorators';
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

export const getCooked = (escapeNode, span, ctx) => {
  let cooked;
  const codeNode = escapeNode.get('code');
  const type = ctx.sourceTextFor(codeNode.get('typeToken'));
  const value = ctx.sourceTextFor(codeNode.get('value'));

  if (!span.startsWith('String:')) throw new Error();

  if (!type) {
    const match_ = ctx.sourceTextFor(codeNode);

    cooked = escapables.get(match_) || match_;
  } else if ('ux'.includes(type)) {
    cooked = parseInt(value, 16);
  } else {
    throw new Error();
  }

  return cooked.toString(10);
};

export const mixin = (Base) =>
  class ES3JSONGrammar extends Base {
    *JSONExpression() {
      yield eat(m`<_Any />`, [
        m`<Boolean /true|false/ />`,
        m`<Null 'null' />`,
        m`<Array '[' />`,
        m`<Object '{' />`,
        m`<String /['"]/ />`,
        m`<Number /\d/ />`,
        m`<Infinity 'Infinity' />`,
        m`<NotANumber 'NaN' />`,
      ]);
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *Boolean() {
      yield eat(m`sigilToken: <*Keyword /true|false/ />`);
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *Null() {
      yield eat(m`sigilToken: <*Keyword 'null' />`);
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *Array() {
      yield eat(m`open: <*Punctuator '[' { balanced: ']' } />`);
      yield eat(
        m`elements[]+$: <_List />`,
        o({
          element: m`<__Expression />`,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
          allowTrailingSeparator: false,
        }),
      );
      yield eat(m`close: <*Punctuator ']' { balancer: true } />`);
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *Object() {
      yield eat(m`open: <*Punctuator '{' { balanced: '}' } />`);
      yield eat(
        m`properties[]$: <_List />`,
        o({
          element: m`<Property />`,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
          allowTrailingSeparator: false,
        }),
      );
      yield eat(m`close: <*Punctuator '}' { balancer: true } />`);
    }

    @Node
    *Property() {
      yield eat(m`key$: <Identifier />`);
      yield eat(m`mapOperator: <*Punctuator ':' />`);
      yield eat(m`value+$: <__Expression />`, o({ power: 16 }));
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
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

    @AllowEmpty
    @Node
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

    @Node
    *EscapeSequence({ state: { span }, ctx }) {
      if (!span.startsWith('String')) {
        yield fail();
      }

      yield eat(m`escape: <*Punctuator '\\' { openSpan: 'Escape' } />`);

      let match;

      if (
        (match =
          span === 'String:Single' ? yield match(re`/[\\/nrt0']/`) : yield match(re`/[\\/nrt0"]/`))
      ) {
        const match_ = ctx.sourceTextFor(match);
        yield eat(m`code: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
      } else {
        yield eat(m`code: <EscapeCode { closeSpan: 'Escape' } />`);
      }
    }

    @Node
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

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *Infinity() {
      yield eat(m`sigilToken: <*Keyword 'Infinity' />`);
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
    *NotANumber() {
      yield eat(m`sigilToken: <*Keyword 'NaN' />`);
    }

    @Node
    *UnsignedInteger({ props: { noDoubleZero = false }, ctx }) {
      let firstDigit = ctx.sourceTextFor(yield eat(re`/\d/`));

      if (!noDoubleZero || firstDigit.value !== '0') {
        yield eatMatch(re`/\d+/`);
      }
    }

    @CoveredBy('JSONExpression')
    @CoveredBy('Expression')
    @Node
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
