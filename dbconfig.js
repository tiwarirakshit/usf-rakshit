const MongoClient = require('mongodb').MongoClient;

const URI = "mongodb+srv://mohit:Mohit123@cluster0.pdaq0.mongodb.net/?retryWrites=true&w=majority";

let connection = null;

const option = {
    keepAlive: true,
    minPoolSize: 0,
    maxPoolSize: 10,
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
    useUnifiedTopology: true
};

const MongoDBClient = new MongoClient(URI, option);

module.exports.connect = () => new Promise((resolve, reject) => {
    MongoDBClient.connect(function (err, client) {
        if (err) { reject(err); return; };
        const db = client.db('uniquestepfinancial');
        resolve(db);
        connection = db;
    });
});

module.exports.get = () => {
    if (!connection) {
        throw new Error('Call Connect First...');
    }
    return connection;
}

module.exports.close = () => {
    if (!connection) {
        throw new Error('Call Connect First...');
    }
    MongoDBClient.close();
}
