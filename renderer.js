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