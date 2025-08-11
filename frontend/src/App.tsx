import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/services/api'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import AIConfig from '@/pages/AIConfig'

function App() {
  const { isAuthenticated, setUser, logout } = useAuthStore()
  
  // Restore user session on app start
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token && !useAuthStore.getState().user) {
      // Try to fetch user info if we have a token but no user data
      authApi.getCurrentUser()
        .then(user => {
          setUser(user)
        })
        .catch(error => {
          console.error('Failed to restore user session:', error)
          // If token is invalid, clear it
          logout()
        })
    }
  }, [])

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
      />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          isAuthenticated ? (
            <Layout>
              <Dashboard />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/chat" 
        element={
          isAuthenticated ? (
            <Layout>
              <Chat />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/ai-config" 
        element={
          isAuthenticated ? (
            <Layout>
              <AIConfig />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />

      {/* Default redirect */}
      <Route 
        path="/" 
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } 
      />
    </Routes>
  )
}

export default App