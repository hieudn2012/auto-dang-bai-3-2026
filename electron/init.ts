import axios from "axios";
import { getMacID } from "./features/auth"

export const init = async () => {
  const mac = await getMacID();
  try {
    await axios.post('http://localhost:3001/api/users/login', { mac_id: mac });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
