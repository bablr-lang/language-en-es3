import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import language from '@bablr/language-en-es3';
import { buildTag } from 'bablr';
import { expect } from 'expect';
import { printCSTML } from '@bablr/helpers/tree';
import { m } from '@bablr/helpers/grammar';

let enhancers = undefined;

const buildJSTag = (matcher) => {
  return buildTag(language, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printCSTML(tree);
};

describe('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag(m`<Program />`);

    it('js`;`', () => {
      expect(print(js`;`)).toEqual(dedent`
        <_>
          _:
          <Program>
            #separatorTokens: <* ';' />
          </>
        </>
      `);
    });

    it('js`true`', () => {
      expect(print(js`true`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <Boolean>
                sigilToken*: <*Keyword 'true' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`(1,2)`', () => {
      expect(print(js`(1,2)`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <ParenthesisExpression>
                openToken*: <* '(' />
                expression+$:
                <SequenceExpression>
                  elements[]+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '1' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                  #separatorTokens: <* ',' />
                  elements[]+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '2' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                </>
                closeToken*: <* ')' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`1+2`', () => {
      expect(print(js`1+2`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <BinaryExpression>
                left+$:
                <Number>
                  wholePart$: <*UnsignedInteger '1' />
                  decimalPart$: null 
                  exponentPart$: null 
                </>
                sigilToken*: <* '+' />
                right+$:
                <Number>
                  wholePart$: <*UnsignedInteger '2' />
                  decimalPart$: null 
                  exponentPart$: null 
                </>
              </>
            </>
          </>
        </>
      `);
    });

    it('js`1*2+3`', () => {
      expect(print(js`1*2+3`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <BinaryExpression>
                left+$:
                <BinaryExpression>
                  left+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '1' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                  sigilToken*: <* '*' />
                  right+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '2' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                </>
                sigilToken*: <* '+' />
                right+$:
                <Number>
                  wholePart$: <*UnsignedInteger '3' />
                  decimalPart$: null 
                  exponentPart$: null 
                </>
              </>
            </>
          </>
        </>
      `);
    });

    it('js`1+2*3`', () => {
      expect(print(js`1+2*3`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <BinaryExpression>
                left+$:
                <Number>
                  wholePart$: <*UnsignedInteger '1' />
                  decimalPart$: null 
                  exponentPart$: null 
                </>
                sigilToken*: <* '+' />
                right+$:
                <BinaryExpression>
                  left+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '2' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                  sigilToken*: <* '*' />
                  right+$:
                  <Number>
                    wholePart$: <*UnsignedInteger '3' />
                    decimalPart$: null 
                    exponentPart$: null 
                  </>
                </>
              </>
            </>
          </>
        </>
      `);
    });

    it('js`foo.bar`', () => {
      expect(print(js`foo.bar`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <MemberExpression>
                object+$: <*Identifier 'foo' />
                dotToken*: <* '.' />
                property+$: <*Identifier 'bar' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`typeof baz`', () => {
      expect(print(js`typeof baz`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <UnaryExpression { position: 'prefix' }>
                sigilToken*: <*Keyword 'typeof' />
                #: <* ' ' />
                argument+$: <*Identifier 'baz' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`o = { foo: null, bar: NaN, baz: undefined }`', () => {
      expect(print(js`o = { foo: null, bar: NaN, baz: undefined }`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <AssignmentExpression>
                left+$: <*Identifier 'o' />
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$:
                <Object>
                  openToken*: <* '{' />
                  #: <* ' ' />
                  elements[]:
                  <ObjectElement>
                    value+:
                    <Property>
                      key$: <*Identifier 'foo' />
                      mapOperator*: <* ':' />
                      #: <* ' ' />
                      value+$:
                      <Null>
                        sigilToken*: <*Keyword 'null' />
                      </>
                    </>
                    separatorToken*: <* ',' />
                  </>
                  #: <* ' ' />
                  elements[]:
                  <ObjectElement>
                    value+:
                    <Property>
                      key$: <*Identifier 'bar' />
                      mapOperator*: <* ':' />
                      #: <* ' ' />
                      value+$:
                      <NotANumber>
                        sigilToken*: <*Keyword 'NaN' />
                      </>
                    </>
                    separatorToken*: <* ',' />
                  </>
                  #: <* ' ' />
                  elements[]:
                  <ObjectElement>
                    value+:
                    <Property>
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
        </>
      `);
    });

    it('js`a ? b : c;`', () => {
      expect(print(js`a ? b : c;`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <TernaryExpression>
                test+$: <*Identifier 'a' />
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
        </>
      `);
    });

    it('js`a[b]`', () => {
      expect(print(js`a[b]`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <MemberExpression>
                object+$: <*Identifier 'a' />
                openToken*: <* '[' />
                property+$: <*Identifier 'b' />
                closeToken*: <* ']' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`foo.bar = false`', () => {
      expect(print(js`foo.bar = false`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <AssignmentExpression>
                left+$:
                <MemberExpression>
                  object+$: <*Identifier 'foo' />
                  dotToken*: <* '.' />
                  property+$: <*Identifier 'bar' />
                </>
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$:
                <Boolean>
                  sigilToken*: <*Keyword 'false' />
                </>
              </>
            </>
          </>
        </>
      `);
    });

    it('js`new a.b().c`', () => {
      expect(print(js`new a.b().c`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <MemberExpression>
                object+$:
                <NewExpression>
                  sigilToken*: <*Keyword 'new' />
                  #: <* ' ' />
                  callee+$:
                  <MemberExpression>
                    object+$: <*Identifier 'a' />
                    dotToken*: <* '.' />
                    property+$: <*Identifier 'b' />
                  </>
                  openArgumentsToken*: <* '(' />
                  closeArgumentsToken*: <* ')' />
                </>
                dotToken*: <* '.' />
                property+$: <*Identifier 'c' />
              </>
            </>
          </>
        </>
      `);
    });

    it('js`new new a()()`', () => {
      expect(print(js`new new a()()`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <NewExpression>
                sigilToken*: <*Keyword 'new' />
                #: <* ' ' />
                callee+$:
                <NewExpression>
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
        </>
      `);
    });

    it('js`a = a = b`', () => {
      expect(print(js`a = a = b`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <AssignmentExpression>
                left+$: <*Identifier 'a' />
                #: <* ' ' />
                assignmentOperator*: <* '=' />
                #: <* ' ' />
                right+$:
                <AssignmentExpression>
                  left+$: <*Identifier 'a' />
                  #: <* ' ' />
                  assignmentOperator*: <* '=' />
                  #: <* ' ' />
                  right+$: <*Identifier 'b' />
                </>
              </>
            </>
          </>
        </>
      `);
    });

    it('js`a+++b`', () => {
      expect(print(js`a+++b`)).toEqual(dedent`
        <_>
          _:
          <Program>
            body[]$:
            <ExpressionStatement>
              expression+$:
              <BinaryExpression>
                left+$:
                <UnaryExpression { position: 'suffix' }>
                  argument+$: <*Identifier 'a' />
                  sigilToken*: <* '++' />
                </>
                sigilToken*: <* '+' />
                right+$: <*Identifier 'b' />
              </>
            </>
          </>
        </>
      `);
    });

    it.skip('js`a-----b`', () => {
      expect(() => print(js`a-----b`)).toThrowError();
    });
  });
});
