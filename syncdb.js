const sequelize = require("./config/seq");
const dotenv = require("dotenv");
const callModel = require("./models/call.model");
const liveStreamingModel = require("./models/livestream.model");
const messageMode = require("./models/message.model");
const panditModel = require("./models/pandit.model");
const paymentMode = require("./models/payments.model");
const prasadModel = require("./models/prasad.model");
const pujaModel = require("./models/puja.model");
const requestModel = require("./models/request.model");
const serviceModel = require("./models/services.model");
const userModel = require("./models/user.model");
const videoCallModel = require("./models/videocall.model");
dotenv.config();

const syncDatabase = async () => {
  try {
    console.log("Syncing database...");

    await sequelize.sync({ alter: true });

    console.log("Database synced successfully.");
  } catch (error) {
    console.error("Error syncing database:", error);
  } finally {
    await sequelize.close();
  }
};

syncDatabase();
