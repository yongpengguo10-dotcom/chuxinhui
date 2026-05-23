
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

function showBootError(error: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  root.innerHTML = `
    <div style="min-height:100%;box-sizing:border-box;padding:32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff7ed;color:#111827;">
      <h1 style="margin:0 0 12px;font-size:20px;">页面启动失败</h1>
      <p style="margin:0 0 16px;color:#9a3412;font-weight:700;">前端运行时出现错误，下面是浏览器捕获到的信息：</p>
      <pre style="white-space:pre-wrap;padding:16px;border:1px solid #fed7aa;border-radius:10px;background:#fff;font-size:13px;line-height:1.6;">${message}</pre>
    </div>
  `;
}

window.addEventListener("error", event => showBootError(event.error ?? event.message));
window.addEventListener("unhandledrejection", event => showBootError(event.reason));

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (error) {
  showBootError(error);
}
  
