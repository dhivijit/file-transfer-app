const { MongoClient } = require("mongodb");
const dotenv = require('dotenv');
dotenv.config();

// Replace the uri string with your connection string.
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

/**
 * Inserts a new record into the database.
 *
 * @async
 * @function newUploadUpdater
 * @param {string} from - The sender of the file.
 * @param {string} to - The recipient of the file.
 * @param {string} fileURL - The URL of the file being transferred.
 * @param {string} message - The message accompanying the file. 
 * @returns {Promise<Object>} A promise that resolves to an object indicating the success or failure of the operation.
 * @throws {Error} If an error occurs during the database operation.
 */
async function newUploadUpdater(from, to, fileURL, message=null) {
    try {
        const database = client.db('IPFSFileTransfer');
        const filehistory = database.collection('FileHistory');

        // Create a document to insert
        const doc = {
            from: from,
            to: to,
            fileURL: fileURL,
            date: new Date(),
            status: "uploaded",
            message: message,
        };

        const result = await filehistory.insertOne(doc);

        return { success: "true", message: "Document inserted successfully" };

    } catch (error) {
        return { success: "false", message: error.message };
    } finally {
        await client.close();
    }
}

/**
 * Retrieves new files for a given user address from the database.
 *
 * @async
 * @function getNewFiles
 * @param {string} userAddress - The address of the user to retrieve files for.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of file objects.
 * @throws Will throw an error if the database connection or query fails.
 */
async function getNewFiles(userAddress) {
    try {
        await client.connect();
        const database = client.db('IPFSFileTransfer');
        const filehistory = database.collection('FileHistory');

        const query = { to: userAddress, status: "uploaded" };
        const options = {
            sort: { date: -1 },
        };

        const cursor = filehistory.find(query, options);

        const results = await cursor.toArray();

        return results;
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

/**
 * Updates the status of a file in the FileHistory collection.
 *
 * @async
 * @function updateFileStatus
 * @param {string} fileId - The ID of the file to update.
 * @param {string} status - The new status to set for the file.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the success or failure of the update operation.
 * @throws {Error} If an error occurs during the database operation.
 */
async function updateFileStatus(fileId, status) {
    try {
        await client.connect();
        const database = client.db('IPFSFileTransfer');
        const filehistory = database.collection('FileHistory');

        const query = { _id: fileId };
        const updateDoc = {
            $set: {
                status: status,
            },
        };

        const result = await filehistory.updateOne(query, updateDoc);

        console.log(`${result.matchedCount} document(s) matched the query criteria.`);
        console.log(`${result.modifiedCount} document(s) was/were updated.`);

        return { success: "true", message: "Document updated successfully" };
    } catch (error) {
        return { success: "false", message: error.message };
    } finally {
        await client.close();
    }
}

/**
 * Fetches all files for a given user address from the database.
 *
 * @async
 * @function fetchAllFiles
 * @param {string} userAddress - The address of the user to fetch files for.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of file objects.
 * @throws Will throw an error if the database connection or query fails.
 */
async function fetchAllFiles(userAddress) {
    try {
        await client.connect();
        const database = client.db('IPFSFileTransfer');
        const filehistory = database.collection('FileHistory');

        const query = { to: userAddress };
        const options = {
            sort: { date: -1 },
        };

        const cursor = filehistory.find(query, options);

        const results = await cursor.toArray();

        return results;
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

module.exports = { newUploadUpdater, getNewFiles, updateFileStatus, fetchAllFiles };