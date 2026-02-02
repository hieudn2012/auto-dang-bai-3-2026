import Layout from "@/components/Layout";
import { useGetProfiles } from "@/services/profiles";
import { map } from "lodash";

const Profiles = () => {
  const [{ data }] = useGetProfiles();
  console.log(data, 'data');

  return (
    <Layout>
      <div>
        <table className="w-full">
          <thead className="text-left">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Grroup</th>
            </tr>
          </thead>
          <tbody>
            {map(data?.data?.data?.data, (profile) => (
              <tr key={profile.id}>
                <td>{profile.profile_id}</td>
                <td>{profile.name}</td>
                <td>{profile.group_id}</td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </Layout>
  )
}

export default Profiles;