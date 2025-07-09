import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o } from '@bablr/helpers/grammar';
import { AllowEmpty, CoveredBy, InjectFrom, Node } from '@bablr/helpers/decorators';
import * as productions from '@bablr/helpers/productions';
import { ReferenceTag } from '@bablr/agast-helpers/symbols';

export const noSemiStatements = [
  'IfStatement',
  'ForStatement',
  'SwitchStatement',
  'BlockStatement',
];

export const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    @AllowEmpty
    *StatementList({ ctx, s }) {
      let stmt, trivia, newline;
      while (yield match(re`/./s`)) {
        stmt = yield eat(m`<_Statement />`);
        if (
          s.resultPath?.previousSibling.tag.type === ReferenceTag &&
          s.resultPath?.previousSibling.tag.value.type === '#'
        ) {
          trivia = s.resultPath.inner;
        } else {
          trivia = yield eatMatch(m`#: :Comment: <__Trivia /[ \n\r\t]|\/\/|\/\*/ />`);
        }
        newline = trivia && ctx.sourceTextFor(trivia).includes('\n');

        if (noSemiStatements.includes(stmt.type) && !(stmt.get('endToken') || newline)) break;
      }
    }

    @CoveredBy('Statement')
    @AllowEmpty
    @Node
    *ExpressionStatement() {
      yield eat(m`expression+: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    @CoveredBy('Statement')
    @Node
    *FunctionStatement() {
      yield eat(m`sigilToken: <*Keyword 'function' />`);
      yield eat(m`id: <Identifier />`);
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`params[]: <__List />`,
        o({
          element: m`<Identifier />`,
          allowTrailingSeparator: false,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <BlockStatement />`);
    }

    @CoveredBy('Statement')
    @Node
    *ReturnStatement() {
      yield eat(m`sigilToken: <*Keyword 'return' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    @CoveredBy('Statement')
    @Node
    *ThrowStatement() {
      yield eat(m`sigilToken: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    @CoveredBy('Statement')
    @Node
    *DebuggerStatement() {
      yield eat(m`sigilToken: <*Keyword 'debugger' />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    @CoveredBy('Statement')
    @Node
    *VariableDeclarationStatement({ props: { noSemi = false } }) {
      yield eat(m`sigilToken: <*Keyword 'var' />`);
      yield eat(
        m`declarations[]: <__List />`,
        o({
          element: m`<VariableDeclarator />`,
          allowTrailingSeparator: false,
          separator: m`#separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      if (!noSemi) {
        yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
      } else {
        yield eat(m`endToken: null`, null, o({ bind: true }));
      }
    }

    @Node
    *VariableDeclarator() {
      yield eat(m`target: <Identifier />`);
      if (yield match(re`/=/s`)) {
        yield eat(m`assignmentOperator: <*Punctuator '=' />`);
        yield eat(m`value+$: <_Expression />`, o({ power: 32 }));
      } else {
        yield eat(m`assignmentOperator: null`);
        yield eat(m`value+$: null`);
      }
    }

    @AllowEmpty
    *Statement({ props: { allowEmpty = true } }) {
      yield eat(m`<__Any />`, [
        [m`<EmptyStatement /;/ />`, o({ allowEmpty })],
        m`<BlockStatement '{' />`,
        m`<IfStatement 'if' />`,
        m`<WhileStatement 'while' />`,
        m`<DoWhileStatement 'do' />`,
        m`<SwitchStatement 'switch' />`,
        m`<ForStatement 'for' />`,
        m`<FunctionStatement /function [a-zA-Z$_]/ />`,
        m`<ReturnStatement 'return' />`,
        m`<ThrowStatement 'throw' />`,
        m`<DebuggerStatement 'debugger' />`,
        m`<VariableDeclarationStatement 'var' />`,
        m`<ExpressionStatement />`,
      ]);
    }

    @CoveredBy('Statement')
    @AllowEmpty
    @Node
    *EmptyStatement({ props: { allowEmpty = true } }) {
      if (allowEmpty) {
        yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
      } else {
        yield eat(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
      }
    }

    @CoveredBy('Statement')
    @Node
    *BlockStatement() {
      yield eat(m`openToken: <*Punctuator '{' { balanced: '}' } />`);
      yield eat(m`body[]: <__StatementList />`);
      yield eat(m`closeToken: <*Punctuator '}' { balancer: true } />`);
    }

    @CoveredBy('Statement')
    @Node
    *IfStatement() {
      yield eat(m`sigilToken: <*Keyword 'if' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+: <_Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`consequent: <_Statement />`, o({ allowEmpty: false }));
      if (yield eatMatch(m`alternateSigilToken: <*Keyword 'else' />`)) {
        yield eat(m`consequent: <_Statement />`, o({ allowEmpty: false }));
      } else {
        yield eat(m`alternate: null`);
      }
    }

    @CoveredBy('Statement')
    @Node
    *WhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'while' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <_Statement />`);
    }

    @CoveredBy('Statement')
    @Node
    *DoWhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'do' />`);
      yield eat(m`body: <_Statement />`);
      yield eat(m`footerSigilToken: <*Keyword 'while' />`);
      yield eat(m`openFooterToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeFooterToken: <*Punctuator ')' { balancer: true } />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    @CoveredBy('Statement')
    @Node
    *SwitchStatement() {
      yield eat(m`sigilToken: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`discriminant+$: <_Expression />`);
      yield eat(m`closeDiscriminantToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`openCasesToken: <*Punctuator '{' { balanced: '}' } />`);
      yield eatMatch(m`cases[]: <SwitchCase /(case|default)\b/ />`);
      yield eat(m`closeCasesToken: <*Punctuator '}' { balancer: true } />`);
    }

    @Node
    *SwitchCase({ intrinsicValue, ctx }) {
      switch (ctx.sourceTextFor(intrinsicValue)) {
        case 'case':
          yield eat(m`sigilToken: <*Keyword 'case' />`);
          yield eat(m`condition+$: <_Expression />`);
          break;

        case 'default':
          yield eat(m`sigilToken: <*Keyword 'default' />`);
          yield eat(m`condition: null`);
          break;

        default:
          yield fail();
          break;
      }

      yield eat(m`bodySeparatorToken: <*Punctuator ':' />`);
      while (yield match(re`/./`)) yield eat(m`statements[]: <_Statement />`);
    }

    @CoveredBy('Statement')
    @Node
    *ForStatement() {
      yield eat(m`sigilToken: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      if (!(yield eatMatch(m`init+$: <VariableDeclarationStatement />`, o({ noSemi: true })))) {
        yield eatMatch(m`init+$: <_Expression />`, o({ noIn: true }));
      }
      let in_ = yield eatMatch(m`inToken: <*Keyword 'in' />`, o({}), o({ bind: true }));
      if (in_) {
        yield eatMatch(m`right+$: <_Expression />`);
      } else {
        yield eat(m`testSeparatorToken: <*Punctuator ';' />`);
        yield eatMatch(m`test+$: <_Expression />`);
        yield eat(m`updateSeparatorToken: <*Punctuator ';' />`);
        yield eatMatch(m`update+$: <_Expression />`);
        yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
        yield eat(m`body: <_Statement />`);
      }
    }

    @CoveredBy('Statement')
    @Node
    *LabeledStatement() {
      yield eat(m`label: <Identifier />`);
      yield eat(m`sigilToken: <*Puncuator ':' />`);
      yield eat(m`body: <*Statement />`);
    }

    @CoveredBy('Statement')
    @Node
    *BreakStatement() {
      yield eat(m`sigilToken: <*Keyword 'break' />`);
      yield eatMatch(m`label: <Identifier />`);
    }

    @CoveredBy('Statement')
    @Node
    *ContinueStatement() {
      yield eat(m`sigilToken: <*Keyword 'continue' />`);
      yield eatMatch(m`label: <Identifier />`);
    }

    @Node
    @InjectFrom(productions)
    *Punctuator() {}
  };
