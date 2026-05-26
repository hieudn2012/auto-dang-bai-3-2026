import React from 'react';

const ContactSupport: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-purple-200 dark:from-dark-bg dark:via-dark-bgSecondary dark:to-dark-bg">
      <div className="bg-white dark:bg-dark-bgSecondary p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-3">
            <i className="fas fa-headset text-white text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Contact Support</h2>
          <p className="text-gray-500 dark:text-gray-300 text-center text-sm">
            Your Mac ID is not registered.<br />Please contact our support team for assistance.
          </p>
        </div>
        <div className="w-full">
          <a
            href="mailto:hieu.dn2012@gmail.com"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-center transition mb-3"
          >
            Email Support
          </a>
          <a
            href="https://t.me/hieudn2012"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg text-center transition"
          >
            Telegram Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
