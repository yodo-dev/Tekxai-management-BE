import "./config/env.js";
import app from "./app.js";
import { env_config } from "./config/env.js";

app.listen(env_config.port, () => {
  console.log(
    `Server running on port ${env_config.port} in ${env_config.env} mode`,
  );
});
