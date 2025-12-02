import { re, spam as m } from '@bablr/boot';
import objectEntries from 'iter-tools-es/methods/object-entries';
import {
  r,
  eat,
  eatMatch,
  match,
  shiftMatch,
  guard,
  defineAttribute,
  fail,
} from '@bablr/helpers/grammar';
import { buildString } from '@bablr/helpers/builders';
import { get } from '@bablr/agast-helpers/path';
import { printSource } from '@bablr/agast-helpers/tree';

export const canonicalURL = 'https://bablr.org/languages/core/universe/es3-regex-pattern';

export const dependencies = {};

export const defaultMatcher = m`<Pattern />`;

const escapables = new Map(
  objectEntries({
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
  }),
);

const flagCharacters = {
  global: undefined,
  ignoreCase: 'i',
  multiline: 'm',
};

const unique = (flags) => flags.length === new Set(flags).size;

const getSpecialPattern = (span) => {
  if (span === 'Pattern') {
    return re`/[*+?{}[\]().^$|\n\\]/`;
  } else if (span === 'CharacterClass') {
    return re`/[\]\\]/`;
  } else {
    throw new Error('unknown span type for special pattern');
  }
};

export const grammar = class RegexGrammar {
  constructor() {
    this.literals = new Set(['Keyword', '']);
    this.emptyables = new Set(['Alternatives', 'Alternative', 'Elements', 'Flags']);
    this.attributes = new Map(
      Object.entries({
        Flags: {
          global: undefined,
          ignoreCase: undefined,
          multiline: undefined,
        },
        LookaheadGroup: {
          negate: undefined,
        },
        WordBoundaryAssertion: {
          negate: undefined,
        },
        CharacterClass: {
          negate: undefined,
        },
        DigitCharacterSet: {
          negate: undefined,
        },
        SpaceCharacterSet: {
          negate: undefined,
        },
        WordCharacterSet: {
          negate: undefined,
        },
        Quantifier: {
          min: undefined,
          max: undefined,
        },
      }),
    );
  }

  *Pattern() {
    yield eat(m`openToken*: <* '/' />`);
    yield eat(m`<__Alternatives />`);
    yield eat(m`closeToken*: <* '/' />`);
    yield eat(m`flags: <Flags />`);
  }

  *Flags() {
    const flags = yield match(re`/[gim]+/`);

    const flagsStr = printSource(flags) || '';

    if (flagsStr && !unique(flagsStr)) throw new Error('flags must be unique');

    for (const { 0: name, 1: chr } of Object.entries(flagCharacters)) {
      if (flagsStr.includes(chr)) {
        yield defineAttribute(name, true);
      } else {
        yield defineAttribute(name, false);
      }
    }

    for (const flagChr of flagsStr) {
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
    while (yield match(re`/[^|]/`)) {
      yield eat(m`${get('refMatcher', matcher)} <_Element />`);
    }
  }

  *Element() {
    yield guard(m`<*Keyword /[*+?]/ />`);

    if (yield eatMatch(m`<CharacterClass '[' />`)) {
    } else if (yield eatMatch(m`<Group '(?:' />`)) {
    } else if (yield eatMatch(m`<CapturingGroup '(' />`)) {
    } else if (yield eatMatch(m`<__Assertion /[$^]|\\b/i />`)) {
    } else if (yield eatMatch(m`<CharacterSet /\.|\\[dswp]/i />`)) {
    } else {
      yield eat(m`<Character />`);
    }

    return r(shiftMatch(m`<Quantifier /[*+?{]/ />`));
  }

  *Group() {
    yield eat(m`openToken*: <* '(?:' />`);
    yield eat(m`<__Alternatives />`);
    yield eat(m`closeToken*: <* ')' />`);
  }

  *CapturingGroup() {
    yield eat(m`openToken*: <* '(' />`);
    yield eat(m`<__Alternatives />`);
    yield eat(m`closeToken*: <* ')' />`);
  }

  *LookaheadGroup() {
    yield eat(m`openToken*: <* '(?' />`);
    yield eat(m`negateToken*: <* /[!=]/ />`);
    yield eat(m`<__Alternatives />`);
    yield eat(m`closeToken*: <* ')' />`);
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
    if (yield match('\\')) {
      yield eat(m`@: <EscapeSequence />`);
    } else {
      yield eat(re`/[^\r\n\t]/`);
    }
  }

  *CharacterClass() {
    yield eat(m`openToken*: <* '[' { balancedSpan: 'CharacterClass' } />`);

    let negate = yield eatMatch(m`negateToken*: <*Keyword '^' />`);

    yield defineAttribute('negate', !!negate);

    while (yield match(re`/./s`)) {
      yield eat(m`elements[]+$: <CharacterClassElement />`);
    }

    yield eat(m`closeToken*: <* ']' />`);
  }

  *CharacterClassElement() {
    if (yield eatMatch(m`<CharacterSet /\\[dswp]/i />`)) {
    } else if (yield eatMatch(m`<Gap '\\g' />`)) {
    } else {
      yield eat(m`<*Character />`);
    }

    return r(shiftMatch(m`<CharacterClassRange '-' />`));
  }

  *CharacterClassRange() {
    yield eat(m`min+$: <*Character />`);
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
    yield eat(m`element+$: <_Element />`);

    let attrs, sigil;

    if ((sigil = yield eatMatch(m`sigilToken*: <*Keyword /[*+?]/ />`))) {
      switch (printSource(sigil)) {
        case '*':
          attrs = { min: 0, max: Infinity };
          break;
        case '+':
          attrs = { min: 1, max: Infinity };
          break;
        case '?':
          attrs = { min: 0, max: 1 };
          break;
      }
    } else if (yield eat(m`openToken*: <* '{' />`)) {
      let max;
      let min = yield eat(m`min$: <*UnsignedInteger />`);

      if (yield eatMatch(m`separatorToken*: <* ',' />`)) {
        max = yield eatMatch(m`max$: <*UnsignedInteger />`);
      }

      min = min && printSource(min);
      max = max && printSource(max);

      min = min && parseInt(min, 10);
      max = max && parseInt(max, 10);

      attrs = { min, max };

      yield eat(m`closeToken*: <* '}' />`);
    }

    yield defineAttribute('min', attrs.min);
    yield defineAttribute('max', attrs.max);
  }

  *UnsignedInteger() {
    yield eat(re`/\d+/`);
  }

  *EscapeSequence({ state }) {
    const parentSpan = state.span;

    yield eat(m`escape*: <* '\\' { openSpan: 'Escape' } />`);

    let m_;

    let cooked;

    if ((m_ = yield match(re`/[\\/fnrtv]/`))) {
      const match_ = printSource(m_);
      yield eat(m`code*: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
      cooked = escapables.get(match_);
    } else if ((m_ = yield match(getSpecialPattern(parentSpan)))) {
      const match_ = printSource(m_);
      yield eat(m`code*: <*Keyword ${buildString(match_)} { closeSpan: 'Escape' } />`);
      cooked = match_;
    } else if (yield match('x')) {
      let code = yield eat(m`code*: <EscapeCode { closeSpan: 'Escape' } />`);

      cooked = String.fromCodePoint(parseInt(printSource(get('value', code.node)), 16));
    } else {
      yield fail();
    }

    yield defineAttribute('cooked', cooked);
  }

  *EscapeCode() {
    if (yield eatMatch(m`type*: <*Keyword 'x' />`)) {
      yield eat(m`value$: <*UnsignedInteger /\d{2}/ />`);
    }
  }

  *Digits() {
    while (yield eatMatch(m`<*Digit />`));
  }

  *Digit() {
    yield eat(re`/\d/`);
  }
};

export default { canonicalURL, dependencies, grammar, defaultMatcher };
