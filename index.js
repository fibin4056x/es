import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";

const PORT = ENV.PORT;

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
