import * as React from "react";

type DeviceType = "mobile" | "tablet" | "desktop";

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

export function useDeviceType(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>("desktop");

  React.useEffect(() => {
    const getDevice = () => {
      const width = window.innerWidth;

      if (width < BREAKPOINTS.mobile) return "mobile";
      if (width < BREAKPOINTS.tablet) return "tablet";
      return "desktop";
    };

    const handleResize = () => {
      setDevice(getDevice());
    };

    handleResize(); // initial run
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return device;
}
