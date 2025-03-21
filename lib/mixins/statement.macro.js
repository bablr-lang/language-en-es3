import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o } from '@bablr/helpers/grammar';
import { AllowEmpty, CoveredBy, InjectFrom, Node } from '@bablr/helpers/decorators';
import * as productions from '@bablr/helpers/productions';
import { ReferenceTag } from '@bablr/agast-helpers/symbols';

export const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    *StatementList({ ctx, s }) {
      let stmt, trivia, newline;
      do {
        stmt = yield eat(m`<Statement />`);
        if (
          s.resultPath?.previousSibling.tag.type === ReferenceTag &&
          s.resultPath?.previousSibling.tag.value.name === '#'
        ) {
          trivia = s.resultPath.inner;
        } else {
          trivia = yield eatMatch(m`#: <Comment:Trivia /[ \n\r\t]|\/\/|\/\*/ />`);
        }
        newline = trivia && ctx.sourceTextFor(trivia).includes('\n');
      } while ((stmt.get('endToken') || newline) && (yield match(re`/./s`)));
    }

    @CoveredBy('Statement')
    @AllowEmpty
    @Node
    *ExpressionStatement() {
      yield eat(m`expression+: <Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`);
    }

    @CoveredBy('Statement')
    @Node
    *FunctionStatement() {
      yield eat(m`sigilToken: <*Keyword 'function' />`);
      yield eat(m`id: <Identifier />`);
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`params[]: <List />`,
        o({
          element: m`<Identifier />`,
          allowTrailingSeparator: false,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <BlockStatement />`);
    }

    @CoveredBy('Statement')
    @Node
    *ReturnStatement() {
      yield eat(m`sigilToken: <*Keyword 'return' />`);
      yield eat(m`expression+$: <Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`);
    }

    @CoveredBy('Statement')
    @Node
    *ThrowStatement() {
      yield eat(m`sigilToken: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`);
    }

    @CoveredBy('Statement')
    @Node
    *VariableDeclarationStatement() {
      yield eat(m`sigilToken: <*Keyword 'var' />`);
      yield eat(m`declarations[]: <VariableDeclarator />`);
      yield eat(
        m`declarations[]: <List />`,
        o({
          element: m`<VariableDeclarator />`,
          allowTrailingSeparator: false,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
    }

    @Node
    *VariableDeclarator() {
      yield eat(m`id: <Identifier />`);
      yield eat(m`sigilToken: <*Punctuator '=' />`);
      yield eat(m`init: <*Statement />`);
    }

    @AllowEmpty
    *Statement({ value: { allowEmpty = true } = {} }) {
      yield eat(m`<Any />`, [
        [m`<EmptyStatement /;|$/ />`, o({ allowEmpty })],
        m`<BlockStatement '{' />`,
        m`<IfStatement 'if' />`,
        m`<WhileStatement 'while' />`,
        m`<DoWhileStatement 'do' />`,
        m`<SwitchStatement 'switch' />`,
        m`<LoopStatement 'for' />`,
        m`<FunctionStatement /function [a-zA-Z$_]/ />`,
        m`<ReturnStatement 'return' />`,
        m`<ThrowStatement 'throw' />`,
        m`<ExpressionStatement />`,
      ]);
    }

    @CoveredBy('Statement')
    @AllowEmpty
    @Node
    *EmptyStatement({ value: { allowEmpty = true } = {} }) {
      if (allowEmpty) {
        yield eatMatch(m`endToken: <*Punctuator ';' />`);
      } else {
        yield eat(m`endToken: <*Punctuator ';' />`);
      }
    }

    @CoveredBy('Statement')
    @Node
    *BlockStatement() {
      yield eat(m`openToken: <*Punctuator '{' { balanced: '}' } />`);
      yield eat(m`body[]: <StatementList />`);
      yield eat(m`closeToken: <*Punctuator '}' { balancer: true } />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`);
    }

    @CoveredBy('Statement')
    @Node
    *IfStatement() {
      yield eat(m`sigilToken: <*Keyword 'if' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test: <Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`consequent: <Statement />`, o({ allowEmpty: false }));
      if (yield eatMatch(m`alternateSigilToken: <*Keyword 'else' />`)) {
        yield eat(m`consequent: <Statement />`, o({ allowEmpty: false }));
      } else {
        yield eat(m`alternate: null`);
      }
    }

    @CoveredBy('Statement')
    @Node
    *WhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'while' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <Statement />`);
    }

    @CoveredBy('Statement')
    @Node
    *DoWhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'do' />`);
      yield eat(m`body: <Statement />`);
      yield eat(m`footerSigilToken: <*Keyword 'while' />`);
      yield eat(m`openFooterToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <Expression />`);
      yield eat(m`closeFooterToken: <*Punctuator ')' { balancer: true } />`);
    }

    @CoveredBy('Statement')
    @Node
    *SwitchStatement() {
      yield eat(m`sigilToken: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`discriminant+$: <Expression />`);
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
          yield eat(m`condition+$: <Expression />`);
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
      while (yield match(re`/./`)) yield eat(m`statements[]: <Statement />`);
    }

    *LoopStatement() {
      // This might have been called ForStatement, but that name was already in use
      throw new Error('not implemented');
    }

    @CoveredBy('Statement')
    @Node
    *ForStatement() {
      yield eat(m`sigilToken: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      if (!(yield eatMatch(m`init: <VariableDeclaration />`))) {
        yield eatMatch(m`init+$: <Expression />`);
      }
      yield eat(m`testSeparatorToken: <*Punctuator ';' />`);
      yield eatMatch(m`test+$: <Expression />`);
      yield eat(m`updateSeparatorToken: <*Punctuator ';' />`);
      yield eatMatch(m`update+$: <Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <Statement />`);
    }

    @CoveredBy('Statement')
    @Node
    *ForInStatement() {
      yield eat(m`sigilToken: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      if (!(yield eatMatch(m`left: <VariableDeclaration />`))) {
        yield eatMatch(m`left: <Expression />`);
      }
      yield eat(m`iterationSigilToken: <*Keyword 'in' />`);
      yield eatMatch(m`right+$: <Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <Statement />`);
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
