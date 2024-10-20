// create a function which will clear the contents of the directory passed to it

const fs = require('fs');

async function clearDirectory(directory) {
    try {
        const files = fs.readdirSync(directory);

        for (const file of files) {
            fs.unlinkSync(`${directory}/${file}`);
        }

        console.log('Directory cleared successfully');
        return { success: true, message: 'Directory cleared successfully' };
    }
    catch (error) {
        console.error('Error clearing directory:', error);
        return { success: false, message: error.message };
    }
}

module.exports = clearDirectory;