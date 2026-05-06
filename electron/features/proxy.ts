import { loadMainConfig } from "./common";
import { ProxyInfo } from "./ixbrowser-api";
import { updateProfileProxyForCustomProxy } from "./ixbrowser-api";

export const updateProfileProxy = async (profileIds: number[], data: string) => {
  // trim and split by \n
  const proxies = data.trim().split("\n").filter(proxy => proxy.trim().length > 0);

  if (proxies.length === 0 || profileIds.length === 0) {
    console.log('No proxies or profiles provided');
    return;
  }

  console.log(`Distributing ${proxies.length} proxies to ${profileIds.length} profiles`);

  // Phân phối proxy: mỗi user sẽ lấy proxy theo index
  for (let i = 0; i < profileIds.length; i++) {
    const profileId = profileIds[i];

    // Tính proxy index: user 101 sẽ lấy proxy index 0, user 102 lấy proxy 1, ...
    const proxyIndex = i % proxies.length;
    const proxyString = proxies[proxyIndex];

    // Parse proxy string: sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s
    const parts = proxyString.split(':');

    // sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s
    if (parts.length >= 4) {
      const proxyInfo: ProxyInfo = {
        proxy_mode: 2, // custom proxy
        proxy_check_line: 'global_line',
        proxy_type: 'http', // protocol
        proxy_ip: parts[0], // server
        proxy_port: parts[1], // port
        proxy_user: parts[2], // username
        proxy_password: parts[3], // password
      };

      try {
        await updateProfileProxyForCustomProxy(profileId, proxyInfo);
        console.log(`✅ Updated proxy for profile ${profileId}: ${parts[0]}:${parts[1]}`);
      } catch (error) {
        console.error(`❌ Failed to update proxy for profile ${profileId}:`, error);
      }
    } else {
      console.error(`❌ Invalid proxy format: ${proxyString}`);
    }
  }

  console.log('✅ Proxy update completed');
};

// update random proxy for profile
export const updateRandomProxyForProfile = async (profileId: number) => {
  const config = await loadMainConfig();
  const proxies = config?.proxy?.trim() || '';

  // split by \n
  const proxyList = proxies.split('\n').filter(proxy => proxy.trim().length > 0);

  if (!proxyList || proxyList.length === 0) {
    console.error('❌ No proxies available in config');
    return;
  }

  const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
  const parts = randomProxy.split(':');
  const proxyInfo: ProxyInfo = {
    proxy_mode: 2, // custom proxy
    proxy_check_line: 'global_line',
    proxy_type: 'http', // protocol
    proxy_ip: parts[0], // server
    proxy_port: parts[1], // port
    proxy_user: parts[2], // username
    proxy_password: parts[3], // password
  };

  // update profile proxy
  await updateProfileProxyForCustomProxy(profileId, proxyInfo);
  console.log(`✅ Updated proxy for profile ${profileId}: ${proxyInfo.proxy_ip}:${proxyInfo.proxy_port}`);
};

