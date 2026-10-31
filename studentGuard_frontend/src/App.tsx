import React from 'react';
import { ConfigProvider, Spin } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentListPage } from './pages/StudentListPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { PredictPage } from './pages/PredictPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { UsersPage } from './pages/UsersPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" tip="Đang tải dữ liệu hệ thống..." />
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="students" element={<StudentListPage />} />
              <Route path="students/:code" element={<StudentDetailPage />} />
              <Route path="predict" element={<PredictPage />} />
              <Route path="predictions" element={<PredictionHistoryPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};
export default App;

