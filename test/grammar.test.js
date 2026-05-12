import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import language from '@bablr/language-en-es3';
import { buildTag } from 'bablr';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/helpers/tree';
import { m } from '@bablr/helpers/grammar';

let enhancers = undefined;

const buildJSTag = (matcher) => {
  return buildTag(language, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printPrettyCSTML(tree);
};

describe('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag(m`<$Program />`);

    it('js`;`', () => {
      expect(print(js`;`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            #separatorTokens: <* ';' />
          </>
        </>\n`);
    });

    it('js`true`', () => {
      expect(print(js`true`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$:
              <$Boolean>
                sigilToken*: <*Keyword 'true' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`(1,2)`', () => {
      expect(print(js`(1,2)`)).toEqual(dedent`
        <$_>
          _:
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
          </>
        </>\n`);
    });

    it('js`1+2`', () => {
      expect(print(js`1+2`)).toEqual(dedent`
        <$_>
          _:
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
          </>
        </>\n`);
    });

    it('js`1*2+3`', () => {
      expect(print(js`1*2+3`)).toEqual(dedent`
        <$_>
          _:
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
          </>
        </>\n`);
    });

    it('js`1+2*3`', () => {
      expect(print(js`1+2*3`)).toEqual(dedent`
        <$_>
          _:
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
          </>
        </>\n`);
    });

    it('js`foo.bar`', () => {
      expect(print(js`foo.bar`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'foo' />
              ^^^
              <$MemberExpression>
                object+$: <//>
                dotToken*: <* '.' />
                property+$: <*Identifier 'bar' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`typeof baz`', () => {
      expect(print(js`typeof baz`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$:
              <$UnaryExpression { position: 'prefix' }>
                sigilToken*: <*Keyword 'typeof' />
                #: <* ' ' />
                argument+$: <*Identifier 'baz' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`o = { foo: null, bar: NaN, baz: undefined }`', () => {
      expect(print(js`o = { foo: null, bar: NaN, baz: undefined }`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'o' />
              ^^^
              <$AssignmentExpression>
                left+$: <//>
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$:
                <$Object>
                  openToken*: <* '{' />
                  #: <* ' ' />
                  elements[]:
                  <$ObjectElement>
                    value+:
                    <$Property>
                      key$: <*Identifier 'foo' />
                      mapOperator*: <* ':' />
                      #: <* ' ' />
                      value+$:
                      <$Null>
                        sigilToken*: <*Keyword 'null' />
                      </>
                    </>
                    separatorToken*: <* ',' />
                  </>
                  #: <* ' ' />
                  elements[]:
                  <$ObjectElement>
                    value+:
                    <$Property>
                      key$: <*Identifier 'bar' />
                      mapOperator*: <* ':' />
                      #: <* ' ' />
                      value+$:
                      <$NotANumber>
                        sigilToken*: <*Keyword 'NaN' />
                      </>
                    </>
                    separatorToken*: <* ',' />
                  </>
                  #: <* ' ' />
                  elements[]:
                  <$ObjectElement>
                    value+:
                    <$Property>
                      key$: <*Identifier 'baz' />
                      mapOperator*: <* ':' />
                      #: <* ' ' />
                      value+$: <*Identifier 'undefined' />
                    </>
                  </>
                  #: <* ' ' />
                  closeToken*: <* '}' />
                </>
              </>
            </>
          </>
        </>\n`);
    });

    it('js`a ? b : c;`', () => {
      expect(print(js`a ? b : c;`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'a' />
              ^^^
              <$TernaryExpression>
                test+$: <//>
                #: <* ' ' />
                consequentSigilToken*: <* '?' />
                #: <* ' ' />
                consequent+$: <*Identifier 'b' />
                #: <* ' ' />
                alternateSigilToken*: <* ':' />
                #: <* ' ' />
                alternate+$: <*Identifier 'c' />
              </>
            </>
            #separatorTokens: <* ';' />
          </>
        </>\n`);
    });

    it('js`a[b]`', () => {
      expect(print(js`a[b]`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'a' />
              ^^^
              <$MemberExpression>
                object+$: <//>
                openToken*: <* '[' />
                property+$: <*Identifier 'b' />
                closeToken*: <* ']' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`foo.bar = false`', () => {
      expect(print(js`foo.bar = false`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'foo' />
              ^^^
              <$MemberExpression>
                object+$: <//>
                dotToken*: <* '.' />
                property+$: <*Identifier 'bar' />
              </>
              ^^^
              <$AssignmentExpression>
                left+$: <//>
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$:
                <$Boolean>
                  sigilToken*: <*Keyword 'false' />
                </>
              </>
            </>
          </>
        </>\n`);
    });

    it('js`new a.b().c`', () => {
      expect(print(js`new a.b().c`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$:
              <$NewExpression>
                sigilToken*: <*Keyword 'new' />
                #: <* ' ' />
                callee+$: <*Identifier 'a' />
                ^^^
                <$MemberExpression>
                  object+$: <//>
                  dotToken*: <* '.' />
                  property+$: <*Identifier 'b' />
                </>
                openArgumentsToken*: <* '(' />
                closeArgumentsToken*: <* ')' />
              </>
              ^^^
              <$MemberExpression>
                object+$: <//>
                dotToken*: <* '.' />
                property+$: <*Identifier 'c' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`new new a()()`', () => {
      expect(print(js`new new a()()`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$:
              <$NewExpression>
                sigilToken*: <*Keyword 'new' />
                #: <* ' ' />
                callee+$:
                <$NewExpression>
                  sigilToken*: <*Keyword 'new' />
                  #: <* ' ' />
                  callee+$: <*Identifier 'a' />
                  openArgumentsToken*: <* '(' />
                  closeArgumentsToken*: <* ')' />
                </>
                openArgumentsToken*: <* '(' />
                closeArgumentsToken*: <* ')' />
              </>
            </>
          </>
        </>\n`);
    });

    it('js`a = a = b`', () => {
      expect(print(js`a = a = b`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'a' />
              ^^^
              <$AssignmentExpression>
                left+$: <//>
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$: <*Identifier 'a' />
                ^^^
                <$AssignmentExpression>
                  left+$: <//>
                  #: <* ' ' />
                  assignmentOperator*: <* '=' />
                  #: <* ' ' />
                  right+$: <*Identifier 'b' />
                </>
              </>
            </>
          </>
        </>\n`);
    });

    it('js`a+++b`', () => {
      expect(print(js`a+++b`)).toEqual(dedent`
        <$_>
          _:
          <$Program>
            body[]$:
            <$ExpressionStatement>
              expression+$: <*Identifier 'a' />
              ^^^
              <$UnaryExpression { position: 'suffix' }>
                argument+$: <//>
                sigilToken*: <* '++' />
              </>
              ^^^
              <$BinaryExpression>
                left+$: <//>
                sigilToken*: <* '+' />
                right+$: <*Identifier 'b' />
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
