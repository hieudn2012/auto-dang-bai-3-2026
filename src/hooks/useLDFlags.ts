import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

export const useLDFlags = () => {
  const flags = useFlags();
  const ldClient = useLDClient();

  return {
    flags,
    getAllFlags: () => ldClient?.allFlags() || {},
    getFlag: (key: string, defaultValue?: any) => ldClient?.variation(key, defaultValue),
  };
};
