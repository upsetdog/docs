// AGPL-3.0-only https://spdx.org/licenses/AGPL-3.0-or-later.html
// Modified from https://github.com/massgravel/msdl for use in AtlasOS documentation
// 
// Changes:
//  - Auto-selecting language, and removing 'Choose once'
//  - Removing table to download other versions
//  - Restructuring of script
//  - Simplification of certain functions like updateVars
//  - Fixes/adaptations for use in Atlas documentation

const langsUrl = "https://www.microsoft.com/en-us/api/controls/contentinclude/html?pageId=cd06bda8-ff9c-4a6e-912a-b92a21f42526&host=www.microsoft.com&segments=software-download%2cwindows11&query=&action=getskuinformationbyproductedition&sdVersion=2";
const downUrl = "https://www.microsoft.com/en-us/api/controls/contentinclude/html?pageId=cfa9e580-a81e-4a4b-a846-7b21bf4e2e5b&host=www.microsoft.com&segments=software-download%2Cwindows11&query=&action=GetProductDownloadLinksBySku&sdVersion=2";
const sessionUrl = "https://vlscppe.microsoft.com/fp/tags?org_id=y6jn8c31&session_id="

const apiUrl = "https://massgrave.dev/api/msdl/"
const sharedSessionGUID = "47cbc254-4a79-4be6-9866-9c625eb20911";

const sessionId = document.getElementById('msdl-session-id');
const msContent = document.getElementById('msdl-ms-content');
const pleaseWait = document.getElementById('msdl-please-wait');
const processingError = document.getElementById('msdl-processing-error');
const download = document.getElementById('msdl-download');
const downloadLink = document.getElementById('msdl-download-link');

let availableProducts = {};
let sharedSession = false;
let shouldUseSharedSession = true;
let attemptToGetFromServer = false;
let winProductID;
let isoLink;
let skuId;
let retry;

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

function updateVars() {
	skuId = JSON.parse(document.getElementById('product-languages').value)['id'];
}

function showError() {
	processingError.style.display = "block";
	pleaseWait.style.display = "none";
	msContent.style.display = "none";
}

function checkError(content, response) {
	content.innerHTML = response;
	let errorMessage = document.getElementById('errorModalMessage');

	console.log("Checking errors")

	if (errorMessage) {
		console.log("Error occured")
		showError()
		return false;
	}

	console.log("no errors")
	return true;
}

function downloadISO() {
    pleaseWait.style.display = "none";
	processingError.style.display = "none";

    if (!attemptToGetFromServer) {
        let elements = document.getElementsByClassName('product-download-hidden');
        for (let i = 0; i < elements.length; i++) {
            let jsonValue = elements[i].getAttribute('value');

            // Microsoft's response has invalid JSON, this fixes it
            if (jsonValue.includes("IsoX64")) {
                jsonValue = jsonValue.replace("IsoX64", "\"IsoX64\"");
            } else {
                continue;
            }
        
            let parsedValue = JSON.parse(jsonValue);
            if (parsedValue.DownloadType === "IsoX64") {
                isoLink = parsedValue.Uri
            }
        }
    } else {
        let isoLinkElement = this.querySelector('a:contains("Isox64")');
        if (isoLinkElement) {
            isoLink = isoLinkElement.getAttribute('href');
        } else {
            showError();
            return;
        }
    }
    
    if (isoLink.startsWith("https://software.download.prss.microsoft.com")) {
        downloadLink.setAttribute("href", isoLink)
        download.style.display = "block";
        window.location = isoLink;
    } else {
        showError();
    }
}

function displayResponseFromServer() {
	pleaseWait.style.display = "none";

	if (!(this.status == 200)) {
		showError();
		return;
	}

    let errorStatus = checkError(msContent, this.responseText);
    if (!(errorStatus) && attemptToGetFromServer) {
        showError();
        return;
    } else if (!(errorStatus)) {
        attemptToGetFromServer = true;
        getFromServer();
    }

	msContent.innerHTML = this.responseText
    if (retry)
        downloadISO();
}

function getFromServer() {
	processingError.style.display = "none";
	let url = apiUrl + "proxy" + "?product_id=" + winProductID +
		"&sku_id=" + skuId;
	let xhr = new XMLHttpRequest();
	xhr.onload = downloadISO;
	xhr.open("GET", url, true);
	xhr.send();
}

function useSharedSession() {
	sharedSession = true;
    retry = true;
	retryDownload();
}

function retryDownload() {
	pleaseWait.style.display = "block";
	processingError.style.display = 'none';

	// let url = langsUrl + "&productEditionId=" + winProductID + "&sessionId=" + sharedSessionGUID;
	let url = downUrl + "&skuId=" + skuId + "&sessionId=" + sharedSessionGUID;
	let xhr = new XMLHttpRequest();
	xhr.onload = displayResponseFromServer;
	xhr.open("GET", url);
	xhr.send();
}

function onDownloadsXhrChange() {
	if (!(this.status == 200)) {
		showError()
		return;
	}

    console.log("onDownloadsXhrChange")

	msContent.style.display = "block";

	let wasSuccessful = checkError(msContent, this.responseText);

	if (wasSuccessful) {
		pleaseWait.style.display = "none";
		if (!sharedSession) {
			fetch(sessionUrl + sharedSessionGUID);
			fetch(sessionUrl + "de40cb69-50a5-415e-a0e8-3cf1eed1b7cd");
			fetch(apiUrl + 'add_session?session_id=' + sessionId.value)
            console.log("was successful, shared session, download iso")
		}
        console.log("was successful, download iso")
        downloadISO();
	} else if (!sharedSession && shouldUseSharedSession) {
        console.log("was not successful, use shared sessiion")
		useSharedSession();
	} else {
        console.log("was not successful, get from server")
		getFromServer();
	}
}

function getDownload() {
	msContent.style.display = "none";
	pleaseWait.style.display = "block";

	let url = downUrl + "&skuId=" + skuId + "&sessionId=" + (sharedSession ? sharedSessionGUID : sessionId.value);

	let xhr = new XMLHttpRequest();
	xhr.onload = onDownloadsXhrChange;
	xhr.open("GET", url, true);
	xhr.send();
}

function onLanguageXhrChange() {
	if (!(this.status == 200))
		return;

	if (pleaseWait.style.display != "block")
		return;

	pleaseWait.style.display = "none";
	msContent.style.display = "block";

	if (!checkError(msContent, this.responseText))
		return;

	let submitSku = document.getElementById('submit-sku');
	submitSku.setAttribute("onClick", "getDownload();");
	submitSku.setAttribute("class", "md-button");

	let prodLang = document.getElementById('product-languages');
	prodLang.setAttribute("onChange", "updateVars();");

	if (prodLang) {
		let options = prodLang.options;
		let emptyRemoved = false;
		let englishSet = false;

		for (let i = options.length - 1; i >= 0; i--) {
			let option = options[i];
			let optionValue = option.value;

			if (optionValue === "") {
				prodLang.removeChild(option);
				emptyRemoved = true;
			} else if (optionValue.includes('language":"English"}')) {
				option.selected = true;
				englishSet = true;
			}

			if (englishSet && emptyRemoved) {
				break;
			}
		}
	}

	updateVars();
}

function getLanguages(productId) {
	let url = langsUrl + "&productEditionId=" + productId +
		"&sessionId=" + (sharedSession ? sharedSessionGUID : sessionId.value);

	let xhr = new XMLHttpRequest();
	xhr.onload = onLanguageXhrChange;
	xhr.open("GET", url, true);
	xhr.send();
}

function prepareDownload(id) {
	msContent.style.display = "none";
	processingError.style.display = "none";
	download.style.display = "none";
	pleaseWait.style.display = "block";

	getLanguages(id)
}

function getWindows(id) {
    sessionId.value = uuidv4();

    const xhr = new XMLHttpRequest();
	xhr.open("GET", sessionUrl + sessionId.value, true);
	xhr.send();

	let mxhr = new XMLHttpRequest();
	mxhr.onload = function() {
		if (this.status != 200) {
			shouldUseSharedSession = false;
		}
	};

	winProductID = id;
	prepareDownload(winProductID);
}