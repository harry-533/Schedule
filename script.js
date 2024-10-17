// empty list to hold the leagues to check, and the teamIDs are for my specific teams
const leagueIds = [];
const teamIds = [10, 33];

const dayList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// gets the current date
const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentDay = currentDate.getDate();

// depending on the date adds different league id's to the list so that only certian leagues are checked (avoid extra api calls)
if (currentMonth == 6 && currentDay > 13 || currentMonth == 7 && currentDay < 15){
    leagueIds.push(4);
    leagueIds.push(9);
}
if (!(currentMonth >= 6 && currentMonth <= 7)){
    leagueIds.push(39);
}
if (!(currentMonth >= 4 && currentMonth <= 8)){
    leagueIds.push(48);
}
if (!(currentMonth >= 7 && currentMonth <= 8)){
    leagueIds.push(2);
}
if (currentMonth >= 1 && currentMonth <= 5){
    leagueIds.push(45);
}

// gets the start and end date of the current week
function getCurrentWeekDateRange() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Calculate the start of the week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    return { startDate, endDate, startOfWeek };
}

function checkDayOverlap(event) {
    let secondEvent = null;
    let totalTime = event['hour'] + event['duration'];
    if (totalTime > 24) {
        if (event['day'] == 'Sunday') {
            event['duration'] = 24 - event['hour'] - (event['minute'] / 60);
            event['eventHalf'] = 'first';
            let firstHalf = event;
            let secondHalf = secondEvent;
            return { firstHalf, secondHalf };
        }
        if (event['day'] != 'Sunday') {
            secondEvent = structuredClone(event);
            secondEvent['day'] = dayList[event['day']] == 'Saturday' ? 'Sunday' : dayList[dayList.indexOf(event['day']) + 1];
            secondEvent['duration'] = event['duration'] - (24 - event['hour']);
            secondEvent['hour'] = 0;
            secondEvent['eventHalf'] = 'second';
            secondEvent['minute'] = 0;
        }
        if (event['minute'] == 0) {
            event['duration'] = 24 - event['hour'];
        } else {
            event['duration'] = 24 - event['hour'] - (event['minute'] / 60);
            secondEvent['duration'] = secondEvent['duration'] + (event['minute'] / 60);
        }
        event['eventHalf'] = 'first';
        let firstHalf = event;
        let secondHalf = secondEvent;
        return { firstHalf, secondHalf };
    } else {
        let firstHalf = event;
        let secondHalf = secondEvent;
        return { firstHalf, secondHalf };
    }
}

async function checkDuplicateTimes(fixturesList) {
    for (let i = 0; i < fixturesList.length - 1; i++) {
        let checker = false;
        let duplicates = {
            'day': '',
            'hour': 0,
            'minute': 0,
            'events': [],
            'league': 'Multiple Events',
            'duration': 2
        };
        
        for (let j = i + 1; j < fixturesList.length; j++) {
            let jStartTime = fixturesList[j]['hour'] + (fixturesList[j]['minute'] / 100);
            let iStartTime = fixturesList[i]['hour'] + (fixturesList[i]['minute'] / 100);
            let jEndTime = jStartTime + fixturesList[j]['duration'];
            let iEndTime = iStartTime + fixturesList[i]['duration'];

            if ((!(jStartTime > iEndTime)) && (!(jEndTime < iStartTime)) && (fixturesList[i]['day'] == fixturesList[j]['day'])) {
                if (!checker) {
                    checker = true;
                    duplicates['hour'] = fixturesList[i]['hour'];
                    duplicates['day'] = fixturesList[i]['day'];
                    duplicates['events'].push(fixturesList[i]);
                }
                duplicates['events'].push(fixturesList[j]);
                fixturesList.splice(j, 1);
                j--;
            }
        }
        
        if (checker) {
            fixturesList.splice(i, 1);
            console.log(duplicates)
            fixturesList.push(duplicates);
            i--;
        }
    }
}

async function fetchGames(id, specifier) {
    const { startDate, endDate } = getCurrentWeekDateRange();
    const url = `https://v3.football.api-sports.io/fixtures?${specifier}=${id}&season=2024&from=${startDate}&to=${endDate}&timezone=Europe/London`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'x-apisports-key': apiKey }
        });

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();

        let fixtureList = [];
        const leagueIdList = [4, 9, 39, 48, 2, 45];

        for (let i = 0; i < data.response.length; i++) {
            if ((specifier == 'team' && !leagueIdList.includes(data.response[i]['league']['id'])) || specifier == 'league'){
                try {
                    let fixtureDate = new Date(data.response[i]['fixture']['date']);
                    let fixtureDay = fixtureDate.getDay();

                    let fixtureHour = fixtureDate.getHours();
                    let fixtureMinute = fixtureDate.getMinutes();
                    let fixtureStatus = data.response[i]['fixture']['status']['short'];
                    let fixtureLeague = data.response[i]['league']['name'];
                    let fixtureHome = data.response[i]['teams']['home']['name'];
                    let fixtureAway = data.response[i]['teams']['away']['name'];
                    let homeGoals = data.response[i]['goals']['home'];
                    let awayGoals = data.response[i]['goals']['away'];

                    let fixtureDict = {
                        'day':dayList[fixtureDay],
                        'hour':fixtureHour, 
                        'minute':fixtureMinute, 
                        'status':fixtureStatus,
                        'league':fixtureLeague,
                        'homeTeam':fixtureHome,
                        'awayTeam':fixtureAway,
                        'homeGoals':homeGoals,
                        'awayGoals':awayGoals,
                        'duration':2,
                        'sport':'Football'
                    };
                    
                    const { firstHalf, secondHalf } = checkDayOverlap(fixtureDict);
                    fixtureList.push(firstHalf);
                    if (secondHalf != null) {
                        fixtureList.push(secondHalf);
                    }
                } catch (error) {
                    
                }
            }
        }
        return fixtureList;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function fetchRaces() {
    const url = 'https://v1.formula-1.api-sports.io/races?next=10&timezone=Europe/London'

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'x-apisports-key': apiKey }
        });

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        let data = await response.json();

        let raceType;
        let fixtureList = [];

        for (let i = 0; i < data.response.length; i++) {
            try {
                let raceDate = new Date(data.response[i]['date']);
                if (i < 11) {
                    const {startDate, endDate, startOfWeek} = getCurrentWeekDateRange();
                    let dayList = [];
                    for (let i = 0; i < 7; i++) {
                        let weekDay = new Date();
                        weekDay.setDate(startOfWeek.getDate() + i);
                        weekDay = weekDay.toISOString().split('T')[0];
                        dayList.push(weekDay);
                    }
                    let raceDateString = raceDate.toISOString().split('T')[0];
                    if (!dayList.includes(raceDateString)) {
                        return null;
                    }
                }
                let raceDay = raceDate.getDay();
                let raceHour = raceDate.getHours();
                let raceMinute = raceDate.getMinutes();
                let raceTrack = data.response[i]['circuit']['name'];
                let raceName = data.response[i]['competition']['name'];
                let raceDuration;

                if (data.response[i]['type'].slice(-8) == 'Practice') {
                    raceType = `FP${i + 1}`
                    raceDuration = 1;
                } else if (data.response[i]['type'].slice(-10) == 'Qualifying') {
                    raceType = 'Qualifying';
                    raceDuration = 1;
                    i += 2;
                } else if (data.response[i]['type'].slice(-8) == 'Shootout') {
                    raceType = 'Sprint Qualifying';
                    raceDuration = 1;
                    i += 2;
                } else if (data.response[i]['type'] == 'Race') {
                    raceType = data.response[i]['type'];
                    raceDuration = 2;
                } else {
                    raceType = data.response[i]['type'];
                    raceDuration = 1;
                }


                const raceDict = {
                    'day':dayList[raceDay],
                    'hour':raceHour,
                    'minute':raceMinute,
                    'name':raceName,
                    'track':raceTrack,
                    'type':raceType,
                    'duration':raceDuration,
                    'sport':'F1'
                }

                const { firstHalf, secondHalf } = checkDayOverlap(raceDict);
                fixtureList.push(firstHalf);
                if (secondHalf != null) {
                    fixtureList.push(secondHalf);
                }
            } catch (error) {
                
            }
            if (raceType == 'Race') {
                break
            }
        }
        return fixtureList;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function fetchNFL() {
    const {startDate, endDate, startOfWeek} = getCurrentWeekDateRange();
    let nflList = [];
    for (let i = 0; i < 7; i++) {
        let newDay = new Date();
        newDay.setDate(startOfWeek.getDate() + i);
        newDay = newDay.toISOString().split('T')[0]
        const url = `https://v1.american-football.api-sports.io/games?team=17&date=${newDay}&timezone=Europe/London`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'x-apisports-key': apiKey }
            });
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.response.length == 0) {
                continue;
            }


            for (let i = 0; i < data.response.length; i++) {
                try {
                    let nflDate = new Date(data.response[i]['game']['date']['date']);
                    let nflDay = dayList[nflDate.getDay()];
                    let nflTime = data.response[i]['game']['date']['time'];
                    let nflHour = nflTime.split(':')[0];
                    let nflMinute = nflTime.split(':')[1];
                    let nflStatus = data.response[i]['game']['status']['short'];
                    let nflHomeTeam = data.response[i]['teams']['home']['name'].split(" ").pop();
                    let nflAwayTeam = data.response[i]['teams']['away']['name'].split(" ").pop();
                    let nflHomeScore = data.response[i]['scores']['home']['total'];
                    let nflAwayScore = data.response[i]['scores']['away']['total'];

                    let nflDict = {
                        'day':nflDay,
                        'hour':nflHour,
                        'minute':nflMinute,
                        'homeTeam':nflHomeTeam,
                        'homeScore':nflHomeScore,
                        'awayTeam':nflAwayTeam,
                        'awayScore':nflAwayScore,
                        'status':nflStatus,
                        'duration':3,
                        'sport':'NFL'
                    }
                    const { firstHalf, secondHalf } = checkDayOverlap(nflDict);
                    nflList.push(firstHalf);
                    if (secondHalf != null) {
                        nflList.push(secondHalf);
                    }
                } catch (error) {
                    
                }
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
    return nflList;
}

let fixturesList = [];

fixturesList.push(fetchRaces());

leagueIds.forEach(function(leagueId){
    fixturesList.push(fetchGames(leagueId, 'league'));
});

teamIds.forEach(function(teamId){
    fixturesList.push(fetchGames(teamId, 'team'));
});

fixturesList.push(fetchNFL());


async function getDictionaries(promiseList) {
    try {
        const Tournaments = await promiseList;
        events = []
        for (let i = 0; i < Tournaments.length; i++) {
            let currentTournament = await Tournaments[i];

            for (let j = 0; j < currentTournament.length; j++) {
                events.push(currentTournament[j]);
            }
        }
    } catch (error) {
    }
    return events;
}

async function main() {
    document.addEventListener('DOMContentLoaded', async function() {

        const events = await getDictionaries(fixturesList);
        checkDuplicateTimes(events);

        const currentDate = new Date();
        const today = dayList[currentDate.getDay()];
        currentDayColumn = document.querySelector(`[data-day=${today}]`);
        currentDayColumn.style.backgroundColor = '#fafafa';

        const startMinute = Math.round(parseInt(currentDate.getMinutes()) / 5);
        startRow = currentDate.getHours() * 12 + (startMinute);

        const timeElement = document.querySelectorAll('.time');
        timeElement.forEach(time => {
            time.style.gridRowStart = startRow;
            time.scrollIntoView({ behavior: 'smooth', block:'center' });
        })
        events.forEach(event => {
            let halfCheck = '';
            if (event.eventHalf) {
                if (event.eventHalf == 'first') {
                    halfCheck = 'first'
                } else if (event.eventHalf == 'second') {
                    halfCheck = 'second'
                }
            }
            const eventElement = document.createElement('div');
            eventElement.className = 'event';

            if (halfCheck == 'first'  || halfCheck == '') {
                const sportElement = document.createElement('p');
                sportElement.className = 'sport';
                if (event.league){
                    sportElement.textContent = event.league;
                } else if (event.sport == 'NFL') {
                    sportElement.textContent = event.sport;
                    sportElement.style.fontSize = '40px';
                    sportElement.style.paddingBottom = '25px';
                } else {
                    let fontsize = 21;
                    if (event.name.length > 15) {
                        fontsize = fontsize - ((event.name.length - 15) * 0.8);
                    }
                    sportElement.style.fontSize = `${fontsize}px`;
                    sportElement.textContent = event.name;
                    sportElement.style.paddingTop = '5px';
                    if (event.duration == 2) {
                        sportElement.style.paddingBottom = '20px';
                        sportElement.style.paddingTop = '8px';
                    } else {
                        sportElement.style.paddingTop = '0px';
                    }
                }
                if (event.duration < 1) {
                    sportElement.style.padding = '0px';
                }
                eventElement.appendChild(sportElement);
            }

            if (halfCheck == 'second' || halfCheck == '') {
                const teamElement = document.createElement('div');
                let fontsize = 25;
                teamElement.className = 'team';
                if (event.homeTeam) {
                    const teamLength = event.homeTeam.length + event.awayTeam.length;
                    if (teamLength > 15) {
                        fontsize = fontsize - ((teamLength - 15) * 3.5);
                    }
                    teamElement.textContent = `${event.homeTeam} vs ${event.awayTeam}`;
                    if (event.sport == 'NFL') {
                        teamElement.style.paddingBottom = '15px'
                    }
                } else if (event.type) {
                    if (event.duration == 1){
                        const meridiam = event.hour >= 12 ? 'pm' : 'am'
                        if (parseInt(event.minute) > 9) {
                            teamElement.textContent = `${event.type} - ${event.hour}:${event.minute}${meridiam}`;
                        } else {
                            teamElement.textContent = `${event.type} - ${event.hour}:0${event.minute}${meridiam}`;
                        }
                        fontsize = 17;
                        teamElement.style.paddingBottom = '5px';
                    } else {
                        teamElement.textContent = `${event.type}`;
                    }
                }
                teamElement.style.fontSize = `15px`;
                eventElement.appendChild(teamElement);
            }

            if (halfCheck == 'second' || halfCheck == '') {
                if (event.duration > 1){
                    const scoreElement = document.createElement('div');
                    scoreElement.className = 'score';
                    if (event.sport == 'F1') {
                        scoreElement.style.fontSize = '20px'
                    }
                    if (event.status == 'FT') {
                        scoreElement.textContent = `${event.homeGoals} - ${event.awayGoals}`;
                    } else if (event.homeScore != null) {
                        scoreElement.textContent = `${event.homeScore} - ${event.awayScore}`;
                    } else {
                        const meridiam = event.hour >= 12 ? 'pm' : 'am'
                        if (parseInt(event.minute) > 9) {
                            scoreElement.textContent = `${event.hour}:${event.minute}${meridiam}`;
                        } else {
                            scoreElement.textContent = `${event.hour}:0${event.minute}${meridiam}`;
                        }
                    }
                    eventElement.appendChild(scoreElement);
                }
            }

            if (event.events) {
                const popupElement = document.createElement('div');
                popupElement.className = 'info';
                popupElement.addEventListener('click', function() {
                    const information = document.querySelector('.info');
                    information.style.display = 'none';
                });
                const popupOverlay = document.createElement('div');
                popupOverlay.className = 'info-backdrop'
                const fixtureTitle = document.createElement('h1');
                fixtureTitle.className = 'pop-title';
                fixtureTitle.textContent = 'Multiple Events';
                popupElement.appendChild(fixtureTitle);
                popupElement.appendChild(popupOverlay);
                event.events.forEach(entry => {
                    const fixtureElement = document.createElement('p');
                    let newSentence;
                    let time = parseInt(entry['minute']) > 9 ? entry['minute'] : `0${entry['minute']}`;
                    let timeEnd = parseInt(entry['hour']) > 12 ? 'pm' : 'am'
                    if (entry['sport'] == 'F1') {
                        newSentence = `${entry['name']} - ${entry['type']} - ${entry['hour']}:${time}${timeEnd}`;
                    } else {
                        newSentence = `${entry['homeTeam']} vs ${entry['awayTeam']} - ${entry['league']} - ${entry['hour']}:${time}${timeEnd}`;
                    }
                    fixtureElement.textContent = newSentence;
                    popupElement.appendChild(fixtureElement);
                })
                const windowElement = document.querySelector('.schedule');
                windowElement.appendChild(popupElement);
            }
        
            const dayColumn = document.querySelector(`.day-column[data-day="${event.day}"]`);

            if (dayColumn) {
                let startRow;
                if (event.minute == '0'){
                    startRow = parseInt(event.hour) * 12 + 1;
                } else {
                    const startMinute = Math.round(parseInt(event.minute) / 5);
                    startRow = parseInt(event.hour) * 12 + (1 + startMinute)
                }
                eventElement.style.gridRowStart = startRow;
                eventElement.style.gridRowEnd = `span ${Math.round(event.duration * 12)}`;
                if (event.sport == 'Football') {
                    if (event.league == 'Premier League') {
                        eventElement.style.border = '1px solid #3a185a';
                        eventElement.style.backgroundColor = '#ead8fa';
                    } else if (event.league == 'Fa Cup') {
                        eventElement.style.border = '1px solid #afafaf';
                        eventElement.style.backgroundColor = '#f8f8f8';
                    } else if (event.league == 'Caraboa Cup') {
                        eventElement.style.border = '1px solid #048c5c';
                        eventElement.style.backgroundColor = '#e2faf2';
                    } else if (event.league == 'UCL') {
                        eventElement.style.border = '1px solid #050f4b';
                        eventElement.style.backgroundColor = '#d5daf9';
                    } else if (event.league == 'UEL') {
                        eventElement.style.border = '1px solid #ff6900';
                        eventElement.style.backgroundColor = '#f9e6d9';
                    } else if (event.league == 'Euro Championship') {
                        eventElement.style.border = '1px solid #1f47dd';
                        eventElement.style.backgroundColor = '#d7def7';
                    } else if (event.league == 'Copa America') {
                        eventElement.style.border = '1px solid #00298f';
                        eventElement.style.backgroundColor = '#d7e1f9';
                    } else if (event.league == 'World Cup') {
                        eventElement.style.border = '1px solid #ba9841';
                        eventElement.style.backgroundColor = '#f9f0db';
                    } else {
                        eventElement.style.border = '1px solid #3a185a';
                        eventElement.style.backgroundColor = '#ead8fa';
                    }
                } else if (event.sport == 'F1') {
                    eventElement.style.border = '1px solid #ab0000';
                    eventElement.style.backgroundColor = '#fae0e0';
                    eventElement.style.fontFamily = 'F1';
                } else if (event.sport == 'NFL') {
                    eventElement.style.border = '1px solid #005eab';
                    eventElement.style.backgroundColor = '#e0ecfa';
                    eventElement.style.fontFamily = 'NFL';
                } else if (event.events){
                    eventElement.style.border = '1px solid #626262';
                    eventElement.style.backgroundColor = '#dcdcdc';
                    eventElement.addEventListener('mouseover', function() {
                        eventElement.style.cursor = 'pointer';
                    });
                    eventElement.addEventListener('mouseout', function() {
                        eventElement.style.cursor = 'default';
                    });

                    eventElement.addEventListener('click', function() {
                        const information = document.querySelector('.info');
                        information.style.display = 'block';
                        information.scrollIntoView({ behavior: 'smooth', block:'center' });
                        document.querySelector('.info-backdrop').style.display = 'block';
                    })
                }
                dayColumn.appendChild(eventElement);
            }
        });
    })
}

main();