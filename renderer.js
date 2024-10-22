function showCustomAlert(title, message) {
    window.electronAPI.alertInvoke({ title, message });
}

function toggleButtons(state) {
    const buttons = document.querySelectorAll("button");
    buttons.forEach(button => {
        button.disabled = state;
        button.style.cursor = state ? 'wait' : 'pointer';

    });
}

// Key Management
async function keyVerifier() {
    const keyCheckResult = await window.electronAPI.checkKey();

    if (keyCheckResult.success) {
        document.getElementById("keycheck").style.display = "block";
        document.getElementById("share-key").style.display = "block";
        document.getElementById("key-init-message").style.display = "none";
        document.getElementById("upload-btn").style.display = "block";
        document.getElementById("search-btn").style.display = "block";
        document.getElementById("settings").style.display = "block";

        const passwordRequired = await window.electronAPI.isAuthRequired();
        if (passwordRequired) {
            document.querySelector("#enable-password-toggle").checked = true;
        }
    } else {
        document.getElementById("keycheck").style.display = "none";
        document.getElementById("share-key").style.display = "none";
        document.getElementById("key-init-message").style.display = "block";
        document.getElementById("upload-btn").style.display = "none";
        document.getElementById("search-btn").style.display = "none";
        document.getElementById("settings").style.display = "none";
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
    document.body.style.cursor = 'wait';
    toggleButtons(true)
    const result = await window.electronAPI.SaveUserFiles(fileArray);

    if (!result.success) {
        showCustomAlert("Error", "Error saving files: " + result.message);
        statusBox.innerHTML = "Error saving files: " + result.message;
        document.body.style.cursor = 'default';
        toggleButtons(false)
        return;
    }

    statusBox.innerHTML = "Files saved successfully";

    const encryptResult = await window.electronAPI.encryptFile();

    if (!encryptResult.success) {
        showCustomAlert("Error", "Error encrypting file: " + encryptResult.message);
        statusBox.innerHTML = "Error encrypting file: " + encryptResult.message;
        document.body.style.cursor = 'default';
        toggleButtons(false)
        return;
    }

    statusBox.innerHTML = "File encrypted successfully";

    await new Promise(resolve => setTimeout(resolve, 1000));

    statusBox.innerHTML = "Please wait, Uploading file to IPFS...";

    const uploadResult = await window.electronAPI.uploadFiletoIPFS();

    if (!uploadResult.success) {
        showCustomAlert("Error", "Error uploading file: " + uploadResult.message);
        statusBox.innerHTML = "Error uploading file: " + uploadResult.message;
        document.body.style.cursor = 'default';
        toggleButtons(false)
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
        document.body.style.cursor = 'default';
        toggleButtons(false)
        return;
    }

    statusBox.innerHTML = "User notified successfully";
    await new Promise(resolve => setTimeout(resolve, 1000));
    statusBox.innerHTML = "Operation completed successfully";
    showCustomAlert("Success", "Operation completed successfully");
    document.body.style.cursor = 'default';
    toggleButtons(false)

    document.querySelector("#upload-container").style.display = "none";
    overlay.style.display = "none";

    document.querySelector("#statusdiv").style.display = "none";
    publicKeyUpload.value = "";
    fileUploaded.value = "";
    userMessage.value = "";

    await window.electronAPI.cleanDir();
});

// File Receiving
searchBtn.addEventListener('click', async () => {
    document.body.style.cursor = 'wait';
    toggleButtons(true)
    const items = await window.electronAPI.checkNewFiles();

    document.body.style.cursor = 'default';
    toggleButtons(false)

    listboxItems.innerHTML = '';

    if (items.length === 0) {
        const noFilesMessage = document.createElement('p');
        noFilesMessage.textContent = "No new files.";
        listboxItems.appendChild(noFilesMessage);
    } else {
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = new Date(item.date).toLocaleString();
            listboxItems.appendChild(li);

            li.addEventListener('click', () => {
                document.getElementById('messagefromSender').textContent = item.message;
                document.getElementById('timeofSending').textContent = new Date(item.date).toLocaleString();
                document.getElementById('download-btn').addEventListener("click", async () => {
                    toggleButtons(true);
                    document.body.style.cursor = 'wait';
                    const result = await window.electronAPI.downloadFile(item.fileURL);

                    if (result.success) {
                        const decryptResult = await window.electronAPI.decryptFile();
                        document.body.style.cursor = 'default';
                        toggleButtons(false);
                        if (decryptResult.success) {
                            showCustomAlert("Success", "File Saved successfully");
                        }
                    } else {
                        showCustomAlert("Error", "Error downloading file: " + result.message);
                        document.body.style.cursor = 'default';
                        toggleButtons(false);
                    }
                });

                document.getElementById("delete-btn").addEventListener("click", async () => {
                    const response = await window.electronAPI.promptInvoke({ title: "Confirm ?", message: "Are you sure you want to delete this file?" });

                    if (!response) {
                        return;
                    }

                    toggleButtons(true);
                    document.body.style.cursor = 'wait';
                    const result = await window.electronAPI.deleteFile(item.fileURL);

                    if (result.success) {
                        showCustomAlert("Success", "File deleted successfully");
                        document.body.style.cursor = 'default';
                        toggleButtons(false);
                    } else {
                        showCustomAlert("Error", "Error deleting file: " + result.message);
                        document.body.style.cursor = 'default';
                        toggleButtons(false);
                    }
                    listbox.style.display = 'none';
                    hideBtn.style.display = 'none';
                    itemInfoCard.style.display = 'none';
                    overlay.style.display = 'none';
                });

                itemInfoCard.style.display = 'block';
                overlay.style.display = 'block';
            });
        });
    }

    listbox.style.display = 'block';
    hideBtn.style.display = 'block';
});


// Share key
document.querySelector("#share-button").addEventListener("click", async () => {
    await window.electronAPI.sharePublicKey();
});

// Password Management
// checkbox type input
document.querySelector("#enable-password-toggle").addEventListener("change", async () => {
    const passwordToggle = document.querySelector("#enable-password-toggle");
    if (!passwordToggle.checked) {
        const response = await window.electronAPI.unsetPassword();
        console.log(response);
    }
});

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.querySelector("#password-submit-btn").addEventListener("click", async () => {
    const passwordInput = document.querySelector("#password-input");
    const password = passwordInput.value;

    const hashedPassword = await hashPassword(password);

    const response = await window.electronAPI.setPassword(hashedPassword);

    if (response.success) {
        showCustomAlert("Success", "Password set successfully");
    } else {
        showCustomAlert("Error", "Error setting password: " + response.message);
    }
});