const LEGACY_ID_PARAM = 'ibraniatLegacyId';
const DEVICE_ID_PARAM = 'deviceId';
const IS_LEGACY_DATA_TRANSFERRED = 'IslegacyIbraniatDataTransferred';

const queryParams = new URLSearchParams(window.location.search);

const anonymousId = getAnonymousId();

function checkIfLegacyGameFinished() {
  return queryParams.get('isFinished');
}
async function getMeduyeketHistory() {

  const lastestData = await getDataFromMongo({ 
    anonymousId
  });
  return lastestData;
 
}


async function getDataFromMongo({ anonymousId }) {
  try {
    const dataResponse = await fetch(`https://ibraniat-word-game-default-rtdb.europe-west1.firebasedatabase.app/users/${anonymousId}/results.json`);
    
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      if (data && data != '{}') {
        return data;
      }
    }

    const errorObject = {
      status: 'error', 
      code: data.status, 
      errorType: data.statusText, 
    };

    return errorObject;

  } 
  catch (err) {
    return { status: 'error', };
  }
}

async function postDataToMongo({ anonymousId, results, }) {

  if (!anonymousId && !results) return

  const data = { 
    results,
  };

  const mongoResponse = await fetch(`https://ibraniat-word-game-default-rtdb.europe-west1.firebasedatabase.app/users/${anonymousId}.json`, {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "PUT"
  })


  if (mongoResponse.ok) {
    return { status: 'success', };
  } else {
    return { status: 'error', };
  }
}

async function getFormattedResults() {
  let results = [];
  const resultsToFormat = await getMeduyeketHistory();
  const resultsToFormatArr = Object.values(resultsToFormat) || [];
  for(i in resultsToFormatArr){
    results.push([resultsToFormatArr[i].successful ? resultsToFormatArr[i].wordsAttempted : 'X', resultsToFormatArr[i].hintUsed])
  }
  return results;
}

async function postFormattedResults(newResults) {
  //word id for result obj
  const dateForId = new Date().toLocaleDateString('he-IL', {timeZone: 'Asia/Jerusalem'});
  const todayWordId = getWordId(dateForId);
  let reversedNewResults = newResults.reverse();

  const results = {};
  reversedNewResults.map((result, i) => {
    let isSuccessful = !(result[0] === 'X'); 
    let newWordId = todayWordId - i;
    if (!newWordId) return;
    results[newWordId] = { successful: isSuccessful, wordsAttempted: isSuccessful ? result[0] : 6, hintUsed : result[1]};
  }) 

  await postDataToMongo({ anonymousId, results });
}

//get IDS
function getAnonymousId(){
  return getCookie('anonymousId') || generateAnonymousId();
}

//UTILS
function getCookie(cookieName) {
  let name = cookieName + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  
  let cookie = decodedCookie.split(';');
  for(let i = 0; i <cookie.length; i++) {
    let c = cookie[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function searchInCookie(name, cookie) {
  let result = cookie.split(':')
  .map(cookie => cookie.split('='))
  .filter(c => c.includes(name)).flat();

  return result;
}


function generateAnonymousId() {
  // console.log(`getCookie - 'anonymousId' : ${getCookie('anonymousId')}`);
  const salt = getRandomInt(1000, 9999); // random between 1000 - 9999
  const now = Date.now();
  const expire = new Date(now + 7776000000); // 90 * 24 * 3600 * 1000 = 7776000000 = 90 days
  const anonymousId = `${now}${salt}`;
  const domain = 'ibraniat-word-game.web.app';

  // Side effect: triggers a cookie reparsing
  setCookie('anonymousId', anonymousId, '/', domain, expire);
  return anonymousId;
}

function setCookie(
  key,
  value,
  path,
  domain,
  expiration = new Date(Date.now() + 31536000000) /* one year */
) {
  const params = [];
  const expires = expiration;
  params.push(`${key}=${encodeURIComponent(value)}`);

  if (path) {
    params.push(`path=${path}`);
  }
  if (domain) {
    params.push(`domain=${domain}`);
  }
  params.push(`expires=${expires.toUTCString()}`);

  document.cookie = params.join(';');
}

function getWordId(date) {
  const [day, month, year] = date.split('.').map(function(x) {return parseInt(x);});
  const start_ts = new Date(2022, 0, 1).getTime();
  const date_ts = new Date(year, month - 1, day).getTime();
  const wordId = Math.round((date_ts - start_ts) / 86400000);
  return wordId;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
}

function isObjIsEmpty(obj) {
  return Object.keys(obj).length === 0;
}