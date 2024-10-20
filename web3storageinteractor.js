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
async function main() {
  try {
    // Initialize the dynamic imports
    await initializeModules();

    // Load client with specific private key from environment
    const principal = Signer.parse(process.env.KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    // Add proof that this agent has been delegated capabilities on the space
    const proof = await Proof.parse(process.env.PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    // READY to go!

    // Example of uploading files (you can uncomment this part if needed)
    // const myImg = "./20241005.jpg";
    // const files = await filesFromPaths([myImg]);
    // const directoryCid = await client.uploadDirectory(files);
    // console.log(`Directory CID: ${directoryCid}`);

    // Listing uploaded files
    const listed = await client.capability.upload.list({ cursor: '', size: 25 });
    console.log("The list of files: ", JSON.stringify(listed, null, 2));

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// Execute the main function
main();
