import app from "./app.js";

const PORT = process.env.PORT || 5500;

// Activate Server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});