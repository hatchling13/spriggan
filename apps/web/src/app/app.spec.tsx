import { render } from '@solidjs/web';
import { flush } from 'solid-js';
import { App } from './app';

it('renders the service title', () => {
  const host = document.createElement('div');
  document.body.append(host);

  const dispose = render(() => <App />, host);

  try {
    expect(host.querySelector('h1')?.textContent).toBe('ordinare');
  } finally {
    dispose();
    host.remove();
  }
});

it.each([
  {
    name: 'formats JSON',
    source: '{"a":[1,2]}',
    indentation: 'two-spaces',
    output: '{\n  "a": [\n    1,\n    2\n  ]\n}\n',
    status: '정리했습니다.',
  },
  {
    name: 'uses the selected indentation',
    source: '{"a":1}',
    indentation: 'four-spaces',
    output: '{\n    "a": 1\n}\n',
    status: '정리했습니다.',
  },
  {
    name: 'handles empty input',
    source: ' \t\r\n',
    indentation: 'two-spaces',
    output: '',
    status: '입력이 비어 있습니다.',
  },
])('$name', async ({ source, indentation, output, status }) => {
  const host = document.createElement('div');
  document.body.append(host);
  const dispose = render(() => <App />, host);

  try {
    const input = host.querySelector<HTMLTextAreaElement>('#source')!;
    const select = host.querySelector<HTMLSelectElement>('#indentation')!;
    const form = host.querySelector('form')!;

    input.value = source;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    select.value = indentation;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flush();
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(host.querySelector('[role="status"]')?.textContent).toBe(status);
      expect(host.querySelector<HTMLTextAreaElement>('#output')?.value).toBe(
        output,
      );
    });
  } finally {
    dispose();
    host.remove();
  }
});

it('keeps invalid input and displays a parsing error', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dispose = render(() => <App />, host);

  try {
    const input = host.querySelector<HTMLTextAreaElement>('#source')!;
    const form = host.querySelector('form')!;

    input.value = '{';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        'JSON 문법을 확인해 주세요.',
      );
      expect(input.value).toBe('{');
      expect(host.querySelector<HTMLTextAreaElement>('#output')?.value).toBe(
        '',
      );
    });
  } finally {
    dispose();
    host.remove();
  }
});

it('uses JSONC mode for trailing commas', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dispose = render(() => <App />, host);

  try {
    const input = host.querySelector<HTMLTextAreaElement>('#source')!;
    const mode = host.querySelector<HTMLSelectElement>('#mode')!;
    const form = host.querySelector('form')!;

    input.value = '{"a":1,}';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    mode.value = 'jsonc';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    flush();
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(host.querySelector('[role="status"]')?.textContent).toBe(
        '정리했습니다.',
      );
      expect(host.querySelector<HTMLTextAreaElement>('#output')?.value).toBe(
        '{\n  "a": 1\n}\n',
      );
    });
  } finally {
    dispose();
    host.remove();
  }
});
