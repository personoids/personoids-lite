import path from 'path';
import { createServer } from "@personoids/ai-plugin-router";
import { PersonoidLiteKernel } from "./PersonoidLiteKernel.js";
const app = createServer({
  "*": PersonoidLiteKernel,
});
app.get("/logo.png", (req, res) => {
  const logoPath = path.resolve('./logo.png');
  res.sendFile(logoPath);
});
process.on("unhandledRejection", function(reason, thepromise){
  console.log("Unhandled Promise Rejection", reason, thepromise);
}); 
const port = process.env.PORT || 5004;
app.listen(port, () => {
  console.log(`Server running`);
});