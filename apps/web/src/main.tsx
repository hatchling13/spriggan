import { render } from '@solidjs/web';

import { App } from './app/app';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);
