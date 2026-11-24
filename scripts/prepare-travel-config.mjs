import { writeFile } from "node:fs/promises";

const project = "traveltogether-2a321";
const appId = "1:558637715909:web:9345829be48b40c2e5bbac";
const endpoint = `https://${project}.web.app/__/firebase/init.json`;
const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Travel Canvas public SDK configuration returned HTTP ${response.status}`);
const config = await response.json();
if (config.projectId !== project || config.appId !== appId || !config.apiKey) {
  throw new Error("Unexpected Travel Canvas Firebase app configuration");
}
await writeFile(new URL("../public/travelcanvas/firebase-config.json", import.meta.url), JSON.stringify(config) + "\n");
