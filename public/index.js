// Fix 100vh issue on ios browsers
function setMapHeight() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

window.addEventListener('resize', setMapHeight);
window.addEventListener('orientationchange', setMapHeight);
setMapHeight();

function initMap() {
    const defaultCenter = { lat: 47.6062, lng: -122.3321 }; // Example: Seattle, WA
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultCenter,
    });

    new google.maps.Marker({
        position: defaultCenter,
        map: map,
        title: "Default Center"
    });

    // Add click listener to map to get placeId of clicked house/building
    const geocoder = new google.maps.Geocoder();
    map.addListener('click', function(event) {
        const latLng = event.latLng;

        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK") {
                if (results[0]) {
                    const marker = new google.maps.Marker({
                        position: results[0].geometry.location,
                        map: map,
                    });
                    alert("Address: " + results[0].formatted_address);
                } else {
                    alert("No results found");
                }
            } else {
                alert("Geocoder failed due to: " + status);
            }
        });
    }); 

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                // Center map on user
                map.setCenter(userPos);
                // Marker for user
                new google.maps.Marker({
                    position: userPos,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2
                    }
                });
                // Accuracy circle
                new google.maps.Circle({
                    strokeColor: '#4285F4',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#4285F4',
                    fillOpacity: 0.2,
                    map: map,
                    center: userPos,
                    radius: position.coords.accuracy
                });
            },
            (error) => {
                console.warn('Geolocation error:', error);
            }
        );
    } else {
        console.warn('Geolocation not supported by this browser.');
    }
}

// Load Google Maps script with Places library
const apiKey = window.GOOGLE_MAPS_API_KEY; // Google Maps API Key injected from server-side
console.log(`Google Maps API Key: ${apiKey}`);
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places`;
script.async = true;
script.defer = true;
document.head.appendChild(script);