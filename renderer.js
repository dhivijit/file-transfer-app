function showCustomAlert(title, message) {
    window.electronAPI.alertInvoke({ title, message });
}

// Key Management
async function keyVerifier() {
    const keyCheckResult = await window.electronAPI.checkKey();

    if (keyCheckResult.success) {
        document.getElementById("keycheck").style.display = "block";
    } else {
        document.getElementById("keycheck").style.display = "none";
    }
}

document.querySelector("#KeyGenerateBtn").addEventListener("click", async () => {
    const result = await window.electronAPI.generateKey();

    if (result.success) {
        showCustomAlert("Success", "Keys generated successfully");
    } else {
        showCustomAlert("Error", "Error generating keys: " + result.message);
    }

    keyVerifier();
});

document.getElementById('keySavebtn').addEventListener('click', async () => {
    const privateKeyInput = document.getElementById('private-key');
    const publicKeyInput = document.getElementById('public-key');

    const privateKeyFile = privateKeyInput.files[0];
    const publicKeyFile = publicKeyInput.files[0];

    const fileArray = [];

    if (privateKeyFile) {
        fileArray.push({
            name: privateKeyFile.name,
            path: privateKeyFile.path
        });
    }

    if (publicKeyFile) {
        fileArray.push({
            name: publicKeyFile.name,
            path: publicKeyFile.path
        });
    }

    if (fileArray.length == 1) {
        showCustomAlert("Error", "Please select both files to save");
    } else if (fileArray.length > 0) {
        const result = await window.electronAPI.saveFiles(fileArray);

        if (result.success) {
            showCustomAlert("Success", "Keys saved successfully");
        } else {
            showCustomAlert("Error", "Error saving files: " + result.message);
        }
    }
    else {
        showCustomAlert("Error", "Please select files to save");
    }

    keyVerifier();
});

window.addEventListener('DOMContentLoaded', async () => {
    keyVerifier();
})

document.querySelector("#keyClearBtn").addEventListener("click", async () => {
    const response = await window.electronAPI.promptInvoke({ title: "Confirm ?", message: "Are you sure you want to delete the keys?" });

    if (!response) {
        return;
    }

    const result = await window.electronAPI.deleteKeys();

    if (result.success) {
        showCustomAlert("Success", "Keys deleted successfully");
    } else {
        showCustomAlert("Error", "Error deleting keys: " + result.message);
    }

    keyVerifier();
});

// File Sending
document.querySelector("#encrypt-btn").addEventListener("click", async () => {
    document.querySelector("#statusdiv").style.display = "block";
    const statusBox = document.querySelector("#currStatus");

    statusBox.innerHTML = "Starting Up...";

    const publicKeyUpload = document.querySelector("#public-key-upload");
    const fileUploaded = document.querySelector("#file-upload")
    const userMessage = document.querySelector("#message-input");

    fileArray = []
    const publicKeyUploadFile = publicKeyUpload.files[0];
    const fileUploadedFile = fileUploaded.files[0];

    if (publicKeyUploadFile) {
        fileArray.push({
            name: publicKeyUploadFile.name,
            path: publicKeyUploadFile.path

        });
        if (!publicKeyUploadFile.name.endsWith(".pem")) {
            showCustomAlert("Error", "Please upload a .pem file");
            statusBox.innerHTML = "Please upload a .pem file";
            return;
        }
    }

    if (fileUploadedFile) {
        fileArray.push({
            name: fileUploadedFile.name,
            path: fileUploadedFile.path
        })
        if (fileUploadedFile.name.endsWith(".pem")) {
            showCustomAlert("Error", "The uploaded file cannot be a .pem file");
            statusBox.innerHTML = "The uploaded file cannot be a .pem file";
            return;
        }
    }

    if (fileArray.length < 2) {
        showCustomAlert("Error", "Please select both files to encrypt");
        statusBox.innerHTML = "Please select both files to start the operation";
        return;
    }

    const result = await window.electronAPI.SaveUserFiles(fileArray);

    if (!result.success) {
        showCustomAlert("Error", "Error saving files: " + result.message);
        statusBox.innerHTML = "Error saving files: " + result.message;
        return;
    }

    statusBox.innerHTML = "Files saved successfully";

    const encryptResult = await window.electronAPI.encryptFile();

    if (!encryptResult.success) {
        showCustomAlert("Error", "Error encrypting file: " + encryptResult.message);
        statusBox.innerHTML = "Error encrypting file: " + encryptResult.message;
        return;
    }

    statusBox.innerHTML = "File encrypted successfully";

    await new Promise(resolve => setTimeout(resolve, 1000));

    statusBox.innerHTML = "Please wait, Uploading file to IPFS...";

    const uploadResult = await window.electronAPI.uploadFiletoIPFS();

    if (!uploadResult.success) {
        showCustomAlert("Error", "Error uploading file: " + uploadResult.message);
        statusBox.innerHTML = "Error uploading file: " + uploadResult.message;
        return;
    }

    statusBox.innerHTML = "File uploaded successfully";

    const link = uploadResult.finalLink;

    await new Promise(resolve => setTimeout(resolve, 1000));
    statusBox.innerHTML = "Notifying target user...";

    const mongoResult = await window.electronAPI.mongoDbupload(link, userMessage.value);

    if (!mongoResult.success) {
        showCustomAlert("Error", "Error notifying user: " + mongoResult.message);
        statusBox.innerHTML = "Error notifying user: " + mongoResult.message;
        return;
    }

    statusBox.innerHTML = "User notified successfully";
    await new Promise(resolve => setTimeout(resolve, 1000));
    statusBox.innerHTML = "Operation completed successfully";

    publicKeyUpload.value = "";
    fileUploaded.value = "";
    userMessage.value = "";

    await window.electronAPI.cleanDir();
});

// File Receiving
searchBtn.addEventListener('click', async () => {
    // Fetch the list of items from the API (assuming each item contains message, sender, and time).
    const items = await window.electronAPI.checkNewFiles();

    // Clear the existing listbox content.
    listboxItems.innerHTML = '';

    // Loop through the received items and create listbox elements.
    items.forEach((item, index) => {
        // Create a new list item (li) for each item.
        const li = document.createElement('li');
        li.textContent = item.message.length > 7 ? item.message.substring(0, 7) + "..." : item.message;
        listboxItems.appendChild(li);

        // Add click event listener for each list item.
        li.addEventListener('click', () => {
            // Populate the item-info-card with the full details of the selected item.
            // document.getElementById('fileSender').textContent = item.from;
            console.log(item);
            document.getElementById('messagefromSender').textContent = item.message;
            document.getElementById('timeofSending').textContent = new Date(item.date).toLocaleString(); // Format the time nicely
            document.getElementById('download-btn').addEventListener("click", async () => {
                console.log(item.fileURL);
                const result = await window.electronAPI.downloadFile(item.fileURL);

                if (result.success) {
                    const decryptResult = await window.electronAPI.decryptFile();

                    // Show the save as file dialog
                    if(decryptResult.success){
                        showCustomAlert("Success", "File Saved successfully");
                    }
                } else {
                    showCustomAlert("Error", "Error downloading file: " + result.message);
                }
            });

            // Show the item info card and overlay.
            itemInfoCard.style.display = 'block';
            overlay.style.display = 'block';
        });
    });

    // Show the listbox and the hide button.
    listbox.style.display = 'block';
    hideBtn.style.display = 'block';
});

