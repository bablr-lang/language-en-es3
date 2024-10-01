import { i } from '@bablr/boot';
import { Node } from '@bablr/helpers/decorators';

export const mixin = (Base) =>
  class ES3VariablesGrammar extends Base {
    @Node
    *Identifier() {
      yield i`eat(/[a-zA-Z_$][a-zA-Z\d_$]*/)`;
    }

    @Node
    *VariableDeclaration() {
      yield i`eat(<*Keyword 'var' /> 'sigilToken')`;
      yield i`eat(<VariableDeclarator /> 'declarations[]')`;
      yield i`eat(<List /> 'declarations[]' {
      element: <VariableDeclarator />
      allowTrailingSeparator: false
      separator: <*Punctuator ',' />
    })`;
    }

    @Node
    *VariableDeclarator() {
      yield i`eat(<*Identifier /> 'id')`;
      yield i`eat(<*Punctuator '=' /> 'sigilToken')`;
      yield i`eat(<*Statement /> 'init')`;
    }
  };
