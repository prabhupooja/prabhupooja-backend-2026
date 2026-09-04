const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize(config.DB.database, config.DB.user, config.DB.password, {
    host: config.DB.host,
    port: config.DB.port,
    dialect: 'mysql',
    logging: false, 
});

module.exports = sequelize;
