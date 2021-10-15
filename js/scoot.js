/**
 * Configuration file for the Google Map, Firebase API credentials and login requirements
*/
const CONFIG = {
        MAP:{
            API:{
                apiKey: "AIzaSyCi5CthD5sgnYbdaXnPFmzVoxmniwAVrJc",
            },
            ICONS:{       
                startPosIcon: "http://maps.google.com/mapfiles/kml/paddle/grn-stars.png",
                endPosIcon: "http://maps.google.com/mapfiles/kml/paddle/red-stars.png",
                curPosIcon: "http://maps.google.com/mapfiles/kml/shapes/man.png",
            },
            ANIMATION:{
                speed:30, // => Less is faster 
                pathColor: "#DD4B3E",
                iconColor: "#21A461",
                pathWeight:5,
            },
        },
        FIREBASE:{
            apiKey: "AIzaSyAoSnPo148ZRgGQDHXlPnNweY3sfuMTbYY",
            authDomain: "mwafma-958ed.firebaseapp.com",
            databaseURL: "https://mwafma-958ed-default-rtdb.europe-west1.firebasedatabase.app",
            storageBucket: "mwafma-958ed.appspot.com"
        },
        LOGIN: {
            emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            passRegex: /^(?=.{4,})/,
        } 
}

let favourites = JSON.parse(localStorage.getItem('favourites'));
let page = window.location.pathname.split("/").pop(); 
let urlParams = new URLSearchParams(window.location.search);
const conn = firebase.initializeApp(CONFIG.FIREBASE); 
const validEmail = email => { return CONFIG.LOGIN.emailRegex.test(email)}
const validPass = pass => { return CONFIG.LOGIN.passRegex.test(pass)}

/**
 * Redirects a call for https://titan.dcs.bbk.ac.uk/~user/mwafma/ to https://titan.dcs.bbk.ac.uk/~user/mwafma/index.html
 */
if(page.split(".").length !== 2){
	window.location.href= "index.html";
}

/**
 * Function removeFavourite finds the passed item for removal inside the LocalStorage and removes it if exists
 * 
 * @param {Number} itemValue
 */
const removeFavourite = itemValue =>{
    let filtered = favourites.filter(value =>{ 
        return value !== itemValue;
    });
    localStorage.setItem("favourites", JSON.stringify(filtered));
    $("#favouriteModal").modal("toggle");
    $("#favourite-added").append(`<p class="title b font-weight-bold size bg-danger text-white text-center" style="--fsize:2rem">Route was removed from yout favourites !</p>`); 
    $("#close-favor").on("click", е =>{window.location.reload()});
}

/**
 * Function refreshFavCounter refresh the favourites counter values in the navigation
 */
const refreshFavCounter = () => {
    $("#favourites-count p").remove();
    if(favourites !== null){
        if(favourites.length > 0){
            $("#favourites-count").removeClass("bi-bookmark-heart");
            $("#favourites-count").addClass("bi-bookmark-heart-fill");
            $("#favourites-count").append(`<p class="d-inline"> ${favourites.length}</p>`);     
        }
    }
}

/**
 * Function mapLoader takes the starting and ending point coorditates to retrive the path position on the map. 
 * Draw a line/path between the points. Check for the user current location and places a marker. 
 * It trows an error as alert if the browser does not support navigation API or the user has not given a permition for that.
 * Creates an animation with a foreward arrow
 * 
 * @param {Array} coord => Contains [Start Latitude, Start Longitude, End Latitude, End Longitude] each element in a floatpoint notaiton
 */
const mapLoader = coord =>{
    
    const map = new google.maps.Map(document.getElementById("map"), {
        center: {lat:coord[0], lng: coord[1]},
        zoom: 13,
        tilt: 60
    });
    let markers  = [
        {coords:{lat:coord[0], lon:coord[1]}, icon:CONFIG.MAP.ICONS.startPosIcon, text:"Scoot trip starting point location", animation: google.maps.Animation.DROP},
        {coords:{lat:coord[2], lon:coord[3]}, icon:CONFIG.MAP.ICONS.endPosIcon, text:"Scoot trip ending point location", animation: google.maps.Animation.DROP},
    ]

    if(navigator.geolocation){
        navigator.permissions.query({name:'geolocation'}).then(result => {
            if (result.state === 'granted') {
                navigator.geolocation.getCurrentPosition(position =>{
                    new google.maps.Marker({
                        map:map, 
                        position:{lat:parseFloat(position.coords.latitude), lng:parseFloat(position.coords.longitude)},
                        title: "Your current location",
                        animation:  google.maps.Animation.BOUNCE,
                        icon: CONFIG.MAP.ICONS.curPosIcon
                    });          
                })
            }
            else{
				if(window.location.protocol != "https"){
					alert("Your location can not be determinated because the hosting does not have SSL encryption. HTTPS is required !");
				}
				else{
					alert(`Your location can not be determinated because the there is no permition !`);
				}
            }
          });
    }
    else{
        alert("Location service is not supported by your browser. Your location will not be displayed on the map");
    }

    const animate = mapPath => {
        const icons = mapPath.get("icons");
        let i = 0;
        window.setInterval(e => {
            mapPath.set("icons", icons);  
            icons[0].offset = i % 100 + "%"; 
            i++;   
        }, CONFIG.MAP.ANIMATION.speed);
    }

    const mapPath = new google.maps.Polyline({
        map: map,
        path: [
            {lat:coord[0], lng:coord[1]},
            {lat:coord[2], lng:coord[3]}
        ],
        strokeColor: CONFIG.MAP.ANIMATION.pathColor,
        strokeWeight: CONFIG.MAP.ANIMATION.pathWeight,
        icons: [{
              icon: {
                path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,    
                strokeColor: CONFIG.MAP.ANIMATION.iconColor,
                },
              offset: "100%",
            },
        ]});
    for(let i in markers){
        new google.maps.Marker({
                map:map, 
                position:{lat:markers[i].coords.lat, lng:markers[i].coords.lon},
                title: markers[i].text,
                animation: markers[i].animation,
                icon: markers[i].icon
            }
        )
    }
    animate(mapPath);
}

/**
 * Function loadPage loads a new page based on the passed arguments
 * 
 * @param {Object} element // Jquery selector
 * @param {String} pageToLoad //Page that will be loaded
 * @param {Strng} event //Event to be listened to. The default is onlick event
 */

const loadPage  = (element, pageToLoad, event="click") => {
    $(element).on(event, ()=>{
        window.location.href= window.location.pathname.replace(page, pageToLoad);
    });
}

/**
 * Listener for user status. If the user is logged it changes the icon style and adds his/her account name.
 * It also desplay messages on the login form
 */
conn.auth().onAuthStateChanged(user =>{
    if(user){
        $("#login-form").addClass("d-none");
        $("#logged-as").removeClass("bi-lock");
        $("#logged-as").addClass("bi-lock-fill");
        document.getElementById("logged-as").innerHTML = `<p class="d-inline"> ${user.email}</p>`;
        if(page === "login.html"){
            $("#form-container").append(
                `<div class="containter d-block text-center" id="loggedin">
                    <div class="row d-block">
                        <p class="title bg-grey font-weight-bold size text-black text-center" style="--fsize:2rem">
                            <p>You are currenly logged in as <i class="text-success font-weight-bold">${user.email}</i> !</p>
                            <p>Your email is ${user.emailVerified? "<i class='text-success font-weight-bold'>verified</i>":"<i class='text-danger font-weight-bold'>unverified</i>"} !</p>
                        </p>
                        <button class="btn btn-warning" id="loggout">Logout</button>
                    </div>
                 </div>
                `);
            $("#loggout").on("click", e =>{  		
                    conn.auth().signOut();  
					$("#loggedin").remove();
					$("#logged-as p").remove();
					$("#logged-as").removeClass("bi-lock-fill");
					$("#logged-as").addClass("bi-lock");
                }
            );
        }                    
    }
    else{
        $("#login-form").removeClass("d-none");
    }
}); 

loadPage("#favourites-count", "favourites.html");
loadPage("#logged-as", "login.html");

window.onload = () => {

    refreshFavCounter();

    if(window.localStorage.getItem("favourites") === null){
        window.localStorage.setItem("favourites", JSON.stringify([]));
    }

    if(page === "guides.html" || page === "login.html"){
        if(page === "guides.html"){
            const data = conn.database().ref().child("guides").orderByChild("Last Name");
            data.on("child_added", parse =>{      
                if(parse.child("Blue Badge").val() === "Yes"){
                    $("#guides-data").append(`
                        <div class="col-lg-3 mb-2">
                            <div class="card text-center opacity-4 hover box-shadow-inset">
                                <div class="card-header title" style="--size:2rem">
                                    <img src="media/guides/${parse.child("Image").val()}" alt="guide-placeholder" class="img-fluid img-thumbnail">
                                    ${parse.child("First Name").val()} ${parse.child("Last Name").val()}
                                </div>
                                <div class="card-body">
                                    <div class="row p-2">
                                        <table class="table rounded table-responsive-lg bg-light text-left box-shadow">
                                            <tbody>
                                                <tr>
                                                    <th class="">Age:</th>
                                                    <td>${parse.child("Age").val()}</td>
                                                </tr>
                                                <tr>
                                                    <th>Tours:</th>
                                                    <td>${parse.child("Tours").val()}</td>
                                                </tr>
                                                <tr>
                                                    <th>Occupation: </th>
                                                    <td>${parse.child("Occupation").val()}</td>
                                                </tr>
                                                <tr>
                                                    <th>Blue Badge: </th>
                                                    <td class="bg-primary text-white"><span class="bi-emoji-smile"> ${parse.child("Blue Badge").val()} </span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="card-footer text-muted">
                                    <span class="bi-clock"> Last tour ${Math.floor(Math.random() * 10) +1} days ago</span>
                                </div>
                            </div>
                        </div>`
                    );
                }
            });
       }
       else if(page === "login.html"){
            document.getElementById("login-form").addEventListener("submit", submit =>{

                submit.preventDefault();

                $("#login-modal").modal("toggle");
                let email = document.getElementById("email").value;
                let pass = document.getElementById("pass").value;
                let buttons = "";
                
                if(validEmail(email) && validPass(pass)){
                    conn.auth().signInWithEmailAndPassword(email, pass)

                    .then(loggedUser => {
                        document.getElementById("login-message").innerHTML  = `<p class="title p-1 font-weight-bold size bg-success text-white text-center" style="--fsize:2rem">You have been successfully looged in with username ${email}</p>`;  
                    })
                    
                    .catch(error => {  
                        if(error.code === "auth/user-not-found"){
                            buttons = 
                            `   <p  class="title p-1 font-weight-bold size bg-info text-white text-center" style="--fsize:2rem"> Would you like to create this account? </p>
                                <div class="modal-footer container-fluid text-center justify-content-center">
                                    <button type="button" id="create-acc" class="btn btn-info">Yes, please</button>
                                    <button type="button" class="btn btn-dark" data-dismiss="modal">No</button>
                                </div>
                            `;
                        }
                        document.getElementById("login-message").innerHTML =
                        `   <div class="container b-block">
                                <p class="title p-1 font-weight-bold size bg-danger text-white text-center" style="--fsize:2rem">${error.message}</p>${buttons}
                            </div>
                        `;
                        $("#create-acc").on("click", ()=>{
                            conn.auth().createUserWithEmailAndPassword(email, pass)
                            .then(regUser => {
                                conn.auth().signInWithEmailAndPassword(email, pass); 
                                document.getElementById("login-message").innerHTML = `<p class="title p-1 font-weight-bold size bg-success text-white text-center" style="--fsize:2rem">You have successfully registered username ${email}</p>`;               
                            })
                        });     
                    });
                }
                else{
                    document.getElementById("login-message").innerHTML = `<p class="title p-1 font-weight-bold size bg-danger text-white text-center" style="--fsize:2rem">Please submit a valid email address and password with at least 4 characters</p>`; 
                }     
            }, false);     
        }
    }
    // Reads the jsom fo;e
    $.getJSON("data/routes.json", json =>{      
        let index = parseInt(urlParams.get("route"));
        index = index >= 0 && index <= (json.routes.length) -1? index:0;
        let route = json.routes[index];              
        $.each(json.routes, (index, value) =>{
            $("#route-table").removeClass("d-none");
            $('#routes-table').append(
                `
                    <tr> 
                        <td scope="row">${parseInt(index) + 1}</td>
                        <td>${value.name}</td>
                        <td>${value.day}</td>
                        <td>${value.time}</td>
                        <td>${value.highlights}</td>
                        <td><a class="link font-weight-bold"  href="route.html?route=${index}">Details</a></td>
                    </tr>      
                `);
            $('#routes-dropdown-nav').append(`<a class="dropdown-item bi bi-link text-black-50 font-weight-light" href="route.html?route=${index}"> Route ${value.name}</a>`);  
        });

        if(page === "route.html"){
            document.getElementById("google-map").src = `https://maps.googleapis.com/maps/api/staticmap?center=${route.startLat - 0.02}%7C${route.startLng - 0.02}&zoom=14&size=500x500&sensor=false&path=color:red|weight:5|${route.startLat},${route.startLng}|${route.endLat},${route.endLng}&markers=color:blue%7C${route.startLat},${route.startLng}&markers=color:red%7C${route.endLat},${route.endLng}&key=${CONFIG.MAP.API.apiKey}`
            
            $("#google-map").on("click",()=>{
                mapLoader([route.startLat, route.startLng, route.endLat, route.endLng].map(element => parseFloat(element)));
            });

            if($.get("media/routes-gallery/" + route.image).done(()=>{
                document.getElementById("route-image").src = "media/routes-gallery/" + route.image;
            }));

            $("#fav-add-button, #add-favourite").on("click",()=>{                  
                $("#favourite-added p").remove();
                $("#favouriteModal").modal("toggle");
				if(favourites != null){
					if(Object.values(favourites).includes(index)){
						$("#favourite-added").append(`<p class="title b font-weight-bold size bg-warning text-center" style="--fsize:2rem">Route ${route.name} was previously added to your favourites !</p>`);                      
					}
					else{
						favourites.push(index);
						localStorage.setItem("favourites", JSON.stringify(favourites));
						refreshFavCounter();
						$("#favourite-added").append(`<p class="title font-weight-bold size text-white bg-success text-center" style="--fsize:2rem">Route ${route.name} was successfully added to your favourites !</p>`);
					}
				}				
            });

            $(".breadcump-name").append(route.name);
            $(".gallery-name").append(route.name);
            $("#list-name").append(route.name);
            $("#list-day").append(route.day);
            $("#list-starts").append(route.time);
            $("#list-highlights").append(route.highlights);
            $("#list-start").append(`Latitude \n ${route.startLat}\n <hr> Longitude \n ${route.startLng}`);
            $("#list-end").append(`Latitude \n ${route.endLat}\n <hr> Longitude \n ${route.endLng}`);

        }
        else if(page === "favourites.html"){
            if(favourites != null && favourites.length > 0){
                $("#route-table").removeClass("d-none");            
                for(let i in favourites){
                    $("#favourite-content").append(`
                    <tr> 
                        <td scope="row">${parseInt(i) + 1}</td>
                        <td>${json.routes[favourites[i]].name}</td>
                        <td>${json.routes[favourites[i]].day}</td>
                        <td>${json.routes[favourites[i]].time}</td>
                        <td>${json.routes[favourites[i]].highlights}</td>
                        <td><a class="link font-weight-bold cursor-pointer" onclick="removeFavourite(${favourites[i]})">Remove</a></td>
                    </tr>      
                    `);
                }
            }
            else{         
                $("#route-table").remove("table");                     
                $("#favourite").append("<h4 class='container text-danger p-2 font-italic text-center'> You do not have any favourite routes added yet!</h4>");
            }
        } 
    }).fail(error => {
        alert(`
                The json data file can not be read and the web functionality will not work! 

                Please make sure you run the website from a webserver not locally. 
              `
        );
    });
}


   
