import { ToastContainer, toast as toastify } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom toast styles
const customToast = {
  success: (message: string, options?: any) => {
    return toastify.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'custom-toast-success',
      ...options,
    });
  },
  error: (message: string, options?: any) => {
    return toastify.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'custom-toast-error',
      ...options,
    });
  },
  info: (message: string, options?: any) => {
    return toastify.info(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'custom-toast-info',
      ...options,
    });
  },
  warning: (message: string, options?: any) => {
    return toastify.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'custom-toast-warning',
      ...options,
    });
  },
};

export { customToast as toast };
export { ToastContainer };
