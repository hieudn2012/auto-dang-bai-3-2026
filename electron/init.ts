import { getMacID } from "./features/auth"

export const init = async () => {
  const mac = await getMacID();
  console.log('Mac ID:', mac);
}
