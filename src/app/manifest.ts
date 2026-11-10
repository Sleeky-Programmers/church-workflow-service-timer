import type { MetadataRoute } from "next";

/** Lets the timer be installed as an app on the control laptop and phones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Service Timer",
    short_name: "Service Timer",
    description: "A countdown timer for church services that keeps running when the internet drops.",
    start_url: "/control",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#0C5FB3",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
