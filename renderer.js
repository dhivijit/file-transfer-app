function showCustomAlert(title, message) {
    window.electronAPI.alertInvoke({ title, message });
}

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