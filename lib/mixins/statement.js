import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o } from '@bablr/helpers/grammar';
import { ReferenceTag } from '@bablr/agast-helpers/symbols';

export const noSemiStatements = [
  'IfStatement',
  'ForStatement',
  'SwitchStatement',
  'BlockStatement',
];

export const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    constructor() {
      super();
      this.emptyables = new Set([
        ...(this.emptyables || []),
        'StatementList',
        'ExpressionStatement',
        'Statement',
        'EmptyStatement',
      ]);
    }

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
          trivia = yield eatMatch(m`#: <__Trivia /[ \n\r\t]|\/\/|\/\*/ />`);
        }
        newline = trivia && ctx.sourceTextFor(trivia).includes('\n');

        if (noSemiStatements.includes(stmt.type) && !(stmt.get('endToken') || newline)) break;
      }
    }

    *ExpressionStatement() {
      yield eat(m`expression+: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

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

    *ReturnStatement() {
      yield eat(m`sigilToken: <*Keyword 'return' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    *ThrowStatement() {
      yield eat(m`sigilToken: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    *DebuggerStatement() {
      yield eat(m`sigilToken: <*Keyword 'debugger' />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

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

    *Statement({ ctx, s, props: { allowEmpty = true } }) {
      let res;
      if (s.source.done) {
        yield eat(m`<EmptyStatement />`, o({ allowEmpty }));
      } else if (
        (res = yield match(
          re`/;|\{|(?:if|while|do|switch|for|function|try|return|continue|break|throw|debugger|var)\b/`,
        ))
      ) {
        let productions = {
          ';': m`<EmptyStatement />`,
          '{': m`<BlockStatement  />`,
          if: m`<IfStatement />`,
          while: m`<WhileStatement />`,
          do: m`<DoWhileStatement />`,
          switch: m`<SwitchStatement />`,
          for: m`<ForStatement />`,
          function: m`<FunctionStatement />`,
          try: m`<TryCatchStatement />`,
          return: m`<ReturnStatement />`,
          continue: m`<ContinueStatement />`,
          break: m`<BreakStatement />`,
          throw: m`<ThrowStatement />`,
          debugger: m`<DebuggerStatement />`,
          var: m`<VariableDeclarationStatement />`,
        };
        yield eat(productions[ctx.sourceTextFor(res)]);
      } else if (yield eatMatch(m`<ExpressionStatement />`)) {
      } else {
        yield eat(m`<LabeledStatement />`);
      }
    }

    *EmptyStatement({ props: { allowEmpty = true } }) {
      if (allowEmpty) {
        yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
      } else {
        yield eat(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
      }
    }

    *BlockStatement() {
      yield eat(m`openToken: <*Punctuator '{' { balanced: '}' } />`);
      yield eat(m`body[]: <__StatementList />`);
      yield eat(m`closeToken: <*Punctuator '}' { balancer: true } />`);
    }

    *IfStatement() {
      yield eat(m`sigilToken: <*Keyword 'if' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+: <_Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`consequent: <_Statement />`, o({}), o({ allowEmpty: false }));
      if (yield eatMatch(m`alternateSigilToken: <*Keyword 'else' />`)) {
        yield eat(m`consequent: <_Statement />`, o({}), o({ allowEmpty: false }));
      } else {
        yield eat(m`alternate: null`);
      }
    }

    *TryCatchStatement() {
      yield eat(m`sigilToken: <*Keyword 'try' />`);
      yield eat(m`block: <BlockStatement />`);

      let catch_ = yield eatMatch(m`handler: <CatchClause />`, o({}), o({ bind: true }));
      let finalizer = yield eatMatch(m`finalizer: <FinallyClause />`, o({}), o({ bind: true }));

      if (!(catch_ || finalizer)) yield fail();
    }

    *CatchClause() {
      yield eat(m`sigilToken: <*Keyword 'catch' />`);
      yield eat(m`openArgumentsToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(
        m`params[]: <__List />`,
        o({
          element: m`<Identifier />`,
          allowTrailingSeparator: false,
          separator: m`separatorTokens[]: <*Punctuator ',' />`,
        }),
      );
      yield eat(m`closeArgumentsToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <BlockStatement />`);
    }

    *FinallyClause() {
      yield eat(m`sigilToken: <*Keyword 'finally' />`);
      yield eat(m`body: <BlockStatement />`);
    }

    *WhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'while' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`body: <_Statement />`);
    }

    *DoWhileStatement() {
      yield eat(m`sigilToken: <*Keyword 'do' />`);
      yield eat(m`body: <_Statement />`);
      yield eat(m`footerSigilToken: <*Keyword 'while' />`);
      yield eat(m`openFooterToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeFooterToken: <*Punctuator ')' { balancer: true } />`);
      yield eatMatch(m`endToken: <*Punctuator ';' />`, null, o({ bind: true }));
    }

    *SwitchStatement() {
      yield eat(m`sigilToken: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken: <*Punctuator '(' { balanced: ')' } />`);
      yield eat(m`discriminant+$: <_Expression />`);
      yield eat(m`closeDiscriminantToken: <*Punctuator ')' { balancer: true } />`);
      yield eat(m`openCasesToken: <*Punctuator '{' { balanced: '}' } />`);
      while (yield eatMatch(m`cases[]: <SwitchCase /(case|default)\b/ />`));
      yield eat(m`closeCasesToken: <*Punctuator '}' { balancer: true } />`);
    }

    *SwitchCase({ literalValue, ctx }) {
      switch (ctx.sourceTextFor(literalValue.value)) {
        case 'case':
          yield eat(m`sigilToken: <*Keyword 'case' />`);
          yield eat(m`test+$: <_Expression />`);
          break;

        case 'default':
          yield eat(m`sigilToken: <*Keyword 'default' />`);
          yield eat(m`test: null`);
          break;

        default:
          yield fail();
          break;
      }

      yield eat(m`bodySeparatorToken: <*Punctuator ':' />`);
      while (!(yield match(re`/(case|default)\b|$/`))) {
        yield eat(m`statements[]: <_Statement />`);
      }
    }

    *ForStatement() {
      yield eat(m`sigilToken: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken: <*Punctuator '(' { balanced: ')' } />`);
      if (!(yield eatMatch(m`init+$: <VariableDeclarationStatement />`, o({ noSemi: true })))) {
        yield eatMatch(m`init+$: <_Expression />`, o({ noIn: true }));
      }
      let in_ = yield eatMatch(m`inToken: <*Keyword 'in' />`, o({}), o({ bind: true }));
      if (in_) {
        yield eatMatch(m`right+$: <_Expression />`);
        yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
        yield eat(m`body: <_Statement />`);
      } else {
        yield eat(m`testSeparatorToken: <*Punctuator ';' />`);
        yield eatMatch(m`test+$: <_Expression />`);
        yield eat(m`updateSeparatorToken: <*Punctuator ';' />`);
        yield eatMatch(m`update+$: <_Expression />`);
        yield eat(m`closeHeaderToken: <*Punctuator ')' { balancer: true } />`);
        yield eat(m`body: <_Statement />`);
      }
    }

    *LabeledStatement() {
      yield eat(m`label: <Identifier />`);
      yield eat(m`sigilToken: <*Punctuator ':' />`);
      yield eat(m`body: <*Statement />`);
    }

    *BreakStatement() {
      yield eat(m`sigilToken: <*Keyword 'break' />`);
      yield eatMatch(m`label: <Identifier />`);
    }

    *ContinueStatement() {
      yield eat(m`sigilToken: <*Keyword 'continue' />`);
      yield eatMatch(m`label: <Identifier />`);
    }
  };
