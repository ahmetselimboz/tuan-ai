require("dotenv").config();
const generateWithAI = require("./lib/tuan-ai");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
const customMorganLogger = require("./lib/morgan");
const chalk = require("chalk");
const cors = require("cors");
var indexRouter = require("./routes/index");
const resetDailyLimit = require("./lib/refreshLimit");
const { CORS_ENABLED, ALLOWED_DOMAINS } = require("./config/environments");

var app = express();
// console.log("🚀 ~ CORS_ENABLED:", CORS_ENABLED)
// console.log("🚀 ~ CORS_ENABLED:", typeof CORS_ENABLED)

if (CORS_ENABLED === "true") {
  const allowedDomains = ALLOWED_DOMAINS.split(",").map(domain => domain.trim()); 

  const corsOptions = {
    origin: (origin, callback) => {
      console.log("🚀 ~ origin:", origin);
      console.log("🚀 ~ allowedDomains.includes(origin):", allowedDomains.includes(origin));
      const normalizedDomains = allowedDomains.map(url => url.replace(/\/$/, ''));
      const incomingOrigin = (origin || "").replace(/\/$/, '');
      
      if (!origin || normalizedDomains.includes(incomingOrigin)) {
        callback(null, true);
      } else {
        console.log("🚀 ~ CORS:", "Not allowed by CORS");
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
} else {
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(customMorganLogger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

resetDailyLimit()

app.use("/api", indexRouter);

// error handler
app.use(function (err, req, res, next) {
  console.log(chalk.red(err));
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(505).json({ error: err.message });
});

module.exports = app;
