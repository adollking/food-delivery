const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

//conection to database
const db = require('./db');



const app = express();

app.listen(3000, () => console.log('Server started add port 3000'));