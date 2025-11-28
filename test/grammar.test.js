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
          body[]:
          <$Empty>
            endToken*: <* ';' />
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
              sigilToken*: <*Keyword 'true' />
            </>
            endToken*: null
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
              openToken*: <* '(' />
              expression+:
              <$Number>
                wholePart: <*UnsignedInteger '1' />
                fractionalSeparatorToken*: null
                fractionalPart: null
                exponentSeparatorToken*: null
                exponentPart: null
              </>
              ^^^
              <$SequenceExpression { power: 34 }>
                elements[]+: <//>
                #separatorTokens: <* ',' />
                elements[]+:
                <$Number>
                  wholePart: <*UnsignedInteger '2' />
                  fractionalSeparatorToken*: null
                  fractionalPart: null
                  exponentSeparatorToken*: null
                  exponentPart: null
                </>
              </>
              closeToken*: <* ')' />
            </>
            endToken*: null
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
              wholePart: <*UnsignedInteger '1' />
              fractionalSeparatorToken*: null
              fractionalPart: null
              exponentSeparatorToken*: null
              exponentPart: null
            </>
            ^^^
            <$BinaryExpression { power: 14 }>
              left+: <//>
              sigilToken*: <* '+' />
              right+:
              <$Number>
                wholePart: <*UnsignedInteger '2' />
                fractionalSeparatorToken*: null
                fractionalPart: null
                exponentSeparatorToken*: null
                exponentPart: null
              </>
            </>
            endToken*: null
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
              wholePart: <*UnsignedInteger '1' />
              fractionalSeparatorToken*: null
              fractionalPart: null
              exponentSeparatorToken*: null
              exponentPart: null
            </>
            ^^^
            <$BinaryExpression { power: 12 }>
              left+: <//>
              sigilToken*: <* '*' />
              right+:
              <$Number>
                wholePart: <*UnsignedInteger '2' />
                fractionalSeparatorToken*: null
                fractionalPart: null
                exponentSeparatorToken*: null
                exponentPart: null
              </>
            </>
            ^^^
            <$BinaryExpression { power: 14 }>
              left+: <//>
              sigilToken*: <* '+' />
              right+:
              <$Number>
                wholePart: <*UnsignedInteger '3' />
                fractionalSeparatorToken*: null
                fractionalPart: null
                exponentSeparatorToken*: null
                exponentPart: null
              </>
            </>
            endToken*: null
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
              wholePart: <*UnsignedInteger '1' />
              fractionalSeparatorToken*: null
              fractionalPart: null
              exponentSeparatorToken*: null
              exponentPart: null
            </>
            ^^^
            <$BinaryExpression { power: 14 }>
              left+: <//>
              sigilToken*: <* '+' />
              right+:
              <$Number>
                wholePart: <*UnsignedInteger '2' />
                fractionalSeparatorToken*: null
                fractionalPart: null
                exponentSeparatorToken*: null
                exponentPart: null
              </>
              ^^^
              <$BinaryExpression { power: 12 }>
                left+: <//>
                sigilToken*: <* '*' />
                right+:
                <$Number>
                  wholePart: <*UnsignedInteger '3' />
                  fractionalSeparatorToken*: null
                  fractionalPart: null
                  exponentSeparatorToken*: null
                  exponentPart: null
                </>
              </>
            </>
            endToken*: null
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
              value*: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+: <//>
              dotToken*: <* '.' />
              openToken*: null
              property+:
              <$Identifier>
                value*: <*Literal 'bar' />
              </>
              closeToken*: null
            </>
            endToken*: null
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
              sigilToken*: <* 'typeof' />
              argument+:
              <$_Trivia_>
                #: :Space: <*Space ' ' />
                _:
                <$Identifier>
                  value*: <*Literal 'baz' />
                </>
              </>
            </>
            endToken*: null
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
              value*: <*Literal 'o' />
            </>
            ^^^
            <$_Trivia_>
              #: :Space: <*Space ' ' />
              _:
              <$AssignmentExpression { power: 32 }>
                left+: <//>
                assignmentOperator*: <* '=' />
                right+:
                <$_Trivia_>
                  #: :Space: <*Space ' ' />
                  _:
                  <$Object>
                    openToken*: <* '{' />
                    properties[]:
                    <$_Trivia_>
                      #: :Space: <*Space ' ' />
                      _:
                      <$Property>
                        key:
                        <$Identifier>
                          value*: <*Literal 'foo' />
                        </>
                        mapOperator*: <* ':' />
                        value+:
                        <$_Trivia_>
                          #: :Space: <*Space ' ' />
                          _:
                          <$Null>
                            sigilToken*: <*Keyword 'null' />
                          </>
                        </>
                      </>
                    </>
                    #separatorTokens: <* ',' />
                    properties[]:
                    <$_Trivia_>
                      #: :Space: <*Space ' ' />
                      _:
                      <$Property>
                        key:
                        <$Identifier>
                          value*: <*Literal 'bar' />
                        </>
                        mapOperator*: <* ':' />
                        value+:
                        <$_Trivia_>
                          #: :Space: <*Space ' ' />
                          _:
                          <$NotANumber>
                            sigilToken*: <*Keyword 'NaN' />
                          </>
                        </>
                      </>
                    </>
                    #separatorTokens: <* ',' />
                    properties[]:
                    <$_Trivia_>
                      #: :Space: <*Space ' ' />
                      _:
                      <$Property>
                        key:
                        <$Identifier>
                          value*: <*Literal 'baz' />
                        </>
                        mapOperator*: <* ':' />
                        value+:
                        <$_Trivia_>
                          #: :Space: <*Space ' ' />
                          _:
                          <$Identifier>
                            value*: <*Literal 'undefined' />
                          </>
                          #: :Space: <*Space ' ' />
                        </>
                      </>
                    </>
                    closeToken*: <* '}' />
                  </>
                </>
              </>
            </>
            endToken*: null
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
              value*: <*Literal 'a' />
            </>
            ^^^
            <$_Trivia_>
              #: :Space: <*Space ' ' />
              _:
              <$TernaryExpression { power: 32 }>
                test+: <//>
                consequentSigilToken*: <* '?' />
                consequent+:
                <$_Trivia_>
                  #: :Space: <*Space ' ' />
                  _:
                  <$Identifier>
                    value*: <*Literal 'b' />
                  </>
                  #: :Space: <*Space ' ' />
                </>
                alternateSigilToken*: <* ':' />
                alternate+:
                <$_Trivia_>
                  #: :Space: <*Space ' ' />
                  _:
                  <$Identifier>
                    value*: <*Literal 'c' />
                  </>
                </>
              </>
            </>
            endToken*: <* ';' />
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
              value*: <*Literal 'a' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+: <//>
              dotToken*: null
              openToken*: <* '[' />
              property+:
              <$Identifier>
                value*: <*Literal 'b' />
              </>
              closeToken*: <* ']' />
            </>
            endToken*: null
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
              value*: <*Literal 'foo' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+: <//>
              dotToken*: <* '.' />
              openToken*: null
              property+:
              <$Identifier>
                value*: <*Literal 'bar' />
              </>
              closeToken*: null
            </>
            ^^^
            <$_Trivia_>
              #: :Space: <*Space ' ' />
              _:
              <$AssignmentExpression { power: 32 }>
                left+: <//>
                assignmentOperator*: <* '=' />
                right+:
                <$_Trivia_>
                  #: :Space: <*Space ' ' />
                  _:
                  <$Boolean>
                    sigilToken*: <*Keyword 'false' />
                  </>
                </>
              </>
            </>
            endToken*: null
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
              sigilToken*: <*Keyword 'new' />
              callee+:
              <$_Trivia_>
                #: :Space: <*Space ' ' />
                _:
                <$Identifier>
                  value*: <*Literal 'a' />
                </>
              </>
              ^^^
              <$MemberExpression { power: 2 }>
                object+: <//>
                dotToken*: <* '.' />
                openToken*: null
                property+:
                <$Identifier>
                  value*: <*Literal 'b' />
                </>
                closeToken*: null
              </>
              openArgumentsToken*: <* '(' />
              closeArgumentsToken*: <* ')' />
            </>
            ^^^
            <$MemberExpression { power: 2 }>
              object+: <//>
              dotToken*: <* '.' />
              openToken*: null
              property+:
              <$Identifier>
                value*: <*Literal 'c' />
              </>
              closeToken*: null
            </>
            endToken*: null
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
              sigilToken*: <*Keyword 'new' />
              callee+:
              <$_Trivia_>
                #: :Space: <*Space ' ' />
                _:
                <$NewExpression { power: 2 }>
                  sigilToken*: <*Keyword 'new' />
                  callee+:
                  <$_Trivia_>
                    #: :Space: <*Space ' ' />
                    _:
                    <$Identifier>
                      value*: <*Literal 'a' />
                    </>
                  </>
                  openArgumentsToken*: <* '(' />
                  closeArgumentsToken*: <* ')' />
                </>
              </>
              openArgumentsToken*: <* '(' />
              closeArgumentsToken*: <* ')' />
            </>
            endToken*: null
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
              value*: <*Literal 'a' />
            </>
            ^^^
            <$_Trivia_>
              #: :Space: <*Space ' ' />
              _:
              <$AssignmentExpression { power: 32 }>
                left+: <//>
                assignmentOperator*: <* '=' />
                right+:
                <$_Trivia_>
                  #: :Space: <*Space ' ' />
                  _:
                  <$Identifier>
                    value*: <*Literal 'a' />
                  </>
                  #: :Space: <*Space ' ' />
                </>
                ^^^
                <$AssignmentExpression { power: 32 }>
                  left+: <//>
                  assignmentOperator*: <* '=' />
                  right+:
                  <$_Trivia_>
                    #: :Space: <*Space ' ' />
                    _:
                    <$Identifier>
                      value*: <*Literal 'b' />
                    </>
                  </>
                </>
              </>
            </>
            endToken*: null
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
              value*: <*Literal 'a' />
            </>
            ^^^
            <$UnaryExpression { power: 12, position: 'suffix' }>
              argument+: <//>
              sigilToken*: <* '++' />
            </>
            ^^^
            <$BinaryExpression { power: 14 }>
              left+: <//>
              sigilToken*: <* '+' />
              right+:
              <$Identifier>
                value*: <*Literal 'b' />
              </>
            </>
            endToken*: null
          </>
        </>\n`);
    });

    it.skip('js`a-----b`', () => {
      expect(() => print(js`a-----b`)).toThrowError();
    });
  });
});
