import { re, spam as m } from '@bablr/boot';
import { eat, match, eatMatch, fail, o, exec, startSpan, endSpan } from '@bablr/helpers/grammar';
import { ReferenceTag } from '@bablr/agast-helpers/symbols';
import { get, getRoot, TagPath } from '@bablr/agast-helpers/path';
import * as BTree from '@bablr/agast-helpers/btree';
import { List } from '@bablr/helpers/productions';
import { printSource } from '@bablr/agast-helpers/tree';

export const noSemiStatements = ['Switch', 'Block', 'DoWhile'];
export const blockSemiStatements = ['DoWhile', 'While', 'For', 'If'];

let getTrailingBlock = (node) => {
  let rightStack = node.value.bounds[1];

  let i = 0;

  let result = null;
  do {
    result = BTree.getAt(i, rightStack);
    i++;
  } while (
    (result && result.property.value.node.value.flags.token) ||
    !result.property.value.node.type
  );

  return result?.property.value.node || null;
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

    *StatementList({ ctx, getState, matcher }) {
      let { getGapNode } = ctx;
      let stmt, trivia;
      while (yield match(re`/./s`)) {
        stmt = yield eat(m`${get('refMatcher', matcher)} <_Statement />`);
        let s = getState();
        let resultPath = TagPath.wrap(s.resultPath);
        if (
          resultPath?.previousSibling.tag.type === ReferenceTag &&
          resultPath?.previousSibling.tag.value.type === '#'
        ) {
          trivia = resultPath.inner;
        } else {
          trivia = (yield eatMatch(m`#: <__Trivia /[ \n\r\t]|\/\/|\/\*/ />`))?.node;
        }
        let newline = !!trivia && printSource(trivia, { getGapNode }).includes('\n');
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
      yield eatMatch(m`endToken*: <* ';' />`);
    }

    *FunctionDeclaration({ s }) {
      yield eat(m`sigilToken*: <*Keyword 'function' />`);
      yield* exec(s, m`<__FunctionExpression>`);
    }

    *Return() {
      yield eat(m`sigilToken*: <*Keyword 'return' />`);
      yield eatMatch(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken*: <* ';' />`);
    }

    *Throw() {
      yield eat(m`sigilToken*: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <_Expression />`);
      yield eatMatch(m`endToken*: <* ';' />`);
    }

    *Debugger() {
      yield eat(m`sigilToken*: <*Keyword 'debugger' />`);
      yield eatMatch(m`endToken*: <* ';' />`);
    }

    *VariableDeclaration({ props: { noSemi = false } }) {
      yield eat(m`sigilToken*: <*Keyword 'var' />`);
      yield* List({
        element: m`declarations[]$: <VariableDeclarator />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens: <* ',' />`,
      });
      if (!noSemi) {
        yield eatMatch(m`endToken*: <* ';' />`);
      }
    }

    *VariableDeclarator() {
      yield eat(m`receiver: <Identifier />`);
      if (yield match('=')) {
        yield eat(m`assignmentToken*: <* '=' />`);
        yield eat(m`value+$: <_Expression />`, o({ power: 32 }));
      } else {
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
        yield eatMatch(m`endToken*: <* ';' />`);
      } else {
        yield eat(m`endToken*: <* ';' />`);
      }
    }

    *Block() {
      yield eat(m`openToken*: <* '{' />`);
      yield startSpan('Bare', '}');
      yield eat(m`body[]$: <__StatementList />`);
      yield endSpan();
      yield eat(m`closeToken*: <* '}' />`);
    }

    *If() {
      yield eat(m`sigilToken*: <*Keyword 'if' />`);
      yield eat(m`openHeaderToken*: <* '(' />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken*: <* ')' />`);
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

      let catch_ = yield eatMatch(m`handler*: <Catch 'catch' />`);
      let finalizer = yield eatMatch(m`finalizer*: <Finally 'finally' />`);

      if (!(catch_ || finalizer)) yield fail();
    }

    *Catch() {
      yield eat(m`sigilToken*: <*Keyword 'catch' />`);
      yield eat(m`openArgumentsToken*: <* '(' />`);
      yield* List({
        element: m`params[]+$: <Identifier />`,
        allowTrailingSeparator: false,
        separator: m`#separatorTokens: <* ',' />`,
      });
      yield eat(m`closeArgumentsToken*: <* ')' />`);
      yield eat(m`body$: <Block />`);
    }

    *Finally() {
      yield eat(m`sigilToken*: <*Keyword 'finally' />`);
      yield eat(m`body$: <Block />`);
    }

    *While() {
      yield eat(m`sigilToken*: <*Keyword 'while' />`);
      yield eat(m`openHeaderToken*: <* '(' />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeHeaderToken*: <* ')' />`);
      yield eat(m`body$: <_Statement />`, o({ allowEmpty: false }));
    }

    *DoWhile() {
      yield eat(m`sigilToken*: <*Keyword 'do' />`);
      yield eat(m`body$: <_Statement />`);
      yield eat(m`footerSigilToken*: <*Keyword 'while' />`);
      yield eat(m`openFooterToken*: <* '(' />`);
      yield eat(m`test+$: <_Expression />`);
      yield eat(m`closeFooterToken*: <* ')' />`);
      yield eatMatch(m`endToken*: <* ';' />`);
    }

    *Switch() {
      yield eat(m`sigilToken*: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken*: <* '(' />`);
      yield eat(m`discriminant+$: <_Expression />`);
      yield eat(m`closeDiscriminantToken*: <* ')' />`);
      yield eat(m`openCasesToken*: <* '{' />`);
      while (yield eatMatch(m`cases[]$: <SwitchCase /(?:case|default)\b/ />`));
      yield eat(m`closeCasesToken*: <* '}' />`);
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
      yield eat(m`openHeaderToken*: <* '(' />`);
      if (!(yield eatMatch(m`init+$: <VariableDeclaration />`, o({ noSemi: true })))) {
        yield eatMatch(m`init+$: <_Expression />`, o({ noIn: true }));
      }
      let in_ = yield eatMatch(m`inToken*: <*Keyword 'in' />`);
      if (in_) {
        yield eatMatch(m`right+$: <_Expression />`);
        yield eat(m`closeHeaderToken*: <* ')' />`);
        yield eat(m`body$: <_Statement />`);
      } else {
        yield eat(m`testSeparatorToken*: <* ';' />`);
        yield eatMatch(m`test+$: <_Expression />`);
        yield eat(m`updateSeparatorToken*: <* ';' />`);
        yield eatMatch(m`update+$: <_Expression />`);
        yield eat(m`closeHeaderToken*: <* ')' />`);
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
