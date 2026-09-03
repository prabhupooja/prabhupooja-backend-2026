const soketConfig = require("./soketConfig");

let io;

const initializePandit = (server) => {
    io = soketConfig.getIo();
};

const getIo = () => {
    try {
        if (io) return io;
        return soketConfig.getIo();
    } catch (e) {
        return null;
    }
};

module.exports = { initializePandit, getIo };