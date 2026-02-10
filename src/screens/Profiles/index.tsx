import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { useGetNativeClientProfileOpenedList, useGetProfiles } from "@/services/profiles";
import { map } from "lodash";

const Profiles = () => {
  const [{ data }] = useGetProfiles();
  const [{ data: openedList, refetch }] = useGetNativeClientProfileOpenedList();

  const handleOpenProfile = async (id: number) => {
    await window.api.threadsProfileOpen(id);
  }

  const handlePost = ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => {
    window.api.threadsPost({ wsUrl, username, folder });
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
                  <Button onClick={() => handleOpenProfile(profile.profile_id)}>Open</Button>
                  <Button onClick={() => handlePost({ wsUrl: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: `/Users/admin/Desktop/Tien Ich/Geedel Food Chopper, Easy to Clean Manual Hand Vegetable Chopper, Dishwasher Safe Slap Onion Cutter for Veggies Onions Garlic Nuts Salads Red` })}>Post</Button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </Layout>
  )
}

export default Profiles;