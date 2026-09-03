const { Sequelize } = require('sequelize');
const dotenv = require("dotenv");
dotenv.config();

const sequelize = new Sequelize(process.env.DbName , process.env.DbUser, process.env.DbPassword, {
    host: process.env.DbHost,
    dialect: 'mysql',
    logging: false, 
});


module.exports = sequelize;
