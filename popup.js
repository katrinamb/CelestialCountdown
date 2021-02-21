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

// communication port to background script
const port = chrome.extension.connect({
  name: 'Communication'
});

// a helper to format and return time in hh:mm:ss
function formatTime(duration) {
  // Time calculations for hours, minutes and seconds
  const hours = Math.floor(duration / (1000 * 3600));
  const minutes = Math.floor((duration % (1000 * 3600)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);

  return `${Math.max(0, hours).toString().padStart(2, "0")}:${Math.max(0, minutes).toString().padStart(2, "0")}:${Math.max(0, seconds).toString().padStart(2, "0")}`;
}

// calculate time left and build a countdown message for popup.html
function getTimeLeft(endTime) {
  const timeLeftUntilEnd = new Date(endTime) - new Date();
  if (timeLeftUntilEnd <= 0) {
    return "Time to check on the celestial event!";
  }
  let message = formatTime(timeLeftUntilEnd);
  return message + ' left until celestial event!';
}

// change the values on popup.html
async function updatePopUpContents(timerStartTime, timerEndTime) {
  document.getElementById('startTimer').style.display = timerStartTime ? 'none' : 'inline';
  document.getElementById('resetTimer').style.display = timerStartTime ? 'inline' : 'none';
  if (timerStartTime) {
    // start timer
    timer = setInterval(function() {
      document.getElementById('timerHeader').innerHTML = timerStartTime ? `${getTimeLeft(timerEndTime)}` : '';
    }, 10);
  } else {
    // reset timer to blank state
    let seconds = await getStorageData('timerSeconds');
    document.getElementById('timerHeader').innerHTML = `Click the button to start your countdown for ${formatTime(seconds * 1000)}!`;
    clearInterval(timer);
  }
}

// set timer once start is clicked
async function setTimer(timerSeconds) {
  let start = new Date().getTime();
  let end = new Date(start + timerSeconds * 1000).getTime();
  // Run all async tasks at once, order does not matter
  await Promise.all([
    chrome.storage.sync.set({ endTime: end }),
    chrome.storage.sync.set({ startTime: start })
   ]);
  port.postMessage(true);
  updatePopUpContents(start, end);
}

// reset timer values in storage
async function resetTimer() {
  await chrome.storage.sync.set({ endTime : null})
  await chrome.storage.sync.set({ startTime : null})
  port.postMessage(true);
  updatePopUpContents();
}

document.addEventListener('DOMContentLoaded', async function() {
  // grab Chrome Storage Data
  let timerStartTime = await getStorageData('startTime');
  let timerEndTime = await getStorageData('endTime');
  let timerSeconds = await getStorageData('timerSeconds') || 0;

  // set up startTimer & resetTimer buttons on UI
  const startTimerButton = document.getElementById('startTimer');
  // TODO: create constant to reference the reset button in the UI
  const resetTimerButton = document.getElementById('resetTimer');

  startTimerButton.addEventListener('click', async function() {
    await setTimer(timerSeconds);
  });
  // TODO: set up the event listener so that the reset button calls resetTimer
  resetTimerButton.addEventListener('click', async function() {
    await resetTimer();
  });

  updatePopUpContents(timerStartTime, timerEndTime);
});

