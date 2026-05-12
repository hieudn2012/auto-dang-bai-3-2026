import React, { useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useNavigate } from 'react-router-dom';
import { Flags } from '@/configs/LDProvider';
import { routerPath } from '@/configs/router';
import Button from '@/components/Button';
import Input from '@/components/Input';

const Login: React.FC = () => {
  const ldClient = useLDClient();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const allFlags = (ldClient?.allFlags() || {
    required_login: false,
    authentication: {
      user: '',
      password: ''
    }
  }) as Flags;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get authentication credentials from LaunchDarkly flags
      const authCredentials = allFlags.authentication;

      // Validate credentials
      if (username === authCredentials.user && password === authCredentials.password) {
        // Navigate to profiles page
        navigate(routerPath.manage_folder);
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            {/* Card Content */}
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-2xl p-8">
              {/* Header */}
              <div className="text-center mb-8">
                {/* Animated Logo */}
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full animate-spin-slow"></div>
                  <div className="absolute inset-2 bg-gradient-to-br from-purple-500 via-pink-400 to-red-400 rounded-full animate-spin-slow-reverse"></div>
                  <div className="absolute inset-4 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <i className="fas fa-rocket text-gray-700 text-3xl animate-pulse"></i>
                  </div>
                </div>
                
                {/* Title */}
                <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Threads Tools
                </h1>
                <p className="text-gray-600 text-sm">
                  Enter the digital universe
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Username Field */}
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                    <i className="fas fa-user mr-2"></i>
                    Username
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                      className="bg-white/80 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20 backdrop-blur-sm"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none"></div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                    <i className="fas fa-lock mr-2"></i>
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="bg-white/80 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20 backdrop-blur-sm"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none"></div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm backdrop-blur-sm animate-shake">
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      {error}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-200"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Launching...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Launch Dashboard
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-4 text-gray-500 text-xs">
                  <span className="flex items-center">
                    <i className="fas fa-shield-alt mr-1"></i>
                    Secure
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <i className="fas fa-lock mr-1"></i>
                    Private
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <i className="fas fa-bolt mr-1"></i>
                    Fast
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Decorative Elements */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes tilt {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-1deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-tilt {
          animation: tilt 10s infinite;
        }
        .animate-shake {
          animation: shake 0.5s;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin 12s linear infinite reverse;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
