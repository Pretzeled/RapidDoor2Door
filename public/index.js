// Save button posts form data asynchronously, Book button opens URL in new tab
let saved = false;
document.addEventListener('DOMContentLoaded', function() {
    // Phone number formatting (already present)
    const phoneInput = document.getElementById('phone-number');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = phoneInput.value.replace(/\D/g, '');
            if (value.length > 0) value = '(' + value;
            if (value.length > 4) value = value.slice(0, 4) + ') ' + value.slice(4);
            if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
            phoneInput.value = value.slice(0, 14);
        });
    }

    // Save button async post
    
    const saveBtn = document.getElementById('save-btn');
    const form = document.getElementById('home-info-form');
    if (saveBtn && form) {
        saveBtn.addEventListener('click', function(e) {
            saveBtn.disabled = true; // Disable save button after successful save
            e.preventDefault();
            const formData = new FormData(form);
            fetch('/api/save', {
                method: 'POST',
                body: formData
            })
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                saved = true;
                alert('Save successful!');
            })               
            .catch(err => {
                alert('Save failed.');
            });
        });
        form.addEventListener('change', function() {
            saved = false; // Reset saved state on form change
            saveBtn.disabled = false; // Enable save button
        });
    }
    

    const closeInfoPanel = document.getElementById('close-info-panel');
    const homeInfoPanel = document.getElementById('home-info-panel');
    closeInfoPanel.addEventListener('click', function() {
        if (saved) {
            homeInfoPanel.style.display = 'none';
        }
        else {
            // Show confirmation dialog if not saved
            if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                homeInfoPanel.style.display = 'none';
            }
        }
        saveBtn.disabled = true; // Disable save button when closing panel
    });

    function fallbackCopy(element) {
        element.select();
        element.setSelectionRange(0, 99999); // For mobile devices
        try {
            document.execCommand('copy');
        } catch (err) {
            alert('Failed to copy phone number.');
        }
    }

    const phoneNumber = document.getElementById('phone-number');
    // Book button opens URL in new tab
    const bookBtn = document.getElementById('book-btn');
    if (bookBtn) {
        bookBtn.addEventListener('click', function() {
            const formData = new FormData(form);
            const name = encodeURIComponent(`${formData.get('firstName')} ${formData.get('lastName')}`);
            const email = encodeURIComponent(formData.get('email'));
            const a2 = encodeURIComponent(formData.get('carMakeAndModel'));
            const a3 = encodeURIComponent(formData.get('address'));
            const a6 = encodeURIComponent('Booked by ezra - ' + formData.get('notes'));


            const phoneNumberText = formData.get('phoneNumber');
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(phoneNumberText).catch(() => fallbackCopy(phoneNumber));
            } else {
                fallbackCopy(phoneNumber);
            }

            window.open(`https://calendly.com/johnaugustanderson/30min?a2=${a2}&name=${name}&email=${email}&a3=${a3}&a6=${a6}`, '_blank');
        });
    }
});
// Format phone number input as (123) 456-7890
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone-number');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = phoneInput.value.replace(/\D/g, '');
            if (value.length > 0) value = '(' + value;
            if (value.length > 4) value = value.slice(0, 4) + ') ' + value.slice(4);
            if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
            phoneInput.value = value.slice(0, 14);
        });
    }
});
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
    const streetViewService = new google.maps.StreetViewService();
    const homeInfoPanel = document.getElementById("home-info-panel");
    const viewImage = document.getElementById("street-view-image");
    const homeAddresText = document.getElementById("home-address");
    const homeAddresInput = document.getElementById("address-input");
    const placeIdInput = document.getElementById("place-id-input");
    const latInput = document.getElementById("lat-input");
    const lngInput = document.getElementById("lng-input");
    const form = document.getElementById("home-info-form");
    map.addListener('click', function(event) {
        const latLng = event.latLng;

        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK") {
                if (results[0]) {

                    homeInfoPanel.style.display = 'block'; // Show the info panel
                    homeAddresText.textContent = results[0].formatted_address; // Set address text

                    // Fetch and display street view image
                    streetViewService.getPanorama({
                        location: results[0].geometry.location,
                        radius: 50,
                        source: google.maps.StreetViewSource.OUTDOORS
                    }, (data, status) => {
                        if (status === google.maps.StreetViewStatus.OK) {
                            //alert("Street View available for this location.");

                            yawAngle = Math.atan2(results[0].geometry.location.lng() - data.location.latLng.lng(), results[0].geometry.location.lat() - data.location.latLng.lat()) * (180 / Math.PI);

                            const streetViewImageUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${data.location.latLng.lat()},${data.location.latLng.lng()}&key=${window.GOOGLE_MAPS_API_KEY}&heading=${yawAngle}`;
                            viewImage.src = streetViewImageUrl; // Use the first link's image URL

                            form.reset();
                            homeAddresInput.value = results[0].formatted_address; // Set address input value
                            placeIdInput.value = results[0].place_id; // Set place ID input value
                            latInput.value = results[0].geometry.location.lat(); // Set latitude input value
                            lngInput.value = results[0].geometry.location.lng(); // Set longitude input value
                            saved = true; // Mark as saved
                        } else {
                            viewImage.src = ''; // Clear image if no street view available
                            console.warn('No street view available for this location.');
                        }
                    });

                    // get left edge x of homeInfoPanel:
                    const leftEdge = homeInfoPanel.getBoundingClientRect().left;
                    map.setCenter(results[0].geometry.location);
                    // Zoom in on clicked location
                    map.setZoom(20);
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