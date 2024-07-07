import { i } from '@bablr/boot';
import { AllowEmpty, CoveredBy, Node } from '@bablr/helpers/decorators';

export const mixin = (Base) =>
  class ES3StatementGrammar extends Base {
    @Node
    *Program() {
      yield i`eat(<StatementList> 'body[]')`;
    }

    *StatementList() {
      do {
        yield i`eat(<Statement>)`;
      } while (yield i`eatMatch(<*~Punctuator ';'>)`);
    }

    @Node
    *ExpressionStatement() {
      yield i`eat(<Expression> 'expression')`;
    }

    *Statement() {
      yield i`eat(<Any> null [
        <EmptyStatement /$/>
        <BlockStatement '{'>
        <IfStatement 'if'>
        <WhileStatement 'while'>
        <DoWhileStatement 'do'>
        <SwitchStatement 'switch'>
        <LoopStatement 'for'>
        <ExpressionStatement>
      ])`;
    }

    @CoveredBy('Statement')
    @AllowEmpty
    @Node
    *EmptyStatement() {}

    @CoveredBy('Statement')
    @Node
    *BlockStatement() {
      yield i`eat(<*Punctuator '{' balanced='}'> 'openToken')`;
      yield i`eat(<StatementList> 'body[]')`;
      yield i`eat(<*Punctuator '}' balancer> 'closeToken')`;
    }

    @CoveredBy('Statement')
    @Node
    *IfStatement() {
      yield i`eat(<*Keyword 'if'> 'sigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openHeaderToken')`;
      yield i`eat(<Expression> 'test')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeHeaderToken')`;
      yield i`eat(<Statement> 'consequent')`;
      if (yield i`eatMatch(<*Keyword 'else'> 'alternateSigilToken')`) {
        yield i`eat(<Statement> 'alternate')`;
      } else {
        yield i`eat(null 'alternate')`;
      }
    }

    @CoveredBy('Statement')
    @Node
    *WhileStatement() {
      yield i`eat(<*Keyword 'while'> 'sigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openHeaderToken')`;
      yield i`eat(<Expression> 'test')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeHeaderToken')`;
      yield i`eat(<Statement> 'body')`;
    }

    @CoveredBy('Statement')
    @Node
    *DoWhileStatement() {
      yield i`eat(<*Keyword 'do'> 'sigilToken')`;
      yield i`eat(<Statement> 'body')`;
      yield i`eat(<*Keyword 'while'> 'footerSigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openFooterToken')`;
      yield i`eat(<Expression> 'test')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeFooterToken')`;
    }

    @CoveredBy('Statement')
    @Node
    *SwitchStatement() {
      yield i`eat(<*Keyword 'switch'> 'sigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openDiscriminantToken')`;
      yield i`eat(<Expression> 'discriminant')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeDiscriminantToken')`;
      yield i`eat(<*Punctuator '{' balanced='}'> 'openCasesToken')`;
      yield i`eatMatch(<SwitchCase /(case|default)\b/> 'cases[]')`;
      yield i`eat(<*Punctuator '}' balancer> 'closeCasesToken')`;
    }

    @Node
    *SwitchCase({ intrinsicValue, ctx }) {
      switch (ctx.sourceTextFor(intrinsicValue)) {
        case 'case':
          yield i`eat(<*Keyword 'case'> 'sigilToken')`;
          yield i`eat(<Expression> 'condition')`;
          break;

        case 'default':
          yield i`eat(<*Keyword 'default'> 'sigilToken')`;
          yield i`eat(null 'condition')`;
          break;

        default:
          yield i`fail()`;
          break;
      }

      yield i`eat(<*Punctuator ':'> 'bodySeparatorToken')`;
      while (yield i`match(/./)`) yield i`eat(<Statement> 'statements[]')`;
    }

    *LoopStatement() {
      // This might have been called ForStatement, but that name was already in use
      throw new Error('not implemented');
    }

    @CoveredBy('Statement')
    @Node
    *ForStatement() {
      yield i`eat(<*Keyword 'for'> 'sigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openHeaderToken')`;
      if (!(yield i`eatMatch(<VariableDeclaration> 'init')`)) {
        yield i`eatMatch(<Expression> 'init')`;
      }
      yield i`eat(<*Punctuator ';'> 'testSeparatorToken')`;
      yield i`eatMatch(<Expression> 'test')`;
      yield i`eat(<*Punctuator ';'> 'updateSeparatorToken')`;
      yield i`eatMatch(<Expression> 'update')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeHeaderToken')`;
      yield i`eat(<Statement> 'body')`;
    }

    @CoveredBy('Statement')
    @Node
    *ForInStatement() {
      yield i`eat(<*Keyword 'for'> 'sigilToken')`;
      yield i`eat(<*Punctuator '(' balanced=')'> 'openHeaderToken')`;
      if (!(yield i`eatMatch(<VariableDeclaration> 'left')`)) {
        yield i`eatMatch(<Expression> 'left')`;
      }
      yield i`eat(<*Keyword 'in'> 'iterationSigilToken')`;
      yield i`eatMatch(<Expression> 'right')`;
      yield i`eat(<*Punctuator ')' balancer> 'closeHeaderToken')`;
      yield i`eat(<Statement> 'body')`;
    }

    @CoveredBy('Statement')
    @Node
    *LabeledStatement() {
      yield i`eat(<*Identifier> 'label')`;
      yield i`eat(<*Puncuator ':'> 'sigilToken')`;
      yield i`eat(<*Statement> 'body')`;
    }

    @CoveredBy('Statement')
    @Node
    *BreakStatement() {
      yield i`eat(<*Keyword 'break'> 'sigilToken')`;
      yield i`eatMatch(<*Identifier> 'label')`;
    }

    @CoveredBy('Statement')
    @Node
    *ContinueStatement() {
      yield i`eat(<*Keyword 'continue'> 'sigilToken')`;
      yield i`eatMatch(<*Identifier> 'label')`;
    }
  };
