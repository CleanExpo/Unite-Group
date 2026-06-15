import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../Hero';
import { defaultMetadata } from '../../../lib/metadata';

describe('internal CRM homepage hero', () => {
  it('points Phill at internal CRM work instead of public SaaS CTAs', () => {
    const html = renderToStaticMarkup(<Hero locale="en" />);

    expect(html).toContain('Private Founder CRM');
    expect(html).toContain('One entry point for the work that needs Phill');
    expect(html).toContain('Open command centre');
    expect(html).toContain('Manage clients');
    expect(html).toContain('/en/command-center');
    expect(html).toContain('/en/empire/clients');

    expect(html).not.toContain('Start free trial');
    expect(html).not.toContain('/en/register');
    expect(html).not.toContain('/en/services');
    expect(html).not.toContain('water-damage');
    expect(html).not.toContain('Karen runs');
  });

  it('keeps default metadata private and non-indexable', () => {
    expect(defaultMetadata.title).toMatchObject({
      default: 'Unite-Group — Internal CRM Command Centre',
    });
    expect(defaultMetadata.description).toContain('Private founder CRM');
    expect(defaultMetadata.keywords).toContain('internal CRM');
    expect(defaultMetadata.robots).toEqual({ index: false, follow: false });
  });
});
