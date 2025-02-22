/* @macrome
 * @generatedby @bablr/macrome-generator-bablr
 * @generatedfrom ./function.macro.js#75953f11e6fb61cbb34be81c12b53b57bfeb7510
 * This file is autogenerated. Please do not edit it directly.
 * When editing run `npx macrome watch` then change the file this is generated from.
 */
import _applyDecs from "@babel/runtime/helpers/applyDecs2305";
import { i } from '@bablr/boot';
import { Node } from '@bablr/helpers/decorators';
export const mixin = Base => {
  let _initProto;
  return class ES3FunctionGrammar extends Base {
    static {
      [_initProto] = _applyDecs(this, [[Node, 2, "FunctionDeclaration"], [Node, 2, "FunctionExpression"], [Node, 2, "CallExpression"], [Node, 2, "NewExpression"], [Node, 2, "ReturnStatement"], [Node, 2, "ThrowStatement"]], [], 0, void 0, Base).e;
    }
    constructor(...args) {
      super(...args);
      _initProto(this);
    }
    *FunctionDeclaration() {
      yield i`eat(<~*Keyword 'function' /> 'sigilToken')`;
      yield i`eat(<*Identifier /> 'id')`;
      yield i`eat(<~*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'params[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <~*Punctuator ',' />
      })`;
      yield i`eat(<~*Punctuator ')' balancer /> 'closeArgumentsToken')`;
      yield i`eat(<BlockStatement /> 'body')`;
    }
    *FunctionExpression() {
      yield i`eat(<~*Keyword 'function' /> 'sigilToken')`;
      yield i`eatMatch(<*Identifier /> 'id')`;
      yield i`eat(<~*Punctuator '(' balanced=')' /> 'openParamsToken')`;
      yield i`eat(<List /> 'params[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <~*Punctuator ',' />
      })`;
      yield i`eat(<~*Punctuator ')' balancer /> 'closeParamsToken')`;
      yield i`eat(<BlockStatement /> 'body')`;
    }
    *CallExpression() {
      yield i`eat(<Expression /> 'callee')`;
      yield i`eat(<~*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'arguments[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <~*Punctuator ',' />
      })`;
      yield i`eat(<~*Punctuator ')' balancer /> 'closeArgumentsToken')`;
    }
    *NewExpression() {
      yield i`eat(<~*Keyword /> 'sigilToken')`;
      yield i`eat(<Expression /> 'callee')`;
      yield i`eat(<~*Punctuator '(' balanced=')' /> 'openArgumentsToken')`;
      yield i`eat(<List /> 'arguments[]' {
        element: <*Identifier />
        allowTrailingSeparator: false
        separator: <~*Punctuator ',' />
      })`;
      yield i`eat(<~*Punctuator ')' balancer /> 'closeArgumentsToken')`;
    }
    *ReturnStatement() {
      yield i`eat(<~*Keyword 'return' /> 'sigilToken')`;
      yield i`eatMatch(<Expression /> 'argument')`;
    }
    *ThrowStatement() {
      yield i`eat(<~*Keyword 'throw' /> 'sigilToken')`;
      yield i`eat(<Expression /> 'argument')`;
    }
  };
};