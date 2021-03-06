// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// Database Client
const client = require('./lib/client');
// Services

// Auth
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const request = require('superagent');

const authRoutes = createAuthRoutes({
    async selectUser(email) {
        const result = await client.query(`
            SELECT id, email, hash, display_name  
            FROM users
            WHERE email = $1;
        `, [email]);
        return result.rows[0];
    },
    async insertUser(user, hash) {
        console.log(user);
        const result = await client.query(`
            INSERT into users (email, hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email, display_name;
        `, [user.email, hash, user.display_name]);
        return result.rows[0];
    }
});

// Application Setup
const app = express();
app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data

app.use(express.json()); // enable reading incoming json data
app.use(express.urlencoded({ extended: true }));


// setup authentication routes
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

app.get('/api/character', async (req, res) => {
    const data = await request.get(`https://rickandmortyapi.com/api/character/?name=${req.query.name}`);
    res.json(data.body);
});

// id SERIAL PRIMARY KEY,
// name VARCHAR(256) NOT NULL,
// status VARCHAR(1024),
// user_id INTEGER NOT NULL REFERENCES users(id),
// species VARCHAR(512) NOT NULL
// );

app.post('/api/me/favorites', async(req, res) => {
    try {
        const {
            name,
            status,
            species,
        } = req.body;

        const newFavorites = await client.query(`
        INSERT INTO favorites (name, status, species, user_id)
        values ($1, $2, $3, $4)
        returning *
        `, [
            name,
            status,
            species,
            req.userId,
        ]);

        res.json(newFavorites.rows[0]);
    } catch (e) {
        console.log(e);
    }
});

app.get('/api/me/favorites', async (req, res) => {
    try {
        const myQuery = `
            SELECT * FROM favorites
            WHERE user_id=$1
        `;
        
        const favorites = await client.query(myQuery, [req.userId]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});


app.delete('/api/me/favorites/:id', async(req, res) => {
    try {
        const myQuery = `
        DELETE FROM favorites
        WHERE user_id=$1
        RETURNING *
        `;
        
        const favorites = await client.query(myQuery, [req.userId]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});
app.listen(process.env.PORT, () => {
    console.log('listening at ', process.env.PORT);
});





// // Load Environment Variables from the .env file
// require('dotenv').config();

// // Application Dependencies
// const express = require('express');
// const cors = require('cors');
// const morgan = require('morgan');
// // Database Client
// const client = require('./lib/client');
// // Services
// // const quotesApi = require('./lib/quotes-api');

// // Auth
// const ensureAuth = require('./lib/auth/ensure-auth');
// const createAuthRoutes = require('./lib/auth/create-auth-routes');
// const authRoutes = createAuthRoutes({
//     async selectUser(email) {
//         const result = await client.query(`
//             SELECT id, email, hash, display_name as  
//             FROM users
//             WHERE email = $1;
//         `, [email]);
//         return result.rows[0];
//     },
//     async insertUser(user, hash) {
//         console.log(user);
//         const result = await client.query(`
//             INSERT into users (email, hash, display_name)
//             VALUES ($1, $2, $3)
//             RETURNING id, email, display_name;
//         `, [user.email, hash, user.display_name]);
//         return result.rows[0];
//     }
// });

// // Application Setup
// const app = express();
// const PORT = process.env.PORT;
// app.use(morgan('dev')); // http logging
// app.use(cors()); // enable CORS request
// app.use(express.static('public')); // server files from /public folder
// app.use(express.json()); // enable reading incoming json data

// // setup authentication routes
// app.use('/api/auth', authRoutes);

// // everything that starts with "/api" below here requires an auth token!
// app.use('/api', ensureAuth);

// // *** API Routes ***
// app.get('/api/movie', async (req, res) => {

//     try {
//         const query = req.query;

//         // get the data from the third party API
//         const quotes = await quotesApi.get(query.search, query.page);

//         // This part is coded after initial functionality is complete...

//         // Select these ids from the favorites table, for _this user_
//         const favorites = await client.query(`
//             SELECT id
//             FROM   favorites
//             WHERE  user_id = $1;
//         `, [req.userId]);

//         // make a lookup of all favorite ids:

//         const lookup = favorites.rows.reduce((acc, quote) => {
//             acc[quote.id] = true;
//             return acc;
//         }, {});

//         // adjust the favorite property of each item:
//         quotes.forEach(quote => quote.isFavorite = lookup[quote.id] || false);

//         // Ship it!
//         res.json(quotes);
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || err
//         });
//     }
// });

// app.get('/api/me/favorites', async (req, res) => {
//     // Get the favorites _for the calling user_
//     try {
//         const result = await client.query(`
//             SELECT id, 
//                    character, 
//                    image, 
//                    quote, 
//                    user_id as "userId", 
//                    TRUE as "isFavorite"
//             FROM   favorites
//             WHERE user_id = $1;
//         `, [req.userId]);

//         res.json(result.rows);
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || err
//         });
//     }
// });

// // const stringHash = require('string-hash');

// app.post('/api/me/favorites', async (req, res) => {
//     // Add a favorite _for the calling user_
//     try {
//         const quote = req.body;

//         const result = await client.query(`
//             INSERT INTO favorites (id, quote, user_id, character, image)
//             VALUES ($1, $2, $3, $4, $5)
//             RETURNING quote as id, character, image, quote, user_id as "userId";
//         `, [
//             // this first value is a shortcoming of this API, no id
//             stringHash(quote.quote),
//             quote.quote,
//             req.userId,
//             quote.character,
//             quote.image
//         ]);

//         res.json(result.rows[0]);

//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || err
//         });
//     }
// });

// app.delete('/api/me/favorites/:id', (req, res) => {
//     // Remove a favorite, by favorite id _and the calling user_
//     try {
//         client.query(`
//             DELETE FROM favorites
//             WHERE id = $1
//             AND   user_id = $2;
//         `, [req.params.id, req.userId]);

//         res.json({ removed: true });
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || err
//         });
//     }
// });

// // Start the server
// app.listen(PORT, () => {
//     console.log('server running on PORT', PORT);
// });