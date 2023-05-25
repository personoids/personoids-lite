import path from 'path';
import { createServer } from "@personoids/ai-plugin-router";
import { PluginsPlugin } from "./PluginsPlugin.js";
const app = createServer({
  "*": PluginsPlugin,
});
app.get("/logo.png", (req, res) => {
  const logoPath = path.resolve('./logo.png');
  res.sendFile(logoPath);
});

const port = process.env.PORT || 5004;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});