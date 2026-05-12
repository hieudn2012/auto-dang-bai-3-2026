import React from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { Flags } from '@/configs/LDProvider';

const LDFlagsViewer: React.FC = () => {
  const ldClient = useLDClient();
  const allFlags = (ldClient?.allFlags() || {
    required_login: false,
    authentication: {
      password: '',
      user: ''
    }
  }) as Flags;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'white',
      border: '1px solid #ccc',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      maxHeight: '400px',
      overflow: 'auto',
      fontSize: '12px'
    }}>
      <h4>LaunchDarkly Flags</h4>
      <pre>{JSON.stringify(allFlags, null, 2)}</pre>
    </div>
  );
};

export default LDFlagsViewer;
