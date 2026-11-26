import { render } from '@solidjs/web';
import { App } from './app';

const originalUrl = window.location.href;
const originalTitle = document.title;

afterEach(() => {
  window.history.replaceState(null, '', originalUrl);
  document.title = originalTitle;
});

it('lists ordinare on the Spriggan home page', () => {
  window.history.replaceState(null, '', '/');
  const host = document.createElement('div');
  const dispose = render(() => <App />, host);

  try {
    expect(host.querySelector('h1')?.textContent).toBe('Spriggan');
    expect(document.title).toBe('Spriggan');
    const link = host.querySelector('a[href="/ordinare"]');
    expect(link?.querySelector('h2')?.textContent).toBe('ordinare');
    expect(host.querySelector('form')).toBeNull();
  } finally {
    dispose();
  }
});

it.each(['/ordinare', '/ordinare/', '/ordinare?mode=jsonc'])(
  'opens the formatter directly at %s',
  (url) => {
    window.history.replaceState(null, '', url);
    const host = document.createElement('div');
    const dispose = render(() => <App />, host);

    try {
      expect(host.querySelector('h1')?.textContent).toBe('ordinare');
      expect(document.title).toBe('ordinare · Spriggan');
      expect(host.querySelector('form')).not.toBeNull();
      expect(host.querySelector('a[href="/"]')?.textContent).toContain(
        'Spriggan 도구 목록',
      );
    } finally {
      dispose();
    }
  },
);

it('links unknown paths back to the tool list', () => {
  window.history.replaceState(null, '', '/unknown');
  const host = document.createElement('div');
  const dispose = render(() => <App />, host);

  try {
    expect(host.querySelector('h1')?.textContent).toBe(
      '페이지를 찾을 수 없습니다',
    );
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(host.querySelector('form')).toBeNull();
  } finally {
    dispose();
  }
});
