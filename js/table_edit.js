/*
TO DO:
[ ] - Images as videos (.ogg) -> ex: Gravity
*/

function buildTable() {
    $('.table').css({'display': 'table'});

    for (var i = 0; i < keyterms.length; i++) {
        addKeytermRow(keyterms[i]);
    }

    $('#edit_table').editableTableWidget({ editor: $('<textarea>')})
    .find('td').on('change', tableChange).on('validate', tableValidate);
}

function tableChange(evt, newValue) {
    var target  = $(evt.delegateTarget);
    var col_num = ($('td, th').index(target) % 4) - 1;
    var row_num = $('tr').index(target.parent()[0]) - 1;

    keyterms[row_num][['term', 'type', 'definition', 'thumbnail', 'geotag'][col_num]] = newValue;
    console.log('changing', keyterms[row_num]);
}

function tableValidate(evt, newValue) {
    console.log('validating');
}

function addKeytermRow(keyterm) {
    var row_str = '';

    if (keyterm.status == 'defined') {
        row_str = '<tr><td>' + keyterm.term + '</td><th>' + keyterm.type + '</th><td>' + keyterm.definition + '</td><th><img class="term_img" src="' + keyterm.thumbnail + '" /><center><button onclick="openImageMenu(event);" class="change_img_btn">Change</button></center></th>';

        // if keyterm is a place / has location
        if (keyterm.location != null) {
            row_str += '<th><p>Lat: ' + keyterm.location.lat.toFixed(3) + '</p><p>Lng: ' + keyterm.location.lng.toFixed(3) + '</p><center><button onclick="openLocMenu(event);" class="change_loc_btn">Change</button></center></th></th>';
        } else {
            row_str += '<th>N/A</th></tr>';
        }
    } else {
        row_str = '<tr><td>' + keyterm.term + '</td><td>' + keyterm.type + '</td><td>Ambigious or invalid keyterm</td><td>IMAGE URL</td><td>N/A</td></tr>'
    }
    
    $('#edit_table tr:last').after(row_str);
}

function openImageMenu() {
    term_id = parseInt($('tr').index(event.path[3])) - 1;
    term    = keyterms[term_id];

    $('#popup_content').html('<form></form>');

    // put content of images into popup form
    for (var i = 0; i < term.images.length; i++) {
        html_str = '<p><input type="radio" name="image" value="' + i + '"';
        if (term.images[i] == term.thumbnail) html_str += "checked";
        html_str += '><img class="img_option" src="' + term.images[i] + '"></p>';

        $('#popup_content form').append(html_str);
    }

    // open popup
    popup_change_img = new jBox('Confirm',{
        width: 550,
        height: 400,
        confirmButton: 'Confirm',
        confirm: changeImage,
        title: 'Change Thumbnail for "' + term.term + '"',
        content: $('#popup_content'),
    });

    popup_change_img.open();
}

function openLocMenu() {
    term_id = parseInt($('tr').index(event.path[3])) - 1;
    term    = keyterms[term_id];

    $('#popup_content').html('<form></form>');

    // put content for location into popup form
    html_str =  '<p>Lat:  <input type="text" name="lat" value="' + term.location.lat +'"></p>';
    html_str += '<p>Lng:  <input type="text" name="lng" value="' + term.location.lng +'"></p>';
    $('#popup_content form').append(html_str);

    // open popup
    popup_change_loc = new jBox('Confirm',{
        width: 310,
        height: 135,
        confirmButton: 'Confirm',
        confirm: changeLocation,
        title: 'Change Location for "' + term.term + '"',
        content: $('#popup_content'),
    });

    popup_change_loc.open();
}

function changeLocation(evt) {
    var new_lat = parseFloat($('#popup_content form input[name="lat"]').val());
    var new_lng = parseFloat($('#popup_content form input[name="lng"]').val());
    
    keyterms[term_id].location = {'lat': new_lat, 'lng': new_lng};
    html_str = '<p>Lat: ' + new_lat.toFixed(3) + '</p><p>Lng: ' + new_lng.toFixed(3) + '</p><center><button onclick="openLocMenu(event);" class="change_loc_btn">Change</button></center>';
    $('#edit_table tr:nth-child(' + (term_id + 2) + ') th:nth-child(5)').html(html_str);
}

function changeImage(evt) {
    var new_img_id = $('#popup_content form input[name="image"]:checked').val();
    keyterms[term_id].thumbnail = keyterms[term_id].images[new_img_id];
    $('#edit_table tr:nth-child(' + (term_id + 2) + ') th:nth-child(4) img').attr('src', keyterms[term_id].thumbnail);

}

function outputResults() {
    var link = 'data:application/octet-stream,';
    var shift_col_char = '%2C';
    var shift_row_char = '%0A';

    csv = ['action','overwrite?','primary type','authoritative name','description','image link','latitude','longitude'].join(',') + '\n';

    // build link from terms
    for (i = 0; i < keyterms.length; i++) {
        term = keyterms[i];
        if (term.status == 'invalid') continue;

        csv += 'add,true,' + term.type + ',' + term.term + ',';
        csv += term.definition.replace(/,/g, ' -') + ',';
        csv += term.thumbnail;

        if (term.location != null) {
            csv += ',' + term.location.lat + ',' + term.location.lng;
        }

        if (i < keyterms.length - 1) csv += '\n';
    }

    // set link
    $('#download_link').attr('href',(link + encodeURIComponent(csv)));
    $('#download_link')[0].click();
}

$(function() {
    $('#output').click(function() {
        outputResults();
    }); 
});