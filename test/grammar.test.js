import { spam } from '@bablr/boot';
import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import * as language from '@bablr/language-en-es3';
import { buildTag } from 'bablr';
import { debugEnhancers } from '@bablr/helpers/enhancers';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/helpers/tree';

let enhancers = undefined;

const buildJSTag = (matcher) => {
  return buildTag(language, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printPrettyCSTML(tree);
};

describe('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag(spam`<$Program />`);

    it('js`;`', () => {
      expect(print(js`;`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$EmptyStatement>
            endToken: <*Punctuator ';' />
          </>
        </>\n`);
    });

    it('js`true`', () => {
      expect(print(js`true`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Boolean>
              sigilToken: <*Keyword 'true' />
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`(1,2)`', () => {
      expect(print(js`(1,2)`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$ParenthesisExpression>
              openExpressionToken: <*Punctuator '(' { balanced: ')' } />
              expression+:
              <$Number>
                wholePart$: <*UnsignedInteger '1' />
                fractionalSeparatorToken: null
                fractionalPart$: null
                exponentSeparatorToken: null
                exponentPart$: null
              </>
              ^^^
              <$SequenceExpression { power: 34 }>
                elements[]+$: <//>
                #separatorTokens[]: <*Punctuator ',' />
                elements[]+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '2' />
                  fractionalSeparatorToken: null
                  fractionalPart$: null
                  exponentSeparatorToken: null
                  exponentPart$: null
                </>
              </>
              closeExpressionToken: <*Punctuator ')' { balancer: true } />
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`1+2`', () => {
      expect(print(js`1+2`)).toEqual(dedent`\
        <$Program>
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
        </>\n`);
    });

    it('js`1*2+3`', () => {
      expect(print(js`1*2+3`)).toEqual(dedent`\
        <$Program>
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
        </>\n`);
    });

    it('js`1+2*3`', () => {
      expect(print(js`1+2*3`)).toEqual(dedent`\
        <$Program>
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
        </>\n`);
    });

    it('js`foo.bar`', () => {
      expect(print(js`foo.bar`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+$: <//>
              dotToken: <*Punctuator '.' />
              openToken: null
              property+$:
              <$Identifier>
                value: <*Literal 'bar' />
              </>
              closeToken: null
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`typeof baz`', () => {
      expect(print(js`typeof baz`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$UnaryExpression { power: 10, position: 'prefix' }>
              sigilToken: <*Punctuator 'typeof' />
              #: :Comment.Space: <*Space ' ' />
              argument+$:
              <$Identifier>
                value: <*Literal 'baz' />
              </>
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`o = { foo: null, bar: NaN, baz: undefined }`', () => {
      expect(print(js`o = { foo: null, bar: NaN, baz: undefined }`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'o' />
              #: :Comment.Space: <*Space ' ' />
            </>
            ^^^
            <$AssignmentExpression { power: 32 }>
              left+$: <//>
              assignmentOperator: <*Punctuator '=' />
              #: :Comment.Space: <*Space ' ' />
              right+$:
              <$Object>
                open: <*Punctuator '{' { balanced: '}' } />
                #: :Comment.Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value: <*Literal 'foo' />
                  </>
                  mapOperator: <*Punctuator ':' />
                  #: :Comment.Space: <*Space ' ' />
                  value+$:
                  <$Null>
                    sigilToken: <*Keyword 'null' />
                  </>
                </>
                #separatorTokens[]: <*Punctuator ',' />
                #: :Comment.Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value: <*Literal 'bar' />
                  </>
                  mapOperator: <*Punctuator ':' />
                  #: :Comment.Space: <*Space ' ' />
                  value+$:
                  <$NotANumber>
                    sigilToken: <*Keyword 'NaN' />
                  </>
                </>
                #separatorTokens[]: <*Punctuator ',' />
                #: :Comment.Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value: <*Literal 'baz' />
                  </>
                  mapOperator: <*Punctuator ':' />
                  #: :Comment.Space: <*Space ' ' />
                  value+$:
                  <$Identifier>
                    value: <*Literal 'undefined' />
                    #: :Comment.Space: <*Space ' ' />
                  </>
                </>
                close: <*Punctuator '}' { balancer: true } />
              </>
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`a ? b : c;`', () => {
      expect(print(js`a ? b : c;`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'a' />
              #: :Comment.Space: <*Space ' ' />
            </>
            ^^^
            <$TernaryExpression { power: 32 }>
              test+$: <//>
              consequentSigilToken: <*Punctuator '?' />
              #: :Comment.Space: <*Space ' ' />
              consequent+$:
              <$Identifier>
                value: <*Literal 'b' />
                #: :Comment.Space: <*Space ' ' />
              </>
              alternateSigilToken: <*Punctuator ':' />
              #: :Comment.Space: <*Space ' ' />
              alternate+$:
              <$Identifier>
                value: <*Literal 'c' />
              </>
            </>
            endToken: <*Punctuator ';' />
          </>
        </>\n`);
    });

    it('js`a[b]`', () => {
      expect(print(js`a[b]`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'a' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+$: <//>
              dotToken: null
              openToken: <*Punctuator '[' { balanced: ']' } />
              property+$:
              <$Identifier>
                value: <*Literal 'b' />
              </>
              closeToken: <*Punctuator ']' { balancer: true } />
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`foo.bar = false`', () => {
      expect(print(js`foo.bar = false`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+$: <//>
              dotToken: <*Punctuator '.' />
              openToken: null
              property+$:
              <$Identifier>
                value: <*Literal 'bar' />
                #: :Comment.Space: <*Space ' ' />
              </>
              closeToken: null
            </>
            ^^^
            <$AssignmentExpression { power: 32 }>
              left+$: <//>
              assignmentOperator: <*Punctuator '=' />
              #: :Comment.Space: <*Space ' ' />
              right+$:
              <$Boolean>
                sigilToken: <*Keyword 'false' />
              </>
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`new a.b().c`', () => {
      expect(print(js`new a.b().c`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$NewExpression { power: 2 }>
              sigilToken: <*Keyword 'new' />
              #: :Comment.Space: <*Space ' ' />
              callee+$:
              <$Identifier>
                value: <*Literal 'a' />
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+$: <//>
                dotToken: <*Punctuator '.' />
                openToken: null
                property+$:
                <$Identifier>
                  value: <*Literal 'b' />
                </>
                closeToken: null
              </>
              openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
              closeArgumentsToken: <*Punctuator ')' { balancer: true } />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+$: <//>
              dotToken: <*Punctuator '.' />
              openToken: null
              property+$:
              <$Identifier>
                value: <*Literal 'c' />
              </>
              closeToken: null
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`new new a()()`', () => {
      expect(print(js`new new a()()`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$NewExpression { power: 2 }>
              sigilToken: <*Keyword 'new' />
              #: :Comment.Space: <*Space ' ' />
              callee+$:
              <$NewExpression { power: 2 }>
                sigilToken: <*Keyword 'new' />
                #: :Comment.Space: <*Space ' ' />
                callee+$:
                <$Identifier>
                  value: <*Literal 'a' />
                </>
                openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
                closeArgumentsToken: <*Punctuator ')' { balancer: true } />
              </>
              openArgumentsToken: <*Punctuator '(' { balanced: ')' } />
              closeArgumentsToken: <*Punctuator ')' { balancer: true } />
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`a = a = b`', () => {
      expect(print(js`a = a = b`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'a' />
            </>
            ^^^
            <_>
              #: :Comment.Space: <*Space ' ' />
              <$AssignmentExpression { power: 32 }>
                left+$: <//>
                assignmentOperator: <*Punctuator '=' />
                #: :Comment.Space: <*Space ' ' />
                right+$:
                <$Identifier>
                  value: <*Literal 'a' />
                  #: :Comment.Space: <*Space ' ' />
                </>
                ^^^
                <$AssignmentExpression { power: 32 }>
                  left+$: <//>
                  assignmentOperator: <*Punctuator '=' />
                  #: :Comment.Space: <*Space ' ' />
                  right+$:
                  <$Identifier>
                    value: <*Literal 'b' />
                  </>
                </>
              </>
            </>
            endToken: null
          </>
        </>\n`);
    });

    it('js`a+++b`', () => {
      expect(print(js`a+++b`)).toEqual(dedent`\
        <$Program>
          body[]:
          <$ExpressionStatement>
            expression+:
            <$Identifier>
              value: <*Literal 'a' />
            </>
            ^^^
            <$UnaryExpression { power: 12, position: 'suffix' }>
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
        </>\n`);
    });

    it.skip('js`a-----b`', () => {
      expect(() => print(js`a-----b`)).toThrowError();
    });
  });
});
