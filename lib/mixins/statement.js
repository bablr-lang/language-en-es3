import { re, spam as m } from '@bablr/boot';
import {
  eat,
  match,
  eatMatch,
  fail,
  o,
  exec,
  startSpan,
  endSpan,
  startSubspan,
} from '@bablr/helpers/grammar';
import { get, getRoot } from '@bablr/agast-helpers/path';
import { printSource } from '@bablr/agast-helpers/tree';
import { reifyMatcherReferenceName } from '@bablr/agast-vm-helpers';
import { TreeNode } from '@bablr/agast-helpers/symbols';

export const noSemiStatements = ['Switch', 'Block', 'DoWhile'];
export const blockSemiStatements = ['DoWhile', 'While', 'For', 'If'];

let getTrailingBlock = (node, getGapNode) => {
  let result = null;
  switch (node.value.name) {
    case Symbol.for('If'):
      result = get('consequent', node) || get('alternate', node);
      break;
    case Symbol.for('While'):
    case Symbol.for('Switch'):
    case Symbol.for('For'):
      result = get('body', node);
      break;
  }
  return getGapNode(result);
};

const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    constructor() {
      super();
      this.emptyables = new Set([
        ...(this.emptyables || []),
        'StatementList',
        'ExpressionStatement',
      ]);
    }

    *StatementList({ getState, ctx, matcher }) {
      let { getGapNode } = ctx;
      let chr, stmt, trivia, sep;
      while ((chr = yield match(re`/[^;]|\g/s`))) {
        if (printSource(chr).trim() !== ';') {
          stmt = yield eat(m`${get('refMatcher', matcher)} <_Statement />`);
        }

        let s = getState();

        if (s.held) {
          trivia = s.held;
        }

        sep = yield eatMatch(m`#separatorTokens: <* ';' />`);

        let newline = !!trivia && printSource(trivia, { getGapNode }).includes('\n');
        let stmtRoot = getRoot(stmt.node);
        let allowSameLine =
          stmtRoot.type === TreeNode &&
          (noSemiStatements.includes(stmtRoot.value.name.description) ||
            (blockSemiStatements.includes(stmtRoot.value.name.description) &&
              getTrailingBlock(stmtRoot, getGapNode)?.value.name?.description === 'Block'));

        if (!allowSameLine && !(sep || newline)) break;
      }
      yield eatMatch(m`#separatorTokens: <* ';' />`);
    }

    *ExpressionStatement() {
      yield startSpan('Bare', ';');
      yield eat(m`expression+$: <_Expression />`);
      yield endSpan();
    }

    *FunctionDeclaration({ s }) {
      for (let instr of exec(s, m`<__FunctionExpression />`)) {
        if (reifyMatcherReferenceName(instr) === 'name') {
          yield eat(m`name$: <Identifier />`);
        } else {
          yield instr;
        }
      }
    }

    *Return() {
      yield eat(m`sigilToken*: <*Keyword 'return' />`);
      yield eatMatch(m`expression+$: <_Expression />`);
    }

    *Throw() {
      yield eat(m`sigilToken*: <*Keyword 'throw' />`);
      yield eat(m`expression+$: <_Expression />`);
    }

    *Debugger() {
      yield eat(m`sigilToken*: <*Keyword 'debugger' />`);
    }

    *VariableDeclaration({ props: { noSemi = false } }) {
      yield eat(m`sigilToken*: <*Keyword 'var' />`);

      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield startSubspan(null, ',');
        yield eat(m`declarations[]+$: <VariableDeclarator />`);
        yield endSpan();
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      if (sep && sep !== true) yield fail();

      // TODO
      // if (!noSemi) {
      //   yield eatMatch(m`endToken*: <* ';' />`);
      // }
    }

    *VariableDeclarator() {
      yield eat(m`receiver: <Identifier />`);
      if (yield match('=')) {
        yield eat(m`assignmentToken*: <* '=' />`);
        yield eat(m`value+$: <_Element />`);
      } else {
        yield eat(m`value+$: null`);
      }
    }

    *Statement({ getState }) {
      let s = getState();
      let res;
      if (s.done) {
        return;
      } else if (
        (res = yield match(
          re`/\{|(?:if|while|do|switch|for|function|try|return|continue|break|throw|debugger|var)\b/`,
        ))
      ) {
        let productions = {
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
      yield startSpan('Bare', ')');
      yield eat(m`test+$: <_Expression />`);
      yield endSpan();
      yield eat(m`closeHeaderToken*: <* ')' />`);
      yield eat(m`consequent$: <_Statement />`, o({}), o({ allowEmpty: false }));
      if (yield eatMatch(m`alternateSigilToken*: <*Keyword 'else' />`)) {
        yield eat(m`alternate$: <_Statement />`, o({}), o({ allowEmpty: false }));
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
      yield startSpan('Bare', ')');
      let sep = true;
      while (sep && !(yield match(re`/$/`))) {
        yield eat(m`params[]+$: <Identifier />`);
        sep = yield eatMatch(m`#separatorTokens: <* ',' />`);
      }
      if (sep && sep !== true) yield fail();
      yield endSpan();
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
      yield startSpan('Bare', ')');
      yield eat(m`test+$: <_Expression />`);
      yield endSpan();
      yield eat(m`closeHeaderToken*: <* ')' />`);
      yield eat(m`body$: <_Statement />`, o({ allowEmpty: false }));
    }

    *DoWhile() {
      yield eat(m`sigilToken*: <*Keyword 'do' />`);
      yield eat(m`body$: <_Statement />`);
      yield eat(m`footerSigilToken*: <*Keyword 'while' />`);
      yield eat(m`openFooterToken*: <* '(' />`);
      yield startSpan('Bare', ')');
      yield eat(m`test+$: <_Expression />`);
      yield endSpan();
      yield eat(m`closeFooterToken*: <* ')' />`);
    }

    *Switch() {
      yield eat(m`sigilToken*: <*Keyword 'switch' />`);
      yield eat(m`openDiscriminantToken*: <* '(' />`);
      yield startSpan('Bare', ')');
      yield eat(m`discriminant+$: <_Expression />`);
      yield endSpan();
      yield eat(m`closeDiscriminantToken*: <* ')' />`);
      yield eat(m`openCasesToken*: <* '{' />`);
      yield startSpan('Bare', '}');
      while (yield eatMatch(m`cases[]$: <SwitchCase /(?:case|default)\b/ />`));
      yield endSpan();
      yield eat(m`closeCasesToken*: <* '}' />`);
    }

    *SwitchCase({ literalValue }) {
      yield startSpan('Bare', ':');

      switch (printSource(literalValue)) {
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

      yield endSpan();

      yield eat(m`bodySeparatorToken*: <* ':' />`);
      while (!(yield match(re`/(?:case|default)\b|$/`))) {
        yield eat(m`statements[]$: <_Statement />`);
      }
    }

    *For() {
      yield eat(m`sigilToken*: <*Keyword 'for' />`);
      yield eat(m`openHeaderToken*: <* '(' />`);
      yield startSpan('Bare', ')');

      yield startSubspan(null, re`/;|in/`);
      if (!(yield eatMatch(m`init+$: <VariableDeclaration />`, o({ noSemi: true })))) {
        yield eatMatch(m`init+$: <_Expression />`, o({ noIn: true }));
      }
      yield endSpan();
      let in_ = yield eatMatch(m`inToken*: <*Keyword 'in' />`);
      if (in_) {
        yield eatMatch(m`right+$: <_Expression />`);
        yield endSpan();
        yield eat(m`closeHeaderToken*: <* ')' />`);
        yield eat(m`body$: <_Statement />`);
      } else {
        yield eat(m`testSeparatorToken*: <* ';' />`);
        yield startSpan('Bare', ';');
        yield eatMatch(m`test+$: <_Expression />`);
        yield endSpan();
        yield eat(m`updateSeparatorToken*: <* ';' />`);
        yield eatMatch(m`update+$: <_Expression />`);
        yield endSpan();
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
