const express = require('express');
const uuid = require('node-uuid');
const bodyParser = require('body-parser');
const fs = require('fs-promise');
const path = require('path');
const basicAuth = require('basic-auth-connect');

const port = 3000;

let app = express();

//Path where the mapping files are stored
let mappingPath = './data/';
//Reserved keywords that shall not be used as ids for shortened URLs
let reserved = ['create'];
//Mapping of ids to target URLs
let mapping = {};

//The body of a request shall be parsed if it is JSON or form-data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

let auth = (req, res, next) => next();

if (process.env.AUTH === 'true') {
    let user = process.env.USER;
    let password = process.env.PASSWORD;
    if (!user) {
        console.error('If AUTH is true, USER must be set.');
        process.exit(1);
    }
    if (!password) {
        console.error('If AUTH is true, PASSWORD must be set.');
        process.exit(1);
    }
    console.log('Service is protected by username and password');
    auth = basicAuth(user, password);
} else {
    console.log('Service is NOT protected by username and password');
}

/**
 * Checks if the passed id is valid. An id is valid if it only consists of characters, numbers, hyphens, and
 * underscores. Furthermore, it must begin with a character or a number and it cannot be a reserved word.
 *
 * @param id to be validated
 * @returns boolean true if the id is valid otherwise false
 */
function validId(id) {
    return reserved.indexOf(id) === -1 && id.match(/^[a-z0-9][a-z0-9\-_]+$/);
}

//Route to redirect to the target URL
app.get('/:id', (req, res) => {
    let id = req.params.id;
    if (!validId(id)) {
        res.status(400).send('Invalid ID format');
    } else if (mapping[id]) {
        res.redirect(302, mapping[id]);
    } else {
        res.status(404).send('Not Found');
    }
});

//Route to create a shortened URL for a given target URL
//(id of the shortened URL is generated)
app.post('/create', auth, (req, res) => {
    let id = uuid.v4().substr(0, 8);
    let url = req.body.url;
    console.log('Shortening request for: ', url);
    console.log('Created id: ', id)
    fs.writeFile(path.join(mappingPath, id), url)
        .then(() => {
            console.log('Created short url: /', id);
            mapping[id] = url;
            res.status(201)
                .set('Location', '/' + id)
                .end('Created');
        }, (err) => {
            res.status(500).end('Internal Server Error');
            console.error('Error during POST: ', err);
        });
});

//Route to delete a shortened URL
app.delete('/:id', auth, (req, res) => {
    let id = req.params.id;

    if (!validId(id)) {
        res.status(400).send('Invalid ID format');
    } else {
        fs.unlink(path.join(mappingPath, id), err => {
            if (err) {
                res.status(500).end('Internal Server Error');
                console.error('Error during DELETE: ', err);
            } else {
                delete mapping[id];
                res.end('OK');
            }
        });
    }

});

app.get('/', (req, res) => {
    fs.readFile('./public/index.html')
        .then((file) => res.end(file))
        .catch((err) => {
            res.status(500).end(err.message)
        });
});

app.all('*', (req, res) => {
    res.status(404).end('Not Found');
});

let files = fs.readdirSync(mappingPath);
files.forEach(id => {
    let file = path.join(mappingPath, id);
    if (validId(id) && fs.statSync(file).isFile()) {
        mapping[id] = fs.readFileSync(file);
    }

});

app.listen(port, () => console.log(`Listening on port ${port}!`));

