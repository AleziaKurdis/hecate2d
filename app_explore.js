"use strict";
//
//  app_explore.js
//
//  Created by Alezia Kurdis, May 3rd, 2021.
//  Copyright 2021 Vircadia and contributors.
//
//  Generate an exploration app based on the places api.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app_explore.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    var placeApiUrl = "https://metaverse.vircadia.com/live/api/v1/places?current_page=1&per_page=1000"; 
    var placesHttpRequest = null;
    var placesData;
    var portalList = [];;
    var imagePlaceHolderUrl = ROOT + "placeholder.jpg";
    var teleporterSoundFileUrl = ROOT + "tpsound.mp3";
    var placeHistorySettingValue;
    var placeHistorySettingName = "3D_GOTO_PLACES_HISTORY";
    var defaultPlaceHistorySettingValue = { "visitedPlacesHistory": [] };
    var frequentPlaces = {};
    var MIN_FREQUENCY_TO_BE_CONSIDERED = 3;
    var MAX_PLACE_HISTORY_ELEMENTS = 30;
    var PERSISTENCE_ORDERING_CYCLE = 5 * 24 * 3600 * 1000; //5 days    
    
    var APP_NAME = "GOTO";
    var APP_URL = ROOT + "explore.html";
    var APP_ICON_INACTIVE = ROOT + "appicon_i.png";
    var APP_ICON_ACTIVE = ROOT + "appicon_a.png";
    var appStatus = false;
    var channel = "vircadia-ak-goto";
    var timestamp = 0;
    var INTERCALL_DELAY = 3000; //3 sec
    
    var teleportSound = SoundCache.getSound(teleporterSoundFileUrl);
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE,
        sortOrder: 8
    });


    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
            tablet.gotoHomeScreen();
            appStatus = false;
        } else {
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onMoreAppWebEventReceived);
            appStatus = true;
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);


    function onMoreAppWebEventReceived(message) {
        var d = new Date();
        var n = d.getTime();
        
        var messageObj = JSON.parse(message);
        if (messageObj.channel === channel) {
            if (messageObj.action === "READY_FOR_CONTENT" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                transmitPortalList();
            } else if (messageObj.action === "TELEPORT" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();

                if (messageObj.address.length > 0) {
                    playSound();

                    updateVisitedPlacesHistorySetting(messageObj.placeID);

                    var timer = Script.setTimeout(function () {
                        Window.location = "hifi://" + messageObj.address;
                        clicked();
                    }, 2000);

                }                
                
            }
        }
    }

    function onScreenChanged(type, url) {
        if (type == "Web" && url.indexOf(APP_URL) != -1) {
            appStatus = true;
        } else {
            appStatus = false;
        }
        
        button.editProperties({
            isActive: appStatus
        });
    }

    function transmitPortalList() {
        portalList = [];
        
        placeHistorySettingValue = Settings.getValue(placeHistorySettingName, defaultPlaceHistorySettingValue);
        frequentPlaces = getFrequentPlaces(placeHistorySettingValue.visitedPlacesHistory);

        getPlacesContent(placeApiUrl + "&acash=" + Math.floor(Math.random() * 999999));
    };
    
    function getPlacesContent(apiUrl) {
        placesHttpRequest = new XMLHttpRequest();
        placesHttpRequest.requestComplete.connect(placesGetResponseStatus);
        placesHttpRequest.open("GET", apiUrl);
        placesHttpRequest.send();
    }

    function placesGetResponseStatus() {
        if (placesHttpRequest.status === 200) {
            placesData = placesHttpRequest.responseText;
            try {
                placesData = JSON.parse(placesHttpRequest.responseText);
            } catch(e) {
                placesData = {};
            }
        }
        
        placesHttpRequest.requestComplete.disconnect(placesGetResponseStatus);
        placesHttpRequest = null;
        
        processData();
         var message = {
            "channel": channel,
            "action": "PLACE_DATA",
            "data": portalList
        };

        tablet.emitScriptEvent(message);
    }
    
    function processData(){
        var isConnectedUser = AccountServices.isLoggedIn();
        var supportedProtocole = Window.protocolSignature();
            
        var places = placesData.data.places;
        for (var i = 0;i < places.length; i++) {
            var score = 99980;
            var category = "";
            var accessStatus = "NOBODY";
            
            var description = (places[i].description ? places[i].description : "");
            var thumbnail = (places[i].thumbnail ? places[i].thumbnail : "");
            
            score = score - places[i].current_attendance;
            
            if ( places[i].current_attendance > 0 ) {
                score = score - 20;
            }
            
            if ( places[i].domain.protocol_version === supportedProtocole ) {
                if ( places[i].domain.active ) {                  

                    if ( thumbnail.substr(0, 4).toLocaleLowerCase() !== "http") {
                        score = score + 4;
                    }

                    if (description === "") {
                        score = score + 3;
                    }

                    if (thumbnail.substr(0, 4).toLocaleLowerCase() !== "http" && description === "") {
                        category = "STONE";
                        thumbnail = imagePlaceHolderUrl;
                    } else {
                        if ( thumbnail.substr(0, 4).toLocaleLowerCase() !== "http" && description !== ""){
                            category = "IRON";
                            thumbnail = imagePlaceHolderUrl;
                        } else {
                            if (thumbnail.substr(0, 4).toLocaleLowerCase() === "http" && description === "") {
                                category = "BRONZE";
                            } else {
                                category = "SILVER";
                            }
                        }
                    }
                    
                    if (places[i].current_attendance > 0) {
                        category = "GOLD";
                        if (places[i].current_attendance >= 1000) { //Once supported: places[i].capacity instead of 1000
                            accessStatus = "FULL";
                        } else {
                            accessStatus = "PEOPLE";
                        }
                    }
                    
                    if (frequentPlaces[places[i].id] >= MIN_FREQUENCY_TO_BE_CONSIDERED) {
                        score = MAX_PLACE_HISTORY_ELEMENTS - frequentPlaces[places[i].id];
                        category = "BLUESTEAL";
                    }                    

                    var portal = {
                        "order": zeroPad(score,5) + "_" + getSeededRandomForString(places[i].name),
                        "category": category,
                        "accessStatus": accessStatus,
                        "name": places[i].name,
                        "description": description,
                        "thumbnail": thumbnail,
                        "maturity": places[i].maturity,
                        "address": places[i].address,
                        "current_attendance": places[i].current_attendance,
                        "id": places[i].id,
                        "visibility": places[i].visibility,
                        "capacity": 1000
                    };
                    portalList.push(portal);   
                }
            }
        }
        
        //Elect the promoted Silver place (RUBY class)
        var randomItem;
        var n = 0;
        while (n < 100) {
            randomItem = Math.floor(Math.random() * portalList.length);
            if (portalList[randomItem].category === "SILVER") {
                portalList[randomItem].category = "RUBY";
                portalList[randomItem].order = "00001A_000";
                break;
            }
            n++;
        }
        
        portalList.sort(sortOrder);
    }

    function sortOrder(a, b) {
        var orderA = a.order.toUpperCase();
        var orderB = b.order.toUpperCase();
        if (orderA > orderB) {
            return 1;    
        } else if (orderA < orderB) {
            return -1;
        }
        if (a.order > b.order) {
            return 1;    
        } else if (a.order < b.order) {
            return -1;
        }
        return 0;
    }

    function zeroPad(num, places) {
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join("0") + num;
    }

    function getFrequentPlaces(list) {
        var count = {};
        list.forEach(function(list) {
            count[list] = (count[list] || 0) + 1;
        });
        return count;
    }

    //####### seed random library ################
    Math.seed = 75;

    Math.seededRandom = function(max, min) {
        max = max || 1;
        min = min || 0;
        Math.seed = (Math.seed * 9301 + 49297) % 233280;
        var rnd = Math.seed / 233280;
        return min + rnd * (max - min);
    }

    function getSringScore(str) {
        var score = 0;
        for (var j = 0; j < str.length; j++){
            score += str.charAt(j).charCodeAt(0) - ('a').charCodeAt(0) + 1;
        }
        return score;
    }

    function getSeededRandomForString(str) {
        var score = getSringScore(str);
        var d = new Date();
        var n = d.getTime();
        var currentSeed = Math.floor(n / PERSISTENCE_ORDERING_CYCLE);
        Math.seed = score * currentSeed;
        return zeroPad(Math.floor(Math.seededRandom() * 1000),3);
    }
    //####### END of seed random library ################

    function playSound() {
        Audio.playSound(teleportSound, { volume: 0.3, localOnly: true });
    };

    function updateVisitedPlacesHistorySetting(id) {
        var newVisitedPlacesHistory = [];
        newVisitedPlacesHistory.push(id);

        for (var j = 0; j < placeHistorySettingValue.visitedPlacesHistory.length; j++) {
            if (newVisitedPlacesHistory.length < MAX_PLACE_HISTORY_ELEMENTS) {
                newVisitedPlacesHistory.push(placeHistorySettingValue.visitedPlacesHistory[j]);
            } else {
                break;
            }
        }

        var newSettingValue = { "visitedPlacesHistory": newVisitedPlacesHistory };
        Settings.setValue(placeHistorySettingName, newSettingValue);
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
