import { spam } from '@bablr/boot';
import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import language from '@bablr/language-en-es3';
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
          body[]$:
          <$Empty>
            endToken*: <* ';' />
          </>
        </>\n`);
    });

    it('js`true`', () => {
      expect(print(js`true`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Boolean>
              sigilToken*: <*Keyword 'true' />
            </>
          </>
        </>\n`);
    });

    it('js`(1,2)`', () => {
      expect(print(js`(1,2)`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$ParenthesisExpression>
              openToken*: <* '(' />
              expression+$:
              <$Number>
                wholePart$: <*UnsignedInteger '1' />
                fractionalPart$: null
                exponentPart$: null
              </>
              ^^^
              <$SequenceExpression>
                elements[]+$: <//>
                #separatorTokens: <* ',' />
                elements[]+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '2' />
                  fractionalPart$: null
                  exponentPart$: null
                </>
              </>
              closeToken*: <* ')' />
            </>
          </>
        </>\n`);
    });

    it('js`1+2`', () => {
      expect(print(js`1+2`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Number>
              wholePart$: <*UnsignedInteger '1' />
              fractionalPart$: null
              exponentPart$: null
            </>
            ^^^
            <$BinaryExpression>
              left+$: <//>
              sigilToken*: <* '+' />
              right+$:
              <$Number>
                wholePart$: <*UnsignedInteger '2' />
                fractionalPart$: null
                exponentPart$: null
              </>
            </>
          </>
        </>\n`);
    });

    it('js`1*2+3`', () => {
      expect(print(js`1*2+3`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Number>
              wholePart$: <*UnsignedInteger '1' />
              fractionalPart$: null
              exponentPart$: null
            </>
            ^^^
            <$BinaryExpression>
              left+$: <//>
              sigilToken*: <* '*' />
              right+$:
              <$Number>
                wholePart$: <*UnsignedInteger '2' />
                fractionalPart$: null
                exponentPart$: null
              </>
            </>
            ^^^
            <$BinaryExpression>
              left+$: <//>
              sigilToken*: <* '+' />
              right+$:
              <$Number>
                wholePart$: <*UnsignedInteger '3' />
                fractionalPart$: null
                exponentPart$: null
              </>
            </>
          </>
        </>\n`);
    });

    it('js`1+2*3`', () => {
      expect(print(js`1+2*3`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Number>
              wholePart$: <*UnsignedInteger '1' />
              fractionalPart$: null
              exponentPart$: null
            </>
            ^^^
            <$BinaryExpression>
              left+$: <//>
              sigilToken*: <* '+' />
              right+$:
              <$Number>
                wholePart$: <*UnsignedInteger '2' />
                fractionalPart$: null
                exponentPart$: null
              </>
              ^^^
              <$BinaryExpression>
                left+$: <//>
                sigilToken*: <* '*' />
                right+$:
                <$Number>
                  wholePart$: <*UnsignedInteger '3' />
                  fractionalPart$: null
                  exponentPart$: null
                </>
              </>
            </>
          </>
        </>\n`);
    });

    it('js`foo.bar`', () => {
      expect(print(js`foo.bar`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression>
              object+$: <//>
              dotToken*: <* '.' />
              property+$:
              <$Identifier>
                value*: <*Literal 'bar' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`typeof baz`', () => {
      expect(print(js`typeof baz`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$UnaryExpression { position: 'prefix' }>
              sigilToken*: <* 'typeof' />
              #: :Space: <*Space ' ' />
              argument+$:
              <$Identifier>
                value*: <*Literal 'baz' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`o = { foo: null, bar: NaN, baz: undefined }`', () => {
      expect(print(js`o = { foo: null, bar: NaN, baz: undefined }`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'o' />
            </>
            ^^^
            <$AssignmentExpression>
              left+$: <//>
              #: :Space: <*Space ' ' />
              assignmentOperator*: <* '=' />
              #: :Space: <*Space ' ' />
              right+$:
              <$Object>
                openToken*: <* '{' />
                #: :Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value*: <*Literal 'foo' />
                  </>
                  mapOperator*: <* ':' />
                  #: :Space: <*Space ' ' />
                  value+$:
                  <$Null>
                    sigilToken*: <*Keyword 'null' />
                  </>
                </>
                #separatorTokens: <* ',' />
                #: :Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value*: <*Literal 'bar' />
                  </>
                  mapOperator*: <* ':' />
                  #: :Space: <*Space ' ' />
                  value+$:
                  <$NotANumber>
                    sigilToken*: <*Keyword 'NaN' />
                  </>
                </>
                #separatorTokens: <* ',' />
                #: :Space: <*Space ' ' />
                properties[]$:
                <$Property>
                  key$:
                  <$Identifier>
                    value*: <*Literal 'baz' />
                  </>
                  mapOperator*: <* ':' />
                  #: :Space: <*Space ' ' />
                  value+$:
                  <$Identifier>
                    value*: <*Literal 'undefined' />
                  </>
                  #: :Space: <*Space ' ' />
                </>
                closeToken*: <* '}' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`a ? b : c;`', () => {
      expect(print(js`a ? b : c;`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'a' />
            </>
            ^^^
            <$TernaryExpression>
              test+$: <//>
              #: :Space: <*Space ' ' />
              consequentSigilToken*: <* '?' />
              #: :Space: <*Space ' ' />
              consequent+$:
              <$Identifier>
                value*: <*Literal 'b' />
              </>
              #: :Space: <*Space ' ' />
              alternateSigilToken*: <* ':' />
              #: :Space: <*Space ' ' />
              alternate+$:
              <$Identifier>
                value*: <*Literal 'c' />
              </>
            </>
            endToken*: <* ';' />
          </>
        </>\n`);
    });

    it('js`a[b]`', () => {
      expect(print(js`a[b]`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'a' />
            </>
            ^^^
            <$MemberExpression>
              object+$: <//>
              openToken*: <* '[' />
              property+$:
              <$Identifier>
                value*: <*Literal 'b' />
              </>
              closeToken*: <* ']' />
            </>
          </>
        </>\n`);
    });

    it('js`foo.bar = false`', () => {
      expect(print(js`foo.bar = false`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression>
              object+$: <//>
              dotToken*: <* '.' />
              property+$:
              <$Identifier>
                value*: <*Literal 'bar' />
              </>
            </>
            ^^^
            <$AssignmentExpression>
              left+$: <//>
              #: :Space: <*Space ' ' />
              assignmentOperator*: <* '=' />
              #: :Space: <*Space ' ' />
              right+$:
              <$Boolean>
                sigilToken*: <*Keyword 'false' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`new a.b().c`', () => {
      expect(print(js`new a.b().c`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$NewExpression>
              sigilToken*: <*Keyword 'new' />
              #: :Space: <*Space ' ' />
              callee+$:
              <$Identifier>
                value*: <*Literal 'a' />
              </>
              ^^^
              <$MemberExpression>
                object+$: <//>
                dotToken*: <* '.' />
                property+$:
                <$Identifier>
                  value*: <*Literal 'b' />
                </>
              </>
              openArgumentsToken*: <* '(' />
              closeArgumentsToken*: <* ')' />
            </>
            ^^^
            <$MemberExpression>
              object+$: <//>
              dotToken*: <* '.' />
              property+$:
              <$Identifier>
                value*: <*Literal 'c' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`new new a()()`', () => {
      expect(print(js`new new a()()`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$NewExpression>
              sigilToken*: <*Keyword 'new' />
              #: :Space: <*Space ' ' />
              callee+$:
              <$NewExpression>
                sigilToken*: <*Keyword 'new' />
                #: :Space: <*Space ' ' />
                callee+$:
                <$Identifier>
                  value*: <*Literal 'a' />
                </>
                openArgumentsToken*: <* '(' />
                closeArgumentsToken*: <* ')' />
              </>
              openArgumentsToken*: <* '(' />
              closeArgumentsToken*: <* ')' />
            </>
          </>
        </>\n`);
    });

    it('js`a = a = b`', () => {
      expect(print(js`a = a = b`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'a' />
            </>
            ^^^
            <$AssignmentExpression>
              left+$: <//>
              #: :Space: <*Space ' ' />
              assignmentOperator*: <* '=' />
              #: :Space: <*Space ' ' />
              right+$:
              <$Identifier>
                value*: <*Literal 'a' />
              </>
              ^^^
              <$AssignmentExpression>
                left+$: <//>
                #: :Space: <*Space ' ' />
                assignmentOperator*: <* '=' />
                #: :Space: <*Space ' ' />
                right+$:
                <$Identifier>
                  value*: <*Literal 'b' />
                </>
              </>
            </>
          </>
        </>\n`);
    });

    it('js`a+++b`', () => {
      expect(print(js`a+++b`)).toEqual(dedent`\
        <$Program>
          body[]$:
          <$ExpressionStatement>
            expression+$:
            <$Identifier>
              value*: <*Literal 'a' />
            </>
            ^^^
            <$UnaryExpression { position: 'suffix' }>
              argument+$: <//>
              sigilToken*: <* '++' />
            </>
            ^^^
            <$BinaryExpression>
              left+$: <//>
              sigilToken*: <* '+' />
              right+$:
              <$Identifier>
                value*: <*Literal 'b' />
              </>
            </>
          </>
        </>\n`);
    });

    it.skip('js`a-----b`', () => {
      expect(() => print(js`a-----b`)).toThrowError();
    });
  });
});
