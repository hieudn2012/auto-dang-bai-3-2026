import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { useGetNativeClientProfileOpenedList, useGetProfiles } from "@/services/profiles";
import { windowInstance } from "@/services/window";
import { UserInfo } from "electron/types";
import { map } from "lodash";
import { useState } from "react";

const shortName = (name: string) => {
  const maxLength = 10;
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength / 2)}...${name.substring(name.length - maxLength / 2)}`;
}

type UserMap = {
  [key: string]: {
    profile_id: number;
    folder: number;
  }[];
}

const Profiles = () => {
  const [{ data }] = useGetProfiles();
  const [{ data: openedList, refetch }] = useGetNativeClientProfileOpenedList();
  const [userMap, setUserMap] = useState<UserMap>({});
  const [open, setOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState({ cap: '', link: '', path: '' });

  const handleOpenProfile = async (id: number) => {
    await windowInstance.api.threadsProfileOpen(id);
  }

  const handlePost = ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => {
    windowInstance.api.threadsPost({ wsUrl, username, folder });
  }

  const handleRandomFolder = async (profile_id: number) => {
    const { name, path } = await windowInstance.api.randomFolderNotUsed();
    setUserMap(prev => ({ ...prev, [profile_id]: { profile_id, name, path } }));
  }

  const handleOpenFolder = async (path: string) => {
    await windowInstance.api.openFolder(path);
  }

  const handleShowInfo = async (path: string) => {
    const { cap, link } = await windowInstance.api.getFolderInfo(path);
    setCurrentFolder({ cap, link, path });
    setOpen(true);
  }

  const clickPostButton = async (info: UserInfo) => {
    await windowInstance.api.clickPostButton(info);
  }

  const clickEditLatestPostButton = async (info: UserInfo) => {
    await windowInstance.api.clickEditLatestPostButton(info);
  }

  return (
    <Layout>
      <div>
        <Button onClick={() => refetch()}>Reload</Button>
        <table className="w-full">
          <thead className="text-left">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Grroup</th>
              <th>Opened</th>
              <th>Config</th>
              <th>Manual</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {map(data?.data?.data?.data, (profile) => (
              <tr key={profile.profile_id}>
                <td>{profile.profile_id}</td>
                <td>{profile.name}</td>
                <td>{profile.group_id}</td>
                <td>{openedList?.[profile.profile_id]?.open_time || 'N/A'}</td>
                <td>
                  <div className="flex gap-1 items-center">
                    {shortName(userMap?.[profile.profile_id]?.name || 'N/A')}
                  </div>
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    <Button onClick={() => handleRandomFolder(profile.profile_id)}>Random</Button>
                    <Button onClick={() => handleShowInfo(userMap?.[profile.profile_id]?.path)}>Show</Button>
                    <Button onClick={() => clickPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name })}>Post</Button>
                    <Button onClick={() => clickEditLatestPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name })}>Edit</Button>
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <Button onClick={() => handleOpenProfile(profile.profile_id)}>Open</Button>
                    <Button onClick={() => handlePost({ wsUrl: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: `/Users/admin/Desktop/Tien Ich/Geedel Food Chopper, Easy to Clean Manual Hand Vegetable Chopper, Dishwasher Safe Slap Onion Cutter for Veggies Onions Garlic Nuts Salads Red` })}>Post</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <div className="p-4 flex flex-col gap-4">
          <div className="h-[400px]">
            <TextArea value={currentFolder.cap} />
          </div>
          <TextArea value={currentFolder.link} />
          <div className="flex gap-2">
            <Button onClick={() => handleOpenFolder(currentFolder.path)}>Mở folder</Button>
            <Button>Copy link</Button>
          </div>
        </div>
      </Dialog>
    </Layout>
  )
}

export default Profiles;