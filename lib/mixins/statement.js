import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o, exec } from '@bablr/helpers/grammar';
import { ReferenceTag } from '@bablr/agast-helpers/symbols';
import { get, getRoot } from '@bablr/agast-helpers/path';
import * as BTree from '@bablr/agast-helpers/btree';
import { List } from '@bablr/helpers/productions';
import { printSource } from '@bablr/agast-helpers/tree';

export const noSemiStatements = ['Switch', 'Block', 'DoWhile'];
export const blockSemiStatements = ['DoWhile', 'While', 'For', 'If'];

let getTrailingBlock = (node) => {
  let rightStack = node.bounds[1];

  let i = BTree.getSize(rightStack);

  let result = null;
  do {
    i--;
    result = BTree.getAt(i, rightStack);
  } while ((result && result.node.flags.token) || !result.node.type);

  return result?.node || null;
};

const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    constructor() {
      super();
      this.emptyables = new Set([
        ...(this.emptyables || []),
        'StatementList',
        'ExpressionStatement',
        'Statement',
        'Empty',
      ]);
    }

    *StatementList({ getState, matcher }) {
      let stmt, trivia;
      while (yield match(re`/./s`)) {
        stmt = yield eat(m`${get('refMatcher', matcher)} <_Statement />`);
        let s = getState();
        if (
          s.resultPath?.previousSibling.tag.type === ReferenceTag &&
          s.resultPath?.previousSibling.tag.value.type === '#'
        ) {
          trivia = s.resultPath.inner;
        } else {
          trivia = (yield eatMatch(m`#: <__Trivia /[ \n\r\t]|\/\/|\/\*/ />`))?.node;
        }
        let newline = !!trivia && printSource(trivia).includes('\n');
        let stmtRoot = getRoot(stmt.node);
        let allowSameLine =
          noSemiStatements.includes(stmtRoot.type.description) ||
          (blockSemiStatements.includes(stmtRoot.type.description) &&
            getTrailingBlock(stmtRoot)?.type?.description === 'Block');

        if (!allowSameLine && !(get('endToken', stmtRoot) || newline)) break;
      }
    }

    *ExpressionStatement() {
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
    }

    *FunctionDeclaration({ s }) {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield* exec(s, m`<__FunctionExpression>`);
    }

    *Return() {
      yield eat(m`sigilToken*: <*Keyword 'return' />`);
      yield eatMatch(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
    }

    *Throw() {
      yield eat(m`sigilToken*: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
    }

    *Debugger() {
      yield eat(m`sigilToken*: <*Keyword 'debugger' />`);
      yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
    }

    *VariableDeclaration({ props: { noSemi = false } }) {
      yield eat(m`sigilToken*: <*Keyword 'var' />`);
      yield* List({
        element: m`declarations[]$: <VariableDeclarator />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens[]: <* ',' />`,
      });
      if (!noSemi) {
        yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
      } else {
        yield eat(m`endToken*: null`, null, o({ bind: true }));
      }
    }

    *VariableDeclarator() {
      yield eat(m`receiver: <Identifier />`);
      if (yield match('=')) {
        yield eat(m`assignmentToken*: <* '=' />`);
        yield eat(m`value+$: <_Expression />`, o({ power: 32 }));
      } else {
        yield eat(m`assignmentToken*: null`);
        yield eat(m`value+$: null`);
      }
    }

    *Statement({ getState, props: { allowEmpty = true } }) {
      let s = getState();
      let res;
      if (s.done && allowEmpty) {
        yield eat(m`<Empty />`, o({ allowEmpty }));
      } else if (
        (res = yield match(
          re`/;|\{|(?:if|while|do|switch|for|function|try|return|continue|break|throw|debugger|var)\b/`,
        ))
      ) {
        let productions = {
          ';': m`<Empty />`,
          '{': m`<Block  />`,
          if: m`<If />`,
          while: m`<While />`,
          do: m`<DoWhile />`,
          switch: m`<Switch />`,
          for: m`<For />`,
          function: m`<FunctionDeclaration />`,
          try: m`<TryCatch />`,
          return: m`<Return />`,
          continue: m`<Continue />`,
          break: m`<Break />`,
          throw: m`<Throw />`,
          debugger: m`<Debugger />`,
          var: m`<VariableDeclaration />`,
        };
        yield eat(productions[printSource(res)]);
      } else if (yield eatMatch(m`<LabeledStatement />`)) {
      } else {
        yield eat(m`<ExpressionStatement />`);
      }
    }

    *Empty({ props: { allowEmpty = true } }) {
      if (allowEmpty) {
        yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
      } else {
        yield eat(m`endToken*: <* ';' />`, null, o({ bind: true }));
      }
    }

    *Block() {
      yield eat(m`openToken*: <* '{' { balanced: '}' } />`);
      yield eat(m`body[]$: <__StatementList />`);
      yield eat(m`closeToken*: <* '}' { balancer: true } />`);
    }

    *If() {
      yield eat(m`sigilToken*: <*Keyword 'if' />`);
      yield eat(m`openHeaderToken*: <* '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken*: <* ')' { balancer: true } />`);
      yield eat(m`consequent$: <_Statement />`, o({}), o({ allowEmpty: false }));
      if (yield eatMatch(m`alternateSigilToken*: <*Keyword 'else' />`)) {
        yield eat(m`consequent$: <_Statement />`, o({}), o({ allowEmpty: false }));
      } else {
        yield eat(m`alternate$: null`);
      }
    }

    *TryCatch() {
      yield eat(m`sigilToken*: <*Keyword 'try' />`);
      yield eat(m`block$: <Block />`);

      let catch_ = yield eatMatch(m`handler*: <Catch 'catch' />`, o({}), o({ bind: true }));
      let finalizer = yield eatMatch(
        m`finalizer*: <Finally 'finally' />`,
        o({}),
        o({ bind: true }),
      );

      if (!(catch_ || finalizer)) yield fail();
    }

    *Catch() {
      yield eat(m`sigilToken*: <*Keyword 'catch' />`);
      yield eat(m`openArgumentsToken*: <* '(' { balanced: ')' } />`);
      yield* List({
        element: m`params[]+$: <Identifier />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens[]: <* ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <* ')' { balancer: true } />`);
      yield eat(m`body$: <Block />`);
    }

    *Finally() {
      yield eat(m`sigilToken*: <*Keyword 'finally' />`);
      yield eat(m`body$: <Block />`);
    }

    *While() {
      yield eat(m`sigilToken*: <*Keyword 'while' />`);
      yield eat(m`openHeaderToken*: <* '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken*: <* ')' { balancer: true } />`);
      yield eat(m`body$: <_Statement />`, o({ allowEmpty: false }));
    }

    *DoWhile() {
      yield eat(m`sigilToken*: <*Keyword 'do' />`);
      yield eat(m`body$: <_Statement />`);
      yield eat(m`footerSigilToken*: <*Keyword 'while' />`);
      yield eat(m`openFooterToken*: <* '(' { balanced: ')' } />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeFooterToken*: <* ')' { balancer: true } />`);
      yield eatMatch(m`endToken*: <* ';' />`, null, o({ bind: true }));
    }

    *Switch() {
      yield eat(m`sigilToken*: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken*: <* '(' { balanced: ')' } />`);
      yield eat(m`discriminant+$: <_Expression />`);
      yield eat(m`closeDiscriminantToken*: <* ')' { balancer: true } />`);
      yield eat(m`openCasesToken*: <* '{' { balanced: '}' } />`);
      while (yield eatMatch(m`cases[]*: <SwitchCase /(?:case|default)\b/ />`));
      yield eat(m`closeCasesToken*: <* '}' { balancer: true } />`);
    }

    *SwitchCase({ literalValue }) {
      switch (printSource(literalValue.value)) {
        case 'case':
          yield eat(m`sigilToken*: <*Keyword 'case' />`);
          yield eat(m`test+$: <_Expression />`);
          break;

        case 'default':
          yield eat(m`sigilToken*: <*Keyword 'default' />`);
          yield eat(m`test+$: null`);
          break;

        default:
          yield fail();
          break;
      }

      yield eat(m`bodySeparatorToken*: <* ':' />`);
      while (!(yield match(re`/(?:case|default)\b|$/`))) {
        yield eat(m`statements[]$: <_Statement />`);
      }
    }

    *For() {
      yield eat(m`sigilToken*: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken*: <* '(' { balanced: ')' } />`);
      if (!(yield eatMatch(m`init+$: <VariableDeclaration />`, o({ noSemi: true })))) {
        yield eatMatch(m`init+$: <_Expression />`, o({ noIn: true }));
      }
      let in_ = yield eatMatch(m`inToken*: <*Keyword 'in' />`, o({}), o({ bind: true }));
      if (in_) {
        yield eatMatch(m`right+$: <_Expression />`);
        yield eat(m`closeHeaderToken*: <* ')' { balancer: true } />`);
        yield eat(m`body$: <_Statement />`);
      } else {
        yield eat(m`testSeparatorToken*: <* ';' />`);
        yield eatMatch(m`test+$: <_Expression />`);
        yield eat(m`updateSeparatorToken*: <* ';' />`);
        yield eatMatch(m`update+$: <_Expression />`);
        yield eat(m`closeHeaderToken*: <* ')' { balancer: true } />`);
        yield eat(m`body$: <_Statement />`);
      }
    }

    *LabeledStatement() {
      yield eat(m`label*: <Identifier />`);
      yield eat(m`sigilToken*: <* ':' />`);
      yield eat(m`body$: <*Statement />`);
    }

    *Break() {
      yield eat(m`sigilToken*: <*Keyword 'break' />`);
      yield eatMatch(m`label*: <Identifier />`);
    }

    *Continue() {
      yield eat(m`sigilToken*: <*Keyword 'continue' />`);
      yield eatMatch(m`label*: <Identifier />`);
    }
  };

export default mixin;
