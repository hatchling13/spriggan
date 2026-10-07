import { render } from '@solidjs/web';
import { App } from './app';

it('renders the service title', () => {
  const host = document.createElement('div');
  document.body.append(host);

  const dispose = render(() => <App />, host);

  try {
    expect(host.querySelector('h1')?.textContent).toBe('Spriggan');
  } finally {
    dispose();
    host.remove();
  }
});
