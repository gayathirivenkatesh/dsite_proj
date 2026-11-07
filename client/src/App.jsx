import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';

import { AuthProvider } from './features/auth/AuthContext.jsx';
import { ToastProvider } from './features/toast/ToastContext.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
