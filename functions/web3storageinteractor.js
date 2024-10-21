// Declare variables for modules to be dynamically imported
let Client, StoreMemory, Proof, Signer, filesFromPaths;

// Initialization function to dynamically import modules
async function initializeModules() {
  const ClientModule = await import('@web3-storage/w3up-client');
  const StoreMemoryModule = await import('@web3-storage/w3up-client/stores/memory');
  const ProofModule = await import('@web3-storage/w3up-client/proof');
  const SignerModule = await import('@web3-storage/w3up-client/principal/ed25519');
  const filesFromPathsModule = await import('files-from-path');
  const dotenv = await import('dotenv');

  // Assigning imported modules to variables
  Client = ClientModule;
  StoreMemory = StoreMemoryModule.StoreMemory;
  Proof = ProofModule;
  Signer = SignerModule.Signer;
  filesFromPaths = filesFromPathsModule.filesFromPaths;

  // Load environment variables using dotenv
  dotenv.config();
}

// Main function to run the logic after modules are initialized
/**
 * Uploads a file to IPFS using Web3.Storage.
 *
 * @async
 * @function IPFSUploader
 * @param {string} uploadFilePath - The path of the file to be uploaded.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the success status, message, and directory CID.
 * @throws {Error} - Throws an error if the upload process fails.
 *
 * @example
 * const result = await IPFSUploader('/path/to/file.txt');
 * if (result.success) {
 *   console.log('Upload successful:', result.directoryCid);
 * } else {
 *   console.error('Upload failed:', result.message);
 * }
 */
async function IPFSUploader(uploadFilePath) {
  try {
    await initializeModules();

    const principal = Signer.parse(process.env.KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    const proof = await Proof.parse(process.env.PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    const files = await filesFromPaths([uploadFilePath]);
    const directoryCid = await client.uploadDirectory(files);

    return { success: true, message: 'Files uploaded successfully.', directoryCid };

  } catch (error) {
    console.error('Error occurred:', error);
    return { success: false, message: 'Error uploading files: ' + error.message };
  }
}

/**
 * Deletes a file from IPFS using the provided CID.
 *
 * @async
 * @function IPFSFileDeleter
 * @param {string} Cid - The CID of the file to be deleted.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the success or failure of the deletion operation.
 * @property {boolean} success - Indicates whether the file was deleted successfully.
 * @property {string} message - A message describing the result of the deletion operation.
 * @throws Will throw an error if the deletion process fails.
 */
async function IPFSFileDeleter(Cid) {
  try {
    await initializeModules();

    const principal = Signer.parse(process.env.KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    const proof = await Proof.parse(process.env.PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());
    await client.remove(Cid, { shards: true })

    return { success: true, message: 'File deleted successfully.' };

  } catch (error) {
    console.error('Error occurred:', error);
    return { success: false, message: 'Error deleting file: ' + error.message };
  }
}


module.exports = { IPFSUploader, IPFSFileDeleter };