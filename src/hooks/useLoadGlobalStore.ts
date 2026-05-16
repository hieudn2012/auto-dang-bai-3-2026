import { windowInstance } from "@/services/window";
import { MainConfig } from "electron/types";
import { useEffect, useState } from "react";

export const useMainConfig = () => {
  const [config, setConfig] = useState<MainConfig | null>(null);

  useEffect(() => {
    windowInstance.api.loadMainConfig().then((config) => {
      setConfig(config);
    });
  }, []);

  return {
    config,
  };
}