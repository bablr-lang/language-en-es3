import {
  m,
  o,
  r,
  eat,
  eatMatch,
  match,
  shiftMatch,
  guard,
  defineAttribute,
  fail,
  startSpan,
  endSpan,
} from '@bablr/helpers/grammar';
import {
  buildCharacterClass,
  buildLiteralElements,
  buildQuantifier,
  buildString,
} from '@bablr/helpers/builders';
import { get } from '@bablr/agast-helpers/path';
import { printSource } from '@bablr/agast-helpers/tree';
import * as BSet from '@bablr/agast-helpers/b-set';
import * as BMap from '@bablr/agast-helpers/b-map';
import { freeze } from '@bablr/agast-helpers/object';
import { mapObject } from '@bablr/helpers/object';

const escapables = Object.freeze({
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
});

const flagCharacters = freeze({
  global: 'g',
  ignoreCase: 'i',
  multiline: 'm',
});

const unique = (flags) => flags.length === new Set(flags).size;

const getSpecialPattern = (span) => {
  if (span.name === 'Pattern') {
    return m`/[*+?{}[\]().^$|\n\\]/`;
  } else if (span.name === 'CharacterClass') {
    return m`/[\]\\]/`;
  } else {
    throw new Error('unknown span type for special pattern');
  }
};

let flagPatternCache = new WeakMap();

let { entry } = BMap;

export default class Regex {
  static canonicalURL = 'https://bablr.org/languages/core/universe/en/es3-regex-pattern';
  static dependencies = freeze({});
  static defaultMatcher = m`<Pattern />`;
  static fragmentProduction = null;
  static context = freeze({ flagCharacters });

  constructor() {
    let { flagCharacters } = this.constructor.context;

    this.literals = BSet.from('Keyword', 'Gap');
    this.emptyables = BSet.from('Alternatives', 'Alternative', 'Elements', 'Flags');
    this.attributes = BMap.from(
      entry('FlatPattern', { groups: undefined, flags: undefined }),
      entry(
        'Flags',
        mapObject(() => undefined, flagCharacters),
      ),
      entry('LookaroundGroup', { negate: undefined, direction: undefined }),
      entry('WordBoundaryAssertion', { negate: undefined }),
      entry('CharacterClass', { negate: undefined }),
      entry('DigitCharacterSet', { negate: undefined }),
      entry('SpaceCharacterSet', { negate: undefined }),
      entry('WordCharacterSet', { negate: undefined }),
      entry('Quantifier', { min: undefined, max: undefined }),
    );
  }

  *Pattern() {
    yield startSpan('Pattern');
    let flatMatch = yield guard(m`<*FlatPattern />`);
    yield endSpan();

    let props = flatMatch.node.value.attributes;

    yield eat(m`openToken*: <* '/' />`);
    yield startSpan('Pattern', '/', props);
    yield eat(m`<__Alternatives />`);
    yield endSpan();
    yield eat(m`closeToken*: <* '/' />`);
    yield eat(m`flags: <Flags />`);
  }

  *FlatPattern() {
    let seg;
    let groups = 0;
    let escape = false;
    let charClass = false;

    yield eat('/');

    outer: while ((seg = yield eat(m`/\/|[[\](\\]|[\w\d*+|^{}\u0060)$-]+/`))) {
      switch (printSource(seg)) {
        case '(':
          if (!escape && !charClass) groups++;
          break;
        case '[':
          if (!escape) charClass = true;
          break;
        case ']':
          if (!escape) charClass = false;
          break;
        case '/':
          if (!charClass && !escape) {
            break outer;
          }
          break;
        case '\\':
          if (!escape) escape = true;
          break;
        default:
          escape = false;
          break;
      }
    }

    yield defineAttribute('groups', groups);

    let flags = yield eat(m`/[a-zA-Z]*/`);
    yield defineAttribute('flags', printSource(flags));
  }

  *Flags() {
    let { flagCharacters } = this.constructor.context;

    let flagsPattern = flagPatternCache.get(flagCharacters);

    flagsPattern ||= m`/${buildQuantifier(
      '+',
      buildCharacterClass(buildLiteralElements(Object.values(flagCharacters).join(''))),
    )}/`;
    flagPatternCache.set(flagCharacters, flagsPattern);

    let flags = yield match(flagsPattern);

    let flagsStr = printSource(flags) || '';

    if (flagsStr && !unique(flagsStr)) throw new Error('flags must be unique');

    for (let { 0: name, 1: chr } of Object.entries(flagCharacters)) {
      if (flagsStr.includes(chr)) {
        yield defineAttribute(name, true);
      } else {
        yield defineAttribute(name, false);
      }
    }

    for (let flagChr of flagsStr) {
      yield eat(m`tokens[]*: <*Keyword ${buildString(flagChr)} />`);
    }
  }

  *Alternatives() {
    do {
      yield eat(m`alternatives[]$: <Alternative />`);
    } while (yield eatMatch(m`#separatorTokens: <* '|' />`));
  }

  *Alternative() {
    yield eat(m`elements[]+$: <__Elements />`);
  }

  *Elements({ matcher }) {
    while (yield match(m`/[^|]/`)) {
      yield eat(m`${get('refMatcher', matcher)} <_Element />`);
    }
  }

  *Element({ s }) {
    if (yield eatMatch(m`<CharacterClass '[' />`)) {
    } else if (yield eatMatch(m`<Group /\((?:\?:)?/ />`)) {
    } else if (yield eatMatch(m`<LookaroundGroup /\(\?\<?[=!]/ />`)) {
    } else if (yield eatMatch(m`<CapturingGroup '(' />`)) {
    } else if (yield eatMatch(m`<_Assertion /[$^]|\\b/i />`)) {
    } else if (yield eatMatch(m`<Gap '\\g' />`)) {
    } else if (yield eatMatch(m`<_CharacterSet /\.|\\[dswp]/i />`)) {
    } else {
      if (!(yield match(m`'\\'`))) {
        yield guard(getSpecialPattern(s().span));
      }
      yield eat(m`<*Character />`);
    }

    return r(shiftMatch(m`<Quantifier /[*+?{]/ />`));
  }

  *Group() {
    yield eat(m`openToken*: <* '(?:' />`);
    yield startSpan('Pattern', ')');
    yield eat(m`<__Alternatives />`);
    yield endSpan();
    yield eat(m`closeToken*: <* ')' />`);
  }

  *CapturingGroup() {
    yield eat(m`openToken*: <* '(' />`);
    yield startSpan('Pattern', ')');
    yield eat(m`<__Alternatives />`);
    yield endSpan();
    yield eat(m`closeToken*: <* ')' />`);
  }

  *LookaroundGroup() {
    yield eat(m`openToken*: <* '(?' />`);
    let back = yield eatMatch(m`behindToken*: <* '<' />`);
    let t = yield eat(m`sigilToken*: <* /[!=]/ />`);
    yield eat(m`<__Alternatives />`);
    yield eat(m`closeToken*: <* ')' />`);
    yield defineAttribute('negate', printSource(t.node) === '!');
    yield defineAttribute('direction', back ? 'behind' : 'ahead');
  }

  *Assertion() {
    if (yield eatMatch(m`<StartOfInputAssertion '^' />`)) {
    } else if (yield eatMatch(m`<EndOfInputAssertion '$' />`)) {
    } else {
      yield eat(m`<WordBoundaryAssertion /\\b/i />`);
    }
  }

  *StartOfInputAssertion() {
    yield eat(m`sigilToken*: <*Keyword '^' />`);
  }

  *EndOfInputAssertion() {
    yield eatMatch(m`sigilToken*: <*Keyword '$' />`);
  }

  *WordBoundaryAssertion() {
    yield eatMatch(m`escapeToken: <* '\\' />`);
    const m_ = yield eat(m`value*: <*Keyword /b/i />`);
    yield defineAttribute('negate', printSource(m_) === 'B');
  }

  *Character() {
    yield eat(m`value*: <*Literal />`);
  }

  *Literal() {
    if (yield match(m`'\\'`)) {
      yield eat(m`@: <EscapeSequence />`);
    } else {
      yield eat(m`/[^\r\n\t]/`);
    }
  }

  *CharacterClass() {
    yield eat(m`openToken*: <* '[' { balancedSpan: 'CharacterClass' } />`);

    yield startSpan('CharacterClass', ']');

    let negate = yield eatMatch(m`negateToken*: <*Keyword '^' />`);

    yield defineAttribute('negate', !!negate);

    while (yield match(m`/./s`)) {
      yield eat(m`elements[]+$: <CharacterClassElement />`);
    }

    yield endSpan();

    yield eat(m`closeToken*: <* ']' />`);
  }

  *CharacterClassElement() {
    if (yield eatMatch(m`<CharacterSet /\\[dswp]/i />`)) {
    } else if (yield eatMatch(m`<Gap '\\g' />`)) {
    } else {
      yield eat(m`<*Character />`);
    }

    if (yield match(m`'-'`)) {
      return r(shiftMatch(m`<CharacterClassRange />`));
    }
  }

  *CharacterClassRange() {
    yield eat(m`min+$: <*Character />`, o({}), o({ held: 'eat' }));
    yield eat(m`sigilToken*: <* '-' />`);
    yield eat(m`max+$: <*Character />`);
  }

  *CharacterSet() {
    if (yield eatMatch(m`<AnyCharacterSet '.' />`)) {
    } else if (yield eatMatch(m`<DigitCharacterSet /\\[dD]/  />`)) {
    } else if (yield eatMatch(m`<SpaceCharacterSet /\\[sS]/  />`)) {
    } else {
      yield eat(m`<WordCharacterSet /\\[wW]/  />`);
    }
  }

  *AnyCharacterSet() {
    yield eat(m`sigilToken*: <*Keyword '.' />`);
  }

  *DigitCharacterSet() {
    yield eat(m`escapeToken*: <* '\\' />`);

    let code = yield eat(m`value*: <*Keyword /[dD]/ />`);

    yield defineAttribute('negate', printSource(code.node) === 'D');
  }

  *SpaceCharacterSet() {
    yield eat(m`escapeToken*: <* '\\' />`);

    let code = yield eat(m`value*: <*Keyword /[sS]/ />`);

    yield defineAttribute('negate', printSource(code.node) === 'S');
  }

  *WordCharacterSet() {
    yield eat(m`escapeToken*: <* '\\' />`);

    let code = yield eat(m`value*: <*Keyword /[wW]/ />`);

    yield defineAttribute('negate', printSource(code.node) === 'W');
  }

  *Quantifier() {
    yield eat(m`element+$: <_Element />`, o({}), o({ held: 'eat' }));

    let sigil;
    if ((sigil = yield eatMatch(m`sigilToken*: <*Keyword /[*+?]/ />`))) {
      switch (printSource(sigil.node)) {
        case '*':
          break;
        case '+':
          break;
        case '?':
          break;
      }
    } else if (yield eat(m`openToken*: <* '{' />`)) {
      yield eatMatch(m`min$: <*UnsignedInteger />`);
      if (yield eatMatch(m`separatorToken*: <* ',' />`)) {
        yield eatMatch(m`max$: <*UnsignedInteger />`);
      }

      yield eat(m`closeToken*: <* '}' />`);
    }
  }

  *UnsignedInteger() {
    yield eat(m`/\d+/`);
  }

  *UnsignedHexInteger() {
    yield eatMatch(m`/[\da-fA-F]+/`);
  }

  *EscapeSequence({ ctx, s }) {
    const parentSpan = s().span;

    yield eat(m`sigilToken*: <* '\\' { openSpan: 'Escape' } />`);

    let m_;

    let cooked;
    let res;

    if ((m_ = yield match(m`/[\\/fnrtv]/`))) {
      const match_ = printSource(m_);
      yield eat(m`code*: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
      cooked = escapables[match_] || match_;
    } else if ((m_ = yield match(getSpecialPattern(parentSpan)))) {
      const match_ = printSource(m_);
      yield eat(m`code*: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
      cooked = match_;
    } else if (yield match(m`/[ux]/`)) {
      let code = yield eatMatch(m`code*: <EscapeCode { closeSpan: 'Escape' } />`);

      cooked =
        code &&
        String.fromCodePoint(parseInt(printSource(ctx.getGapNode(get('value', code.node))), 16));
    }

    if (!cooked && (res = yield match(m`/\D/`))) {
      cooked = printSource(res);
    }

    yield defineAttribute('cooked', cooked);
  }

  *EscapeCode({ s }) {
    let { span } = s();
    if (span.type !== 'Pattern') yield fail();

    if (yield match(m`'x'`)) {
      yield eatMatch(m`typeToken*: <*Keyword 'x' />`);
      yield eat(m`value: <*UnsignedHexInteger /[\da-fA-F]{2}/ />`);
    } else if (yield match(m`'u'`)) {
      yield eatMatch(m`typeToken*: <*Keyword 'u' />`);
      yield eat(m`value: <*UnsignedHexInteger /[\da-fA-F]{4}/ />`);
    } else {
      yield fail();
    }
  }
}

freeze(Regex);
freeze(Regex.prototype);
