import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useWeb3 } from './hooks/useWeb3'
import Login from './pages/Login'
import Register from './pages/Register'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDashboard from './pages/PatientDashboard'
import VerifierDashboard from './pages/VerifierDashboard'
import Layout from './components/Layout'

function App() {
  const { account, isConnected, userRole, loading, isLoadingUserInfo } = useWeb3()

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            isConnected && account ? (
              loading || isLoadingUserInfo ? (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                </div>
              ) : (
                <>
                  {userRole === 'Doctor' && (
                    <Layout>
                      <DoctorDashboard />
                    </Layout>
                  )}
                  {userRole === 'Patient' && (
                    <Layout>
                      <PatientDashboard />
                    </Layout>
                  )}
                  {userRole === 'Verifier' && (
                    <Layout>
                      <VerifierDashboard />
                    </Layout>
                  )}
                  {!userRole && !isLoadingUserInfo && (
                    <Navigate to="/register" replace />
                  )}
                  {!userRole && isLoadingUserInfo && (
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">正在加载用户信息...</p>
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App

