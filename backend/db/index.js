const mongoose = require('mongoose');

// Connect to MongoDB
mongoose
    .connect('mongodb+srv://foodweb:jaya123@foodapp.bkwokmo.mongodb.net/foodweb?retryWrites=true&w=majority', { useNewUrlParser: true })
    .catch(e => {
        console.error('Connection error', e.message)
    
        });
const db = mongoose.connection;
module.exports = db;


