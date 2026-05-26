import React, { useEffect, useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useNavigate } from 'react-router-dom';
import { Flags } from '@/configs/LDProvider';
import { routerPath } from '@/configs/router';
// import request from '@/utils/request';
// import { windowInstance } from '@/services/window';

const Splash: React.FC = () => {
  const ldClient = useLDClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // const checkMacId = async () => {
    //   try {
    //     const config = await windowInstance.api.loadMainConfig();
    //     await request.post(`/users/login`, {
    //       mac_id: config?.macId,
    //     });
    //     return true;
    //   } catch (error) {
    //     return false;
    //   }
    // }
    const checkAuthentication = async () => {
      try {
        // Wait a moment for LaunchDarkly to initialize
        // const isMacOk = await checkMacId();
        // if (!isMacOk) {
        //   return navigate(routerPath.contact_support);
        // }
        await new Promise(resolve => setTimeout(resolve, 1500));

        const allFlags = (ldClient?.allFlags() || {
          required_login: false,
          authentication: {
            password: '',
            user: ''
          }
        }) as Flags;

        // Check if login is required
        if (allFlags.required_login) {
          navigate(routerPath.login);
        } else {
          navigate(routerPath.profiles);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Fallback to login if there's an error
        navigate(routerPath.login);
      } finally {
        setIsLoading(false);
      }
    };


    checkAuthentication();
  }, [ldClient, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-dark-bg dark:via-dark-bgSecondary dark:to-dark-bg flex items-center justify-center">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-pulse">
            <i className="fas fa-rocket text-white text-3xl"></i>
          </div>

          {/* App Name */}
          <h1 className="text-4xl font-bold text-gray-800 dark:text-dark-text mb-4">
            Threads Tools
          </h1>

          {/* Loading Text */}
          <p className="text-gray-600 dark:text-dark-textSecondary mb-8">
            Initializing application...
          </p>

          {/* Loading Spinner */}
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-8 w-64 mx-auto">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be visible as we navigate away immediately
  return null;
};

export default Splash;
