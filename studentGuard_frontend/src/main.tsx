import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.innerHTML = `
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background: #f1f5f9;
    font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
  }

  /* Smooth, refined horizontal scroll & sticky column divider for Student Directory */
  .sg-directory-table .ant-table-content {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  .sg-directory-table .ant-table-content::-webkit-scrollbar {
    height: 7px;
  }
  .sg-directory-table .ant-table-content::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 999px;
  }
  .sg-directory-table .ant-table-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
  .sg-directory-table .ant-table-content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Soften sticky column edge shadows and add a clean 1px divider line */
  .sg-directory-table .ant-table-cell-fix-right-first::after {
    box-shadow: inset -12px 0 14px -10px rgba(15, 23, 42, 0.08) !important;
    border-right: 1px solid #e2e8f0;
  }
  .sg-directory-table .ant-table-cell-fix-left-last::after {
    box-shadow: inset 12px 0 14px -10px rgba(15, 23, 42, 0.08) !important;
    border-left: 1px solid #e2e8f0;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
