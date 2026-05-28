require('dotenv').config();
const mongoose = require('mongoose');

mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(e => console.error('Connection error:', e.message));

module.exports = mongoose.connection;
