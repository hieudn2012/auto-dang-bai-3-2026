import { getMacID } from "./features/auth"
import { saveMainConfig } from "./features/common";

export const init = async () => {
  const mac = await getMacID();
  saveMainConfig({ macId: mac });
}
