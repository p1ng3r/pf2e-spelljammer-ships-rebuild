import { attachModuleApi } from "./api/module-api.js";
import { API_NAMESPACE, MODULE_TITLE } from "./config/constants.js";

Hooks.once("init", () => {
  console.log(`${MODULE_TITLE} | init`);
});

Hooks.once("ready", () => {
  const api = attachModuleApi();

  console.log(`${MODULE_TITLE} | ready`);
  console.log(`${MODULE_TITLE} | API attached to game.${API_NAMESPACE}`, api);
});
