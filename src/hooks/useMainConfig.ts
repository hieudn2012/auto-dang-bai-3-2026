import { windowInstance } from "@/services/window";
import { MainConfig } from "electron/types";
import { useEffect, useState } from "react";

export const useMainConfig = () => {
  const [mainConfig, setMainConfig] = useState<MainConfig | null>({});

  useEffect(() => {
    const loadConfig = async () => {
      const config = await windowInstance.api.loadMainConfig();
      setMainConfig(config);
    };

    loadConfig();
  }, []);

  return {
    mainConfig,
  };
}