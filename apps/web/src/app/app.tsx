import { Ordinare } from './ordinare/ordinare';

export const App = () => {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/ordinare') {
    document.title = 'ordinare · Spriggan';
    return <Ordinare />;
  }

  if (pathname === '/') {
    document.title = 'Spriggan';
    return (
      <main class="workspace">
        <header class="page-header">
          <h1>Spriggan</h1>
          <p>필요할 때 꺼내 쓰는 도구 모음</p>
        </header>

        <nav aria-label="도구 목록">
          <ul class="tool-grid">
            <li>
              <a class="tool-card" href="/ordinare">
                <h2>ordinare</h2>
                <p>JSON과 JSONC를 읽기 좋게 정리합니다.</p>
                <span>도구 열기 →</span>
              </a>
            </li>
          </ul>
        </nav>
      </main>
    );
  }

  document.title = '페이지를 찾을 수 없습니다 · Spriggan';
  return (
    <main class="workspace">
      <header class="page-header">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>도구 목록에서 사용할 도구를 골라 주세요.</p>
      </header>
      <a class="back-link" href="/">
        Spriggan 도구 목록으로
      </a>
    </main>
  );
};
