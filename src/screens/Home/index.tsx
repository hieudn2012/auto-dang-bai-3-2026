import Button from "@/components/Button";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import OpenProfile from "@/features/OpenProfile";
import { useGlobalStore } from "@/store/global";
import { map } from "lodash";
import { useState } from "react";

const Home = () => {
  const { captions, setCaptions } = useGlobalStore();
  const [caption, setCaption] = useState('');

  const addCaption = () => {
    setCaptions([...captions, caption])
    setCaption('');
  }

  const random = () => {
    const min = 0;
    const max = captions.length - 1;
    const index = Math.floor(Math.random() * (max - min + 1)) + min;

    if (captions[index] === caption) {
      random();
    } else {
      setCaption(captions[index]);
    }
  }

  return (
    <Layout>
      <div className="p-4">
        <TextArea
          placeholder="Enter your captions"
          value={caption} onChange={(e) => setCaption(e.target.value)}
        />
        <div className="my-5 gap-2 flex">
          <Button onClick={addCaption}>Add</Button>
          <Button onClick={random}>Random</Button>
        </div>
        <table className="table-auto w-full">
          <thead>
            <tr className="text-left">
              <th>Stt</th>
              <th>Caption</th>
            </tr>
          </thead>
          <tbody>
            {map(captions, (value, index) => (
              <tr>
                <td>{index}</td>
                <td>
                  <div>{value}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <OpenProfile id={124} />
      </div>
    </Layout>
  )
}

export default Home;
