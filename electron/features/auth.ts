import nodeMachineId from 'node-machine-id';

// get macID
export const getMacID = async () => {
  const mac = nodeMachineId.machineIdSync(true);
  return mac;
}

// get OS
export const getOS = () => {
  const platform = process.platform;
  if (platform === 'win32') {
    return 'Windows';
  } else if (platform === 'darwin') {
    return 'macOS';
  } else if (platform === 'linux') {
    return 'Linux';
  } else {
    return 'Unknown';
  }
}