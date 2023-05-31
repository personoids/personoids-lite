import path from 'path';
import { createServer } from "@personoids/ai-plugin-router";
import { PersonoidLiteKernel } from "./PersonoidLiteKernel.js";
// for resizing images
import sharp from 'sharp';

const app = createServer({
  "*": PersonoidLiteKernel,
});
app.get("/logo.png", (req, res) => {
  const logoPath = path.resolve('./logo.png');
  res.sendFile(logoPath);
});

app.get("/avatar/:id", (req, res) => {
  const imgPath = path.resolve(`./images/${req.params.id}`);
  // resize image
  const width = parseInt(req.query.width) || 128;
  const height = parseInt(req.query.height) || 128;
  const format = req.query.format || 'png';
  const img = sharp(imgPath).resize(width, height).toFormat(format);
  res.setHeader('Content-Type', `image/${format}`);
  img.pipe(res);
});
process.on("unhandledRejection", function(reason, thepromise){
  console.log("Unhandled Promise Rejection", reason, thepromise);
}); 
const port = process.env.PORT || 5004;
app.listen(port, () => {
  console.log(`Server running`);
});