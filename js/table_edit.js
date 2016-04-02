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
    } else if (keyterm.status == 'ambigious') {
        row_str = '<tr class="ambigious_term"><td>' + keyterm.term + '</td><th>' + keyterm.type + '</th><th>Ambigious keyterm</th><td></td><td></td></tr>'
    } else {
        row_str = '<tr class="invalid_term"><td>' + keyterm.term + '</td><td>' + keyterm.type + '</td>';
        row_str += '<th colspan="3"><p><b>Invalid or ambigious keyterm</b></p><p>To retry, rename the term and <span class="refresh-term" onclick="refreshTerm();">click here</span></p><p>To delete term, <span class="delete-term" onclick="deleteTerm();">click here</span></p></th></tr>'
    }
    
    $('#edit_table tr:last').after(row_str);
}

function openImageMenu() {
    term_id = parseInt($('tr').index(event.path[3])) - 1;
    term    = keyterms[term_id];

    $('#popup_content').html('<form></form>');

    $('#popup_content form').html('<p>You can add a custom image URL or select an image provide by Wikipedia</p><p>Custom URL: <input type="text" name="img_url"></p>');

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

    $('#popup_map').css({'display': 'inherit'});

    // put content for location into popup form
    $('#popup_map input[name="lat"]').val(term.location.lat);
    $('#popup_map input[name="lng"]').val(term.location.lng);
    initialize();
    recenter_map();

    // open popup
    popup_change_loc = new jBox('Confirm',{
        width: 500,
        height: 425,
        confirmButton: 'Confirm',
        confirm: changeLocation,
        title: 'Change Location for "' + term.term + '"',
        content: $('#popup_map'),
    });

    popup_change_loc.open();
}

function changeLocation(evt) {
    var new_lat = parseFloat($('#popup_map input[name="lat"]').val());
    var new_lng = parseFloat($('#popup_map input[name="lng"]').val());
    
    keyterms[term_id].location = {'lat': new_lat, 'lng': new_lng};
    html_str = '<p>Lat: ' + new_lat.toFixed(3) + '</p><p>Lng: ' + new_lng.toFixed(3) + '</p><center><button onclick="openLocMenu(event);" class="change_loc_btn">Change</button></center>';
    $('#edit_table tr:nth-child(' + (term_id + 2) + ') th:nth-child(5)').html(html_str);
}

function changeImage(evt) {
    if ($('#popup_content form input[name="img_url"]').val() != "") {
        keyterms[term_id].thumbnail = $('#popup_content form input[name="img_url"]').val();
    } else {
        var new_img_id = $('#popup_content form input[name="image"]:checked').val();
        keyterms[term_id].thumbnail = keyterms[term_id].images[new_img_id];
    }

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

function refreshTerm(evt) {
    term_id = parseInt($('tr').index(event.path[3])) - 1;
    console.log('refresh: ', keyterms[term_id].term);

    var new_term = $('#edit_table tr:nth-child(' + (term_id + 2) + ') td:nth-child(1)').html();
    var new_type = $('#edit_table tr:nth-child(' + (term_id + 2) + ') td:nth-child(2)').html();

    console.log('refreshing now: ', new_term, new_type);
    keyterm = keyterms[term_id];
    keyterm.term = new_term;
    keyterm.type = new_type;
    keyterm.status = null;

    getWikipediaDefinition(keyterms, term_id);
    getWikipediaImages(keyterms, term_id);
    if (keyterm.type == 'location') getWikipediaLocation(keyterms, term_id);

    var checkRefreshProgress = setInterval(function () {
        if (progress.wikipedia.imagedTerms.indexOf(term_id) > -1 && progress.wikipedia.definedTerms.indexOf(term_id) > -1 && (keyterm.type != 'location' || progress.wikipedia.locatedTerms.indexOf(term_id) > -1)) {
            
            clearInterval(checkRefreshProgress);

            row_str = '';
            if (keyterm.status == 'defined') {
                row_str = '<td>' + keyterm.term + '</td><th>' + keyterm.type + '</th><td>' + keyterm.definition + '</td><th><img class="term_img" src="' + keyterm.thumbnail + '" /><center><button onclick="openImageMenu(event);" class="change_img_btn">Change</button></center></th>';

                // if keyterm is a place / has location
                if (keyterm.location != null) {
                    row_str += '<th><p>Lat: ' + keyterm.location.lat.toFixed(3) + '</p><p>Lng: ' + keyterm.location.lng.toFixed(3) + '</p><center><button onclick="openLocMenu(event);" class="change_loc_btn">Change</button></center></th></th>';
                } else {
                    row_str += '<th>N/A</th>';
                }
            } else if (keyterm.status == 'ambigious') {
                row_str = '<td>' + keyterm.term + '</td><th>' + keyterm.type + '</th><th>Ambigious keyterm</th><td></td><td></td>'
            } else {
                row_str = '<td>' + keyterm.term + '</td><th>' + keyterm.type + '</th>';
                row_str += '<th colspan="3"><p><b>Invalid keyterm</b></p><p>To retry, rename the term and <span class="refresh-term" onclick="refreshTerm();">click here</span></p><p>To delete term, <span class="delete-term" onclick="deleteTerm();">click here</span></p></th>'
            }

            $('#edit_table tr:nth-child(' + (term_id + 2) + ')').html(row_str);
            $('#edit_table tr:nth-child(' + (term_id + 2) + ')').removeClass('invalid_term ambigious_term');
            console.log(keyterm.status);

            if (keyterm.status == 'ambigious') {
                $('#edit_table tr:nth-child(' + (term_id + 2) + ')').addClass('ambigious-term');
            } else if (keyterm.status == 'invalid') {
                $('#edit_table tr:nth-child(' + (term_id + 2) + ')').addClass('invalid-term'); 
            }
        }
    }, 500);
}

function deleteTerm(evt) {
    term_id = parseInt($('tr').index(event.path[3])) - 1;
    $('#edit_table tr:nth-child(' + (term_id + 2) + ')').remove(); // delete row from table
    keyterms.splice(term_id); // delete from data structure
}

$(function() {
    $('#output').click(function() {
        outputResults();
    }); 
});