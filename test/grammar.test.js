import { spam } from '@bablr/boot';
import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import * as language from '@bablr/language-en-es3';
import { buildTag, Context } from 'bablr';
import { debugEnhancers } from '@bablr/helpers/enhancers';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/helpers/tree';
import { buildIdentifier, buildString } from '@bablr/helpers/builders';

let enhancers = undefined;

const ctx = Context.from(language, enhancers?.bablrProduction);

const buildJSTag = (matcher) => {
  return buildTag(ctx, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printPrettyCSTML(tree, { ctx });
};

describe('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag(spam`<$${buildString(language.canonicalURL)}:Program />`);

    it('js`;`', () => {
      expect(print(js`;`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$EmptyStatement>
              endToken: <*Punctuator ';' />
            </>
          </>
        </>\n`);
    });

    it('js`true`', () => {
      expect(print(js`true`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Boolean>
                sigilToken: <*Keyword 'true' />
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`1+2`', () => {
      expect(print(js`1+2`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Number>
                wholePart$: <*UnsignedInteger '1' />
                fractionalSeparatorToken: null
                fractionalPart$: null
                exponentSeparatorToken: null
                exponentPart$: null
              </>
              ^^^
              <$BinaryExpression { power: 14 }>
                left+$: <//>
                sigilToken: <*Punctuator '+' />
                right+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '2' />
                  fractionalSeparatorToken: null
                  fractionalPart$: null
                  exponentSeparatorToken: null
                  exponentPart$: null
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`1*2+3`', () => {
      expect(print(js`1*2+3`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Number>
                wholePart$: <*UnsignedInteger '1' />
                fractionalSeparatorToken: null
                fractionalPart$: null
                exponentSeparatorToken: null
                exponentPart$: null
              </>
              ^^^
              <$BinaryExpression { power: 12 }>
                left+$: <//>
                sigilToken: <*Punctuator '*' />
                right+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '2' />
                  fractionalSeparatorToken: null
                  fractionalPart$: null
                  exponentSeparatorToken: null
                  exponentPart$: null
                </>
              </>
              ^^^
              <$BinaryExpression { power: 14 }>
                left+$: <//>
                sigilToken: <*Punctuator '+' />
                right+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '3' />
                  fractionalSeparatorToken: null
                  fractionalPart$: null
                  exponentSeparatorToken: null
                  exponentPart$: null
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`1+2*3`', () => {
      expect(print(js`1+2*3`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Number>
                wholePart$: <*UnsignedInteger '1' />
                fractionalSeparatorToken: null
                fractionalPart$: null
                exponentSeparatorToken: null
                exponentPart$: null
              </>
              ^^^
              <$BinaryExpression { power: 14 }>
                left+$: <//>
                sigilToken: <*Punctuator '+' />
                right+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '2' />
                  fractionalSeparatorToken: null
                  fractionalPart$: null
                  exponentSeparatorToken: null
                  exponentPart$: null
                </>
                ^^^
                <$BinaryExpression { power: 12 }>
                  left+$: <//>
                  sigilToken: <*Punctuator '*' />
                  right+$:
                  <$Number>
                    wholePart$: <*UnsignedInteger '3' />
                    fractionalSeparatorToken: null
                    fractionalPart$: null
                    exponentSeparatorToken: null
                    exponentPart$: null
                  </>
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`foo.bar`', () => {
      expect(print(js`foo.bar`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'foo' />
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+$: <//>
                sigilToken: <*Punctuator '.' />
                property+$:
                <$Identifier>
                  value: <*Literal 'bar' />
                </>
                matchingSigilToken: null
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`typeof baz`', () => {
      expect(print(js`typeof baz`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$UnaryExpression { power: 10, position: 'prefix' }>
                sigilToken: <*Punctuator 'typeof' />
                #: <*Space:Space ' ' />
                argument+$:
                <$Identifier>
                  value: <*Literal 'baz' />
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`o = { foo: null, bar: NaN, baz: undefined }`', () => {
      expect(print(js`o = { foo: null, bar: NaN, baz: undefined }`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'o' />
              </>
              ^^^
              <$AssignmentExpression { power: 32 }>
                left+$: <//>
                #: <*Space:Space ' ' />
                sigilToken: <*Punctuator '=' />
                #: <*Space:Space ' ' />
                right+$:
                <$Object>
                  open: <*Punctuator '{' { balanced: '}' } />
                  separatorTokens[]: []
                  properties[]$: []
                  #: <*Space:Space ' ' />
                  properties[]$:
                  <$Property>
                    key$:
                    <$Identifier>
                      value: <*Literal 'foo' />
                    </>
                    mapOperator: <*Punctuator ':' />
                    #: <*Space:Space ' ' />
                    value+$:
                    <$Null>
                      sigilToken: <*Keyword 'null' />
                    </>
                  </>
                  separatorTokens[]: <*Punctuator ',' />
                  #: <*Space:Space ' ' />
                  properties[]$:
                  <$Property>
                    key$:
                    <$Identifier>
                      value: <*Literal 'bar' />
                    </>
                    mapOperator: <*Punctuator ':' />
                    #: <*Space:Space ' ' />
                    value+$:
                    <$NotANumber>
                      sigilToken: <*Keyword 'NaN' />
                    </>
                  </>
                  separatorTokens[]: <*Punctuator ',' />
                  #: <*Space:Space ' ' />
                  properties[]$:
                  <$Property>
                    key$:
                    <$Identifier>
                      value: <*Literal 'baz' />
                    </>
                    mapOperator: <*Punctuator ':' />
                    #: <*Space:Space ' ' />
                    value+$:
                    <$Identifier>
                      value: <*Literal 'undefined' />
                    </>
                  </>
                  #: <*Space:Space ' ' />
                  close: <*Punctuator '}' { balancer: true } />
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`a ? b : c;`', () => {
      expect(print(js`a ? b : c;`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'a' />
              </>
              ^^^
              <$TernaryExpression { power: 32 }>
                test+$: <//>
                #: <*Space:Space ' ' />
                consequentSigilToken: <*Punctuator '?' />
                #: <*Space:Space ' ' />
                consequent+$:
                <$Identifier>
                  value: <*Literal 'b' />
                </>
                #: <*Space:Space ' ' />
                alternateSigilToken: <*Punctuator ':' />
                #: <*Space:Space ' ' />
                alternate+$:
                <$Identifier>
                  value: <*Literal 'c' />
                </>
              </>
              endToken: <*Punctuator ';' />
            </>
          </>
        </>\n`);
    });

    it('js`a[b]`', () => {
      expect(print(js`a[b]`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'a' />
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+$: <//>
                sigilToken: <*Punctuator '[' { balanced: ']' } />
                property+$:
                <$Identifier>
                  value: <*Literal 'b' />
                </>
                matchingSigilToken: <*Punctuator ']' { balancer: true } />
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`foo.bar = false`', () => {
      expect(print(js`foo.bar = false`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'foo' />
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+$: <//>
                sigilToken: <*Punctuator '.' />
                property+$:
                <$Identifier>
                  value: <*Literal 'bar' />
                </>
                matchingSigilToken: null
              </>
              ^^^
              <$AssignmentExpression { power: 32 }>
                left+$: <//>
                #: <*Space:Space ' ' />
                sigilToken: <*Punctuator '=' />
                #: <*Space:Space ' ' />
                right+$:
                <$Boolean>
                  sigilToken: <*Keyword 'false' />
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`new a.b().c`', () => {
      expect(print(js`new a.b().c`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$NewExpression { power: 2 }>
                sigilToken: <*Keyword 'new' />
                #: <*Space:Space ' ' />
                callee+$:
                <$Identifier>
                  value: <*Literal 'a' />
                </>
                ^^^
                <$MemberExpression { power: 2 }>
                  object+$: <//>
                  sigilToken: <*Punctuator '.' />
                  property+$:
                  <$Identifier>
                    value: <*Literal 'b' />
                  </>
                  matchingSigilToken: null
                </>
                openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
                separatorTokens[]: []
                arguments[]: []
                closeArgumentsToken: <*Punctuator ')' { balancer: true } />
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+$: <//>
                sigilToken: <*Punctuator '.' />
                property+$:
                <$Identifier>
                  value: <*Literal 'c' />
                </>
                matchingSigilToken: null
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`new new a()()`', () => {
      expect(print(js`new new a()()`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$NewExpression { power: 2 }>
                sigilToken: <*Keyword 'new' />
                #: <*Space:Space ' ' />
                callee+$:
                <$NewExpression { power: 2 }>
                  sigilToken: <*Keyword 'new' />
                  #: <*Space:Space ' ' />
                  callee+$:
                  <$Identifier>
                    value: <*Literal 'a' />
                  </>
                  openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
                  separatorTokens[]: []
                  arguments[]: []
                  closeArgumentsToken: <*Punctuator ')' { balancer: true } />
                </>
                openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
                separatorTokens[]: []
                arguments[]: []
                closeArgumentsToken: <*Punctuator ')' { balancer: true } />
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it('js`a+++b`', () => {
      expect(print(js`a+++b`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$_>
          .:
          <$Program>
            body[]: []
            body[]:
            <$ExpressionStatement>
              expression+:
              <$Identifier>
                value: <*Literal 'a' />
              </>
              ^^^
              <$UnaryExpression { power: 12, position: 'suffix' }>
                sigilToken: undefined
                argument+$: <//>
                sigilToken: <*Punctuator '++' />
              </>
              ^^^
              <$BinaryExpression { power: 14 }>
                left+$: <//>
                sigilToken: <*Punctuator '+' />
                right+$:
                <$Identifier>
                  value: <*Literal 'b' />
                </>
              </>
              endToken: null
            </>
          </>
        </>\n`);
    });

    it.skip('js`a-----b`', () => {
      expect(() => print(js`a-----b`)).toThrowError();
    });
  });
});
