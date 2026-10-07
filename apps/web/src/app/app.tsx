import { Effect } from 'effect';
import { createSignal } from 'solid-js';

const checkConnection = Effect.succeed('Effect connection completed');

export const App = () => {
  const [message, setMessage] = createSignal('');

  const execute = () => {
    const result = Effect.runSync(checkConnection);
    setMessage(result);
  };

  return (
    <main>
      <h1>Spriggan</h1>
      <p>유틸리티 서비스</p>
      <button onClick={execute}>연결 확인</button>
      <p>{message()}</p>
    </main>
  );
};
