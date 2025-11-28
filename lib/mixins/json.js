import { re, spam as m } from '@bablr/boot';
import {
  eat,
  match,
  eatMatch,
  fail,
  o,
  defineAttribute,
  startSpan,
  endSpan,
} from '@bablr/helpers/grammar';
import { buildString } from '@bablr/helpers/builders';
import { List } from '@bablr/helpers/productions';
import { get, printSource } from '@bablr/agast-helpers/tree';

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

const mixin = (Base) =>
  class ES3JSONGrammar extends Base {
    constructor() {
      super();
      this.emptyables = new Set([...(this.emptyables || []), 'StringContent']);
    }

    *JSONExpression() {
      let res = yield match(re`/(?:true|false|null|Infinity|NaN)\b|[[{'"\d]/`);

      switch (printSource(res)) {
        case null:
          break;
        case 'true':
        case 'false':
          yield eat(m`<Boolean />`);
          break;
        case 'null':
          yield eat(m`<Null />`);
          break;
        case '[':
          yield eat(m`<Array />`);
          break;
        case '{':
          yield eat(m`<Object />`);
          break;
        case "'":
        case '"':
          yield eat(m`<String />`);
          break;
        case 'Infinity':
          yield eat(m`<Infinity />`);
          break;
        case 'NaN':
          yield eat(m`<NotANumber />`);
          break;
        default:
          yield eat(m`<Number /\d/ />`);
          break;
      }
    }

    *Boolean() {
      yield eat(m`sigilToken*: <*Keyword /true|false/ />`);
    }

    *Null() {
      yield eat(m`sigilToken*: <*Keyword 'null' />`);
    }

    *Array() {
      yield eat(m`openToken*: <* '[' />`);
      yield* List({
        element: [m`elements[]+$: <_Element />`],
        separator: m`#separatorTokens: <* ',' />`,
        allowTrailingSeparator: false,
      });
      yield eat(m`closeToken*: <* ']' />`);
    }

    *Element() {
      let { value } = yield eat(m`<_Expression />`, o({ power: 32 }), o({ shift: false }));
      return value;
    }

    *Object() {
      yield eat(m`openToken*: <* '{' />`);
      yield* List({
        element: m`properties[]$: <_ObjectElement />`,
        separator: m`#separatorTokens: <* ',' />`,
        allowTrailingSeparator: false,
      });
      yield eat(m`closeToken*: <* '}' />`);
    }

    *ObjectElement() {
      yield eat(m`<Property />`);
    }

    *ObjectKey() {
      if (yield eatMatch(m`<String /['"]/ />`)) {
      } else if (yield eatMatch(m`<UnsignedInteger /\d/ />`)) {
      } else {
        yield eat(m`<Identifier />`, o({ scoped: false }));
      }
    }

    *Property() {
      yield eat(m`key$: <_ObjectKey />`);
      yield eat(m`mapOperator*: <* ':' />`);
      yield eat(m`value+$: <_Expression />`, o({ power: 32 }));
    }

    *String() {
      let q = yield match(re`/['"]/`);

      if (!q) yield fail();

      const q_ = printSource(q);

      let span = q_ === "'" ? 'String:Single' : 'String:Double';
      yield q_ === "'" ? eat(m`openToken*: <* "'" />`) : eat(m`openToken*: <* '"' />`);
      yield startSpan(span, q_);
      yield eat(m`content$: <*StringContent />`);
      yield endSpan();
      yield q_ === "'" ? eat(m`closeToken*: <* "'" />`) : eat(m`closeToken*: <* '"' />`);
    }

    *StringContent({ s }) {
      let esc, lit;
      do {
        lit =
          s().span === 'String:Single'
            ? yield eatMatch(re`/[^\r\n\\']+/`)
            : yield eatMatch(re`/[^\r\n\\"]+/`);
        esc = yield eatMatch(m`@: <EscapeSequence '\\' />`);
      } while (esc || lit);
    }

    *EscapeSequence({ s }) {
      let { span } = s();

      if (!span.startsWith('String')) {
        yield fail();
      }

      yield startSpan('Escape');

      yield eat(m`escape*: <* '\\' />`);

      let _match;
      let cooked;

      if (
        (_match =
          span === 'String:Single'
            ? yield match(re`/[\\/bfnrt0']/`)
            : span === 'String:Single'
            ? yield match(re`/[\\/bfnrt0"]/`)
            : yield fail())
      ) {
        const match_ = printSource(_match);
        yield eat(m`code*: <*Keyword ${buildString(match_)} />`);
        cooked = escapables.get(match_) || match_;
      } else {
        let code = yield eat(m`code*: <EscapeCode />`);

        cooked = String.fromCodePoint(parseInt(printSource(get('value', code.node)), 16));
      }

      yield endSpan();

      yield defineAttribute('cooked', cooked);
    }

    *EscapeCode() {
      if (yield match('x')) {
        yield eatMatch(m`typeToken*: <*Keyword 'x' />`);
        yield eat(m`digits[]$: <Digits /\d{2}/ />`);
      } else if (yield match('u')) {
        yield eatMatch(m`typeToken*: <*Keyword 'u' />`);
        yield eat(m`digits[]$: <Digits /\d{4}/ />`);
      } else {
        yield fail();
      }
    }

    *Infinity() {
      yield eat(m`sigilToken*: <*Keyword 'Infinity' />`);
    }

    *NotANumber() {
      yield eat(m`sigilToken*: <*Keyword 'NaN' />`);
    }

    *UnsignedInteger({ props: { noDoubleZero = false } }) {
      let firstDigit = printSource(yield eat(re`/\d/`));

      if (!noDoubleZero || firstDigit.value !== '0') {
        yield eatMatch(re`/\d+/`);
      }
    }

    *Number() {
      yield eat(m`wholePart$: <*UnsignedInteger />`, o({ noDoubleZero: true }));

      let fs = yield eatMatch(m`fractionalSeparatorToken*: <* '.' />`, null, o({ bind: true }));

      if (fs) {
        yield eat(m`fractionalPart$: <*UnsignedInteger />`);
      } else {
        yield eat(m`fractionalPart$: null`);
      }

      let es = yield eatMatch(m`exponentSeparatorToken*: <* /[eE]/ />`, null, o({ bind: true }));

      if (es) {
        yield eat(m`exponentPart$: <Integer />`, { matchSign: /[+-]/ });
      } else {
        yield eat(m`exponentPart$: null`);
      }
    }
  };

export default mixin;
