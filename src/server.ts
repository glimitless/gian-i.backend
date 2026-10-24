import app from "./app.js";

const port = process.env.PORT || 5500;

// Activate Server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});