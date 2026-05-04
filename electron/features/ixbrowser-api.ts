import axios from "axios";
import { get } from "lodash";

const BASE_URL = 'http://127.0.0.1:53200';

const PAGINATIONS = {
  page: 1,
  limit: 500
}

interface OpenedProfile {
  debugging_address: string;
  debugging_port: number;
  profile_id: number;
  pid: number;
  open_time: string;
  ws: string;
  webdriver: string;
}

interface Group {
  title: string;
  id: number;
}

interface OpenedProfileData {
  debugging_address: string;
  debugging_port: number;
  profile_id: number;
  pid: number;
  ws: string;
  gateway: string;
  webdriver: string;
}

interface ProfileData {
  profile_id: number;
  site_url: string;
  name: string;
  note: string;
  color: string;
  username: string;
  password: string;
  tfa_secret: string;
  last_open_time: number;
  group_id: number;
  group_name: string;
  tag_id: string;
  tag_name: string;
  proxy_mode: number;
  proxy_id: number;
  proxy_type: string;
  proxy_ip: string;
  proxy_port: string;
  real_ip: string;
  cache_path: string;
}

export interface ProxyInfo {
  proxy_mode: number;
  proxy_check_line: string;
  proxy_type: string;
  proxy_ip: string;
  proxy_port: string;
  proxy_user: string;
  proxy_password: string;
}

// get group list
export const getGroupList = async (): Promise<Group[]> => {
  const response = await axios.post(`${BASE_URL}/api/v2/group-list`, PAGINATIONS);
  return get(response, 'data.data.data', []);
};

// /api/v2/profile-open
export const openProfile = async (profileId: number): Promise<OpenedProfileData> => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-open`, {
    profile_id: profileId
  });
  return response.data;
};

// /api/v2/profile-close
export const closeProfile = async (profileId: number) => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-close`, {
    profile_id: profileId
  });
  return response.data;
};

// /api/v2/profile-delete
export const deleteProfile = async (profileId: number) => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-delete`, {
    profile_id: profileId
  });
  return response.data;
};

// /api/v2/profile-list
export const getProfileList = async (groupId: number): Promise<ProfileData[]> => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-list`, {
    ...PAGINATIONS,
    group_id: groupId
  });
  return get(response, 'data.data.data', []);
};

// /api/v2/native-client-profile-opened-list
export const getOpenedProfileList = async (): Promise<OpenedProfile[]> => {
  const response = await axios.post(`${BASE_URL}/api/v2/native-client-profile-opened-list`);
  return response.data.data;
};

// chang group for profile
// /api/v2/profile-update
export const updateProfileGroup = async (profileId: number, groupId: number) => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-update`, {
    profile_id: profileId,
    group_id: groupId
  });
  return response.data;
};

// /api/v2/profile-update-proxy-for-custom-proxy
export const updateProfileProxyForCustomProxy = async (profileId: number, proxyInfo: ProxyInfo) => {
  const response = await axios.post(`${BASE_URL}/api/v2/profile-update-proxy-for-custom-proxy`, {
    profile_id: profileId,
    proxy_info: proxyInfo
  });
  return response.data;
};
