import { spam } from '@bablr/boot';
import { dedent } from '@qnighy/dedent';
// eslint-disable-next-line import/no-unresolved
import * as language from '@bablr/language-en-es3';
import { buildTag, Context } from 'bablr';
import { debugEnhancers } from '@bablr/helpers/enhancers';
import { expect } from 'expect';
import { printPrettyCSTML } from '@bablr/helpers/tree';
import { buildIdentifier, buildString } from '@bablr/helpers/builders';

let enhancers = undefined;

const ctx = Context.from(language, enhancers?.bablrProduction);

const buildJSTag = (type) => {
  const matcher = spam`<$${buildString(language.canonicalURL)}:${buildIdentifier(type)} />`;
  return buildTag(ctx, matcher, undefined, { enhancers });
};

const print = (tree) => {
  return printPrettyCSTML(tree, { ctx });
};

describe('@bablr/language-en-es3', () => {
  describe('Program', () => {
    const js = buildJSTag('Program');

    it(';', () => {
      expect(print(js`;`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$>
          .:
          <$Program>
            body[]: []
            body[]: <$EmptyStatement />
            separatorTokens[]: []
            separatorTokens[]: <*Punctuator ';' />
          </>
        </>\n`);
    });

    it('true', () => {
      expect(print(js`true`)).toEqual(dedent`\
        <!0:cstml { bablrLanguage: 'https://bablr.org/languages/universe/es3' }>
        <$>
          .:
          <$Program>
            body[]: []
          </>
        </>\n`);
    });
  });
});
