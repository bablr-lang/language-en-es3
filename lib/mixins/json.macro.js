import { i } from '@bablr/boot';
import { Node, CoveredBy, UnboundAttributes, AllowEmpty } from '@bablr/helpers/decorators';
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
    @CoveredBy('Expression')
    @Node
    *Boolean() {
      yield i`eat(/true|false/)`;
    }

    @CoveredBy('Expression')
    @Node
    *Null() {
      yield i`eat('null')`;
    }

    @CoveredBy('Expression')
    @Node
    *Array() {
      yield i`eat(<*Punctuator '[' balanced=']' /> 'open')`;
      yield i`eat(<List /> 'elements[]' {
      element: <Expression />
      separator: <*Punctuator ',' />
      allowTrailingSeparator: false
    })`;
      yield i`eat(<*Punctuator ']' balancer /> 'close')`;
    }

    @CoveredBy('Expression')
    @Node
    *Object() {
      yield i`eat(<*Punctuator '{' balanced='}' /> 'open')`;
      yield i`eat(<List /> 'properties[]' {
      element: <Property />
      separator: <*Punctuator ',' />
      allowTrailingSeparator: false
    })`;
      yield i`eat(<*Punctuator '}' balancer /> 'close')`;
    }

    @Node
    *Property() {
      yield i`eat(<String /> 'key')`;
      yield i`eat(<*Punctuator ':' /> 'mapOperator')`;
      yield i`eat(<Expression /> 'value')`;
    }

    @CoveredBy('Language')
    @Node
    *String({ ctx }) {
      let q = yield i`match(/['"]/)`;

      if (!q) yield i`fail()`;

      const q_ = ctx.sourceTextFor(q);

      yield q_ === "'"
        ? i`eat(<*Punctuator "'" balanced="'" balancedSpan='String:Single' /> 'open')`
        : i`eat(<*Punctuator '"' balanced='"' balancedSpan='String:Double' /> 'open')`;

      yield i`eat(<*StringContent /> 'content')`;

      yield q_ === "'"
        ? i`eat(<*Punctuator "'" balancer /> 'close')`
        : i`eat(<*Punctuator '"' balancer /> 'close')`;
    }

    @AllowEmpty
    @Node
    *StringContent({ state: { span } }) {
      let esc, lit;
      do {
        esc = (yield i`match('\\')`) && (yield i`eat(<@EscapeSequence />)`);
        lit =
          span === 'String:Single'
            ? yield i`eatMatch(/[^\r\n\\']+/)`
            : yield i`eatMatch(/[^\r\n\\"]+/)`;
      } while (esc || lit);
    }

    @Node
    *EscapeSequence({ state: { span }, ctx }) {
      if (!span.startsWith('String')) {
        yield i`fail()`;
      }

      yield i`eat(<*Punctuator '\\' { openSpan: 'Escape' } /> 'escape')`;

      let match, cooked;

      if (
        (match =
          span === 'String:Single' ? yield i`match(/[\\/nrt0']/)` : yield i`match(/[\\/nrt0"]/)`)
      ) {
        const match_ = ctx.sourceTextFor(match);
        yield i`eat(<*Keyword ${buildString(match_)} { closeSpan: 'Escape' } /> 'value')`;
        cooked = escapables.get(match_) || match_;
      } else if (yield i`match('u')`) {
        const codeNode = yield i`eat(<EscapeCode { closeSpan: 'Escape' } /> 'value')`;
        cooked = parseInt(
          codeNode.properties.digits.map((digit) => ctx.sourceTextFor(digit)).join(''),
          16,
        );
      } else {
        yield i`fail()`;
      }

      yield i`bindAttribute(cooked ${buildString(cooked.toString(10))})`;
    }

    @Node
    *EscapeCode() {
      if (yield i`eatMatch(<*Keyword 'u' /> 'type')`) {
        if (yield i`eatMatch(<*Punctuator '{' /> 'open')`) {
          yield i`eat(<Digits /> 'digits[]')`;
          yield i`eat(<*Punctuator '}' /> 'close')`;
        } else {
          yield i`eat(<Digits /\d{4}/ /> 'digits[]')`;
          yield i`eat(null 'close')`;
        }
      }
    }
  };
