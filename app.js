const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/external", express.static(path.join(__dirname, "external")));
app.use("/inline", express.static(path.join(__dirname, "inline")));

app.get("/", (req, res) => {
  res.redirect("/services");
});

app.get("/services", (req, res) => {
  res.render("pages/services");
});

app.listen(PORT, () => {
  console.log(`EJS server running at http://localhost:${PORT}`);
});
