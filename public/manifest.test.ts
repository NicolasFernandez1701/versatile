import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readPublicFile(fileName: string): string {
  return readFileSync(resolve(__dirname, fileName), 'utf-8');
}

describe('PWA manifest', () => {
  it('should include all required manifest fields', () => {
    const manifest = JSON.parse(readPublicFile('manifest.json'));

    expect(manifest.name).toBe('Versatile');
    expect(manifest.short_name).toBe('Versatile');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
  });

  it('should provide maskable icons at 192x192 and 512x512', () => {
    const manifest = JSON.parse(readPublicFile('manifest.json'));

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: '192x192',
          purpose: 'any maskable',
        }),
        expect.objectContaining({
          sizes: '512x512',
          purpose: 'any maskable',
        }),
      ]),
    );
  });
});

describe('index.html', () => {
  const html = readPublicFile('../index.html');

  it('should link the PWA manifest', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
  });

  it('should declare iOS web app capable meta tag', () => {
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('content="yes"');
  });

  it('should declare iOS status bar style meta tag', () => {
    expect(html).toContain('apple-mobile-web-app-status-bar-style');
  });
});
