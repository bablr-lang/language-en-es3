import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import * as language from '@bablr/language-en-es3';
import { buildTag, Context, AgastContext } from 'bablr';
import { debugEnhancers } from '@bablr/helpers/enhancers';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/agast-helpers/tree';

import { buildFullyQualifiedSpamMatcher } from '@bablr/agast-vm-helpers';

let enhancers = undefined;

const ctx = Context.from(AgastContext.create(), language, enhancers?.bablrProduction);

const buildJSTag = (type) => {
  const matcher = buildFullyQualifiedSpamMatcher({}, language.canonicalURL, type);
  return buildTag(ctx, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printPrettyCSTML(tree, { ctx });
};

describe.skip('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag('Program');

    it(';', () => {
      expect(print(js`;`)).toEqual(dedent`\n`);
    });
  });
});
