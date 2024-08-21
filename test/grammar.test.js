import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import * as language from '@bablr/language-en-es3';
import { buildTag } from 'bablr';
import { debugEnhancers } from '@bablr/helpers/enhancers';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/agast-helpers/tree';

let enhancers = undefined;

describe.skip('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = (...args) =>
      printPrettyCSTML(buildTag(language, 'Program', undefined, enhancers)(...args));

    it(';', () => {
      expect(js`;`).toEqual(dedent`\n`);
    });
  });
});
