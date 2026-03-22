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
  startSubspan,
} from '@bablr/helpers/grammar';
import { buildString } from '@bablr/helpers/builders';
import * as BSet from '@bablr/agast-helpers/b-set';
import { get, printSource } from '@bablr/agast-helpers/tree';
import { freeze } from '@bablr/agast-helpers/object';

export const escapables = freeze({
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  0: '\0',
  '\\': '\\',
  '/': '/',
});

const mixin = (Base) =>
  class ES3JSONGrammar extends Base {
    constructor() {
      super();
      this.emptyables = BSet.push(this.emptyables || BSet.create(), 'StringContent');
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
      yield startSpan('Bare', ']');
      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield eat(m`elements[]+$: <_ArrayElement />`);
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      yield endSpan();
      yield eat(m`closeToken*: <* ']' />`);
    }

    *ArrayElement() {
      yield eat(m`<_Element />`);
    }

    *Element() {
      yield startSubspan(null, ',');
      yield eat(m`<_Expression />`);
      yield endSpan();
    }

    *Object() {
      yield eat(m`openToken*: <* '{' />`);
      yield startSpan('Bare', '}');
      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield eat(m`properties[]+$: <_ObjectElement />`);
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      if (sep && sep !== true) yield fail();
      yield endSpan();
      yield eat(m`closeToken*: <* '}' />`);
    }

    *ObjectElement() {
      yield startSubspan(null, ',');
      yield eat(m`<Property />`);
      yield endSpan();
    }

    *ObjectKey() {
      if (yield eatMatch(m`<String /['"]/ />`)) {
      } else if (yield eatMatch(m`<*UnsignedInteger /\d/ />`)) {
      } else {
        yield eat(m`<Identifier />`, o({ scoped: false }));
      }
    }

    *Property() {
      yield eat(m`key$: <_ObjectKey />`);
      yield eat(m`mapOperator*: <* ':' />`);
      yield eat(m`value+$: <_Element />`);
    }

    *String() {
      let q = yield match(re`/['"]/`);

      if (!q) yield fail();

      const q_ = printSource(q);

      let span = q_ === "'" ? 'String:Single' : 'String:Double';
      yield startSpan(span, q_);
      yield q_ === "'" ? eat(m`openToken*: <* "'" />`) : eat(m`openToken*: <* '"' />`);
      yield eat(m`content$: <*StringContent />`);
      yield q_ === "'" ? eat(m`closeToken*: <* "'" />`) : eat(m`closeToken*: <* '"' />`);
      yield endSpan();
    }

    *StringContent({ s }) {
      let esc, lit;
      do {
        lit =
          s().span.name === 'String:Single'
            ? yield eatMatch(re`/[^\r\n\\']+/`)
            : yield eatMatch(re`/[^\r\n\\"]+/`);
        esc = yield eatMatch(m`@: <EscapeSequence '\\' />`);
      } while (esc || lit);
    }

    *EscapeSequence({ s }) {
      let { span } = s();

      if (!span.name.startsWith('String')) {
        yield fail();
      }

      yield startSpan('Escape');

      yield eat(m`escape*: <* '\\' />`);

      let _match;
      let cooked;

      if (
        (_match =
          span.name === 'String:Single'
            ? yield match(re`/[\\/bfnrt0']/`)
            : span.name === 'String:Double'
            ? yield match(re`/[\\/bfnrt0"]/`)
            : yield fail())
      ) {
        const match_ = printSource(_match);
        yield eat(m`code*: <*Keyword ${buildString(match_)} />`);
        cooked = escapables[match_] || match_;
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
      yield startSpan('Number');
      yield eat(m`wholePart$: <*UnsignedInteger />`, o({ noDoubleZero: true }));

      let fs = yield eatMatch(m`fractionalSeparatorToken*: <* '.' />`);

      if (fs) {
        yield eat(m`fractionalPart$: <*UnsignedInteger />`);
      } else {
        yield eat(m`fractionalPart$: null`);
      }

      let es = yield eatMatch(m`exponentSeparatorToken*: <* /[eE]/ />`);

      if (es) {
        yield eat(m`exponentPart$: <Integer />`, { matchSign: /[+-]/ });
      } else {
        yield eat(m`exponentPart$: null`);
      }
      yield endSpan();
    }
  };

export default mixin;
