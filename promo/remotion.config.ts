import { Config } from "@remotion/cli/config";

// Renders use the Chromium that is already installed here rather than
// downloading Remotion's own headless shell.
Config.setBrowserExecutable(process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium");
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
