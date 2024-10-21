# File Transfer App using IPFS

## Overview

This repository contains a File Transfer Application that utilizes IPFS (InterPlanetary File System) for decentralized file storage and sharing. The application is built with JavaScript, HTML, and CSS and packaged as an Electron app.

## Prerequisites

To use this application, you need an account with [web3.storage](https://web3.storage/).

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/dhivijit/file-transfer-app.git
    cd file-transfer-app
    ```

2. Install the necessary dependencies:
    ```sh
    npm install
    ```

3. Configuration:
    - Create a `.env` file in the root directory of the project.
    - Add the following environment variables as per the instructions on [web3.storage](https://web3.storage/docs/how-to/upload/#bring-your-own-delegations):
        ```plaintext
        # DB Connection
        MONGO_URI=

        # Web3.Storage Keys
        KEY=
        PROOF=
        ```

## NPM Scripts

- `start`: Starts the Electron application.
    ```sh
    npm start
    ```
- `package`: Packages the Electron application.
    ```sh
    npm run package
    ```
- `make`: Makes the Electron application distributable.
    ```sh
    npm run make
    ```
- `clean`: Cleans the output directory.
    ```sh
    npm run clean
    ```

## Contributing

Feel free to fork this repository and make contributions. Pull requests are welcome.

## License

This project is licensed under the ISC License.