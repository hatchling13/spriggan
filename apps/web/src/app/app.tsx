import { beautify, type BeautifyOptions } from '@spriggan/ordinare';
import { Effect, Option } from 'effect';
import { createSignal } from 'solid-js';

const indentations = [
  { value: 'two-spaces', label: '공백 2칸' },
  { value: 'four-spaces', label: '공백 4칸' },
  { value: 'tabs', label: '탭' },
] as const;

const example =
  '{"name":"Spriggan","tools":["ordinare"],"settings":{"enabled":true}}';

export const App = () => {
  const [source, setSource] = createSignal(example);
  const [mode, setMode] = createSignal<BeautifyOptions['mode']>('json');
  const [indentation, setIndentation] =
    createSignal<NonNullable<BeautifyOptions['indentation']>>('two-spaces');
  const [output, setOutput] = createSignal('');
  const [error, setError] = createSignal('');
  const [status, setStatus] = createSignal('');
  const [running, setRunning] = createSignal(false);

  const resetResult = () => {
    setOutput('');
    setError('');
    setStatus('');
  };

  const execute = async (event: SubmitEvent) => {
    event.preventDefault();
    resetResult();
    setRunning(true);

    try {
      await Effect.runPromise(
        beautify(source(), {
          mode: mode(),
          indentation: indentation(),
        }).pipe(
          Effect.match({
            onSuccess: (result) =>
              Option.match(result, {
                onNone: () => setStatus('입력이 비어 있습니다.'),
                onSome: (text) => {
                  setOutput(text);
                  setStatus('정리했습니다.');
                },
              }),
            onFailure: (failure) =>
              setError(
                failure._tag === 'ParseError'
                  ? `${mode().toUpperCase()} 문법을 확인해 주세요.`
                  : failure.message,
              ),
          }),
        ),
      );
    } catch {
      setError('처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <main class="workspace">
      <header class="page-header">
        <h1>ordinare</h1>
        <p>JSON을 읽기 좋게 정리해볼게요</p>
      </header>

      <form onSubmit={execute}>
        <fieldset disabled={running()}>
          <legend>JSON 정리</legend>

          <div class="toolbar">
            <label for="mode">
              입력 형식
              <select
                id="mode"
                value={mode()}
                onChange={(event) => {
                  setMode(
                    event.currentTarget.value === 'jsonc' ? 'jsonc' : 'json',
                  );
                  resetResult();
                }}
              >
                <option value="json">JSON</option>
                <option value="jsonc">JSONC</option>
              </select>
            </label>

            <label for="indentation">
              들여쓰기
              <select
                id="indentation"
                value={indentation()}
                onChange={(event) => {
                  const selected = indentations.find(
                    (option) => option.value === event.currentTarget.value,
                  );
                  if (selected) {
                    setIndentation(selected.value);
                    resetResult();
                  }
                }}
              >
                {indentations.map((option) => (
                  <option value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button type="submit" class="primary-button">
              {running() ? '정리 중…' : '정리하기'}
            </button>
          </div>

          <p class="prototype-note" id="prototype-note">
            초안: 주석·빈 줄 보존과 너비 조정은 준비 중입니다. 현재 출력에는
            주석이 포함되지 않습니다.
          </p>

          <div class="editors">
            <div class="editor">
              <label for="source">입력</label>
              <textarea
                id="source"
                value={source()}
                onInput={(event) => {
                  setSource(event.currentTarget.value);
                  resetResult();
                }}
                aria-describedby="prototype-note"
                placeholder="JSON 또는 JSONC를 입력하세요."
                spellcheck={false}
                autocapitalize="off"
                autocomplete="off"
              />
            </div>

            <div class="editor">
              <label for="output">결과</label>
              <textarea
                id="output"
                value={output()}
                readonly
                placeholder="정리한 결과가 여기에 표시됩니다."
                spellcheck={false}
              />
            </div>
          </div>
        </fieldset>

        <p
          class={['feedback', { error: Boolean(error()) }]}
          role={error() ? 'alert' : 'status'}
        >
          {error() || status()}
        </p>
      </form>
    </main>
  );
};
