var map    = null;
var marker = null;

// initialize google map
function initialize() {
    // standard tufts coordinates
    var init_lat = parseFloat($('#popup_map input[name="lat"]').val());
    var init_lng = parseFloat($('#popup_map input[name="lng"]').val());

    // set the map options (zoom and location)
    var mapOptions = {
        center: {lat: init_lat, lng: init_lng},
        zoom: 12,
        disableDefaultUI: true
    };

    // create the map
    if (map == null) {
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    }

    // set a marker
    if (marker == null) {
        marker = new google.maps.Marker({
            position: {lat: init_lat, lng: init_lng},
            map: map,
        }); 
    }

    marker.setPosition(new google.maps.LatLng(init_lat, init_lng));

    map.addListener('center_changed', function() {
        $('input[name="lat"]').val(map.center.lat().toFixed(3));
        $('input[name="lng"]').val(map.center.lng().toFixed(3));
        marker.setPosition(new google.maps.LatLng(map.center.lat(), map.center.lng()));
    });
}

function recenter_map() {
    var new_lat = parseFloat($('#popup_map input[name="lat"]').val());
    var new_lng = parseFloat($('#popup_map input[name="lng"]').val());
    marker.setPosition(new google.maps.LatLng(new_lat, new_lng));
    map.setCenter(new google.maps.LatLng( new_lat, new_lng));
}

$(document).ready(function() {
    // call google map on page load
    // google.maps.event.addDomListener(window, 'load', initialize);

    $('#recenter').click(function() {
        recenter_map();
    });
});


