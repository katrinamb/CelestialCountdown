// create timer variable
let timer;

// a helper to retrieve data from storage using the chrome API
// storage get request is wrapped in a promise to prevent async querying
const getStorageData = key =>
  new Promise((resolve, reject) =>
    chrome.storage.sync.get([key], function(result) {
      chrome.runtime.lastError ? reject(Error(chrome.runtime.lastError.message)) : resolve(result[key]);
    })
  );

// trigger audio and display alert when timer ends
function timerEnded() {
  const myAudio = new Audio(chrome.runtime.getURL('old_town_road.mp3'));
  myAudio.play();
  clearInterval(timer);
  chrome.tabs.executeScript({
    code: `alert('Time to check on the celestial event!');`
  });
}

// a helper to format and return time left in mm:ss (or 'hh hrs')
function formatTime(duration) {
  // Time calculations for hours, minutes and seconds
  const hours = Math.floor(duration / (1000 * 3600));
  const minutes = Math.floor((duration % (1000 * 3600)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  // if multiple hours remain, format as "hh hrs" to prevent awkward UI in badge
  if (hours > 0) {
    return `${hours} hrs`;
  }
  return `${Math.max(0, minutes).toString().padStart(2, "0")}:${Math.max(0, seconds).toString().padStart(2, "0")}`;
}

// calculate time left and return text for badge countdown or play audio if time is up
function getTimeLeft(endTime) {
  const timeLeftUntilEnd = new Date(endTime) - new Date();
  if (timeLeftUntilEnd <= 0) {
    timerEnded();
    return '';
  }
  let message = formatTime(timeLeftUntilEnd);
  return message
}

// update badge timer text
async function setBadgeTimer() {
  let timerStartTime = await getStorageData('startTime');
  let timerEndTime = await getStorageData('endTime');
  // start timer if start time exists
  if (timerStartTime) {
    timer = setInterval(() => chrome.browserAction.setBadgeText({ text: getTimeLeft(timerEndTime) }), 10);
  } else {
    // reset timer to blank state
    chrome.browserAction.setBadgeText({ text: '' });
    clearInterval(timer);
  }
}

// initialize icon badge timer text
async function initializeBadgeTimer() {
  chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(async function(updatedStartTime) {
      if (updatedStartTime) {
        await setBadgeTimer();
      }
    });
  });
}
// initialize the background color for our countdown badge
chrome.browserAction.setBadgeBackgroundColor({ color: '#777' });
initializeBadgeTimer();
